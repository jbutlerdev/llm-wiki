/**
 * Agent API routes
 * 
 * Full implementation for Phase 7b
 */

import { Hono } from 'hono';
import { getWikiDir } from '../index.js';
import { getWebSocketManager } from '../index.js';
import type { AgentMode, ApprovalRequest } from '@llm-wiki/agent';
import type { WebSocketManager } from '../ws/manager.js';

function createSuccessResponse<T>(data: T) {
  return { success: true, data };
}

function createErrorResponse(error: string, message: string, statusCode: number) {
  return {
    success: false,
    error: { error, message, statusCode },
  };
}

// In-memory agent state (singleton per server)
let agentManager: any = null;
let agentRunning = false;
let agentMode: AgentMode = 'interactive';

/**
 * Initialize agent manager
 */
async function getAgentManager() {
  if (agentManager) {
    return agentManager;
  }

  // Dynamic import to avoid circular deps
  const { AgentSessionManager } = await import('@llm-wiki/agent');
  
  agentManager = new AgentSessionManager({
    wikiDir: getWikiDir(),
    mode: agentMode,
  });

  return agentManager;
}

/**
 * Broadcast agent event to WebSocket clients
 */
function broadcastAgentEvent(type: string, data: Record<string, unknown>) {
  const wsManager: WebSocketManager | undefined = getWebSocketManager();
  if (wsManager) {
    wsManager.broadcastAgentEvent(type as any, data);
  }
}

export function registerAgentRoutes(app: Hono) {
  // GET /api/agent/status - Get agent status
  app.get('/api/agent/status', async (c) => {
    try {
      const manager = await getAgentManager();
      const status = manager.getStatus();
      
      return c.json(
        createSuccessResponse({
          running: status.isRunning,
          mode: status.mode,
          sessionId: status.sessionId,
          wikiDir: status.wikiDir,
          thinkingLevel: status.thinkingLevel,
          modelId: status.modelId,
          messageCount: status.messageCount,
          loopStats: status.loopStats,
        })
      );
    } catch (error) {
      console.error('Error getting agent status:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to get agent status', 500),
        500
      );
    }
  });

  // POST /api/agent/start - Start agent
  app.post('/api/agent/start', async (c) => {
    try {
      if (agentRunning) {
        return c.json(
          createErrorResponse('Conflict', 'Agent is already running', 409),
          409
        );
      }

      const manager = await getAgentManager();
      await manager.createSession();
      
      agentRunning = true;
      broadcastAgentEvent('agent:started', { wikiDir: getWikiDir(), mode: agentMode });

      return c.json(
        createSuccessResponse({
          running: true,
          message: 'Agent started',
        }),
        202
      );
    } catch (error) {
      console.error('Error starting agent:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to start agent', 500),
        500
      );
    }
  });

  // POST /api/agent/stop - Stop agent
  app.post('/api/agent/stop', async (c) => {
    try {
      if (!agentRunning) {
        return c.json(
          createErrorResponse('Conflict', 'Agent is not running', 409),
          409
        );
      }

      const manager = await getAgentManager();
      await manager.dispose();
      
      agentRunning = false;
      agentManager = null;
      broadcastAgentEvent('agent:stopped', {});

      return c.json(
        createSuccessResponse({
          running: false,
          message: 'Agent stopped',
        })
      );
    } catch (error) {
      console.error('Error stopping agent:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to stop agent', 500),
        500
      );
    }
  });

  // PUT /api/agent/mode - Set agent mode
  app.put('/api/agent/mode', async (c) => {
    try {
      const body = await c.req.json();
      const newMode = body.mode as AgentMode;

      const validModes: AgentMode[] = ['interactive', 'semi-autonomous', 'autonomous'];
      if (!validModes.includes(newMode)) {
        return c.json(
          createErrorResponse(
            'Bad Request',
            `Invalid mode. Must be one of: ${validModes.join(', ')}`,
            400
          ),
          400
        );
      }

      const manager = await getAgentManager();
      await manager.setMode(newMode);
      
      agentMode = newMode;
      broadcastAgentEvent('agent:mode_changed', { mode: newMode });

      return c.json(
        createSuccessResponse({
          mode: agentMode,
          message: `Agent mode set to ${agentMode}`,
        })
      );
    } catch (error) {
      console.error('Error setting agent mode:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to set agent mode', 500),
        500
      );
    }
  });

  // POST /api/agent/command - Send command to agent
  app.post('/api/agent/command', async (c) => {
    try {
      if (!agentRunning) {
        return c.json(
          createErrorResponse('Conflict', 'Agent is not running', 409),
          409
        );
      }

      const body = await c.req.json();
      const command = body.command as string;

      if (!command) {
        return c.json(
          createErrorResponse('Bad Request', 'command is required', 400),
          400
        );
      }

      const manager = await getAgentManager();
      broadcastAgentEvent('agent:task_start', { task: command });
      
      await manager.sendCommand(command);

      return c.json(
        createSuccessResponse({
          message: `Command queued: ${command}`,
        })
      );
    } catch (error) {
      console.error('Error processing agent command:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to process command', 500),
        500
      );
    }
  });

  // GET /api/agent/session - Get agent session info
  app.get('/api/agent/session', async (c) => {
    try {
      if (!agentRunning) {
        return c.json(
          createSuccessResponse({
            sessionId: null,
            messageCount: 0,
            createdAt: null,
            running: false,
          })
        );
      }

      const manager = await getAgentManager();
      const status = manager.getStatus();

      return c.json(
        createSuccessResponse({
          sessionId: status.sessionId,
          messageCount: status.messageCount,
          createdAt: status.sessionId ? new Date().toISOString() : null,
          running: status.isRunning,
        })
      );
    } catch (error) {
      console.error('Error getting session:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to get session', 500),
        500
      );
    }
  });

  // GET /api/agent/events - SSE stream for agent events
  app.get('/api/agent/events', async (c) => {
    // Get event emitter from agent
    const manager = await getAgentManager();
    const eventEmitter = manager.getEventEmitter();

    // Create a readable stream for SSE
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const clientId = eventEmitter.subscribe(controller);
        
        // Send initial connection event
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: 'connected',
            timestamp: new Date().toISOString(),
            clientId,
          })}\n\n`
        ));

        // Send current status
        const status = manager.getStatus();
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: 'status_changed',
            timestamp: new Date().toISOString(),
            data: {
              running: status.isRunning,
              mode: status.mode,
            },
          })}\n\n`
        ));

        // Set up heartbeat
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch {
            clearInterval(heartbeat);
            eventEmitter.unsubscribe(clientId);
          }
        }, 30000);

        // Clean up on close
        c.req.raw.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          eventEmitter.unsubscribe(clientId);
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  });

  // GET /api/agent/approvals - Get pending approvals
  app.get('/api/agent/approvals', async (c) => {
    try {
      if (!agentRunning) {
        return c.json(
          createSuccessResponse({
            approvals: [],
          })
        );
      }

      const manager = await getAgentManager();
      const approvals = manager.getPendingApprovals();

      return c.json(
        createSuccessResponse({
          approvals,
        })
      );
    } catch (error) {
      console.error('Error getting approvals:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to get approvals', 500),
        500
      );
    }
  });

  // POST /api/agent/approvals/:id - Respond to approval
  app.post('/api/agent/approvals/:id', async (c) => {
    try {
      const id = c.req.param('id');

      if (!agentRunning) {
        return c.json(
          createErrorResponse('Conflict', 'Agent is not running', 409),
          409
        );
      }

      const body = await c.req.json();
      const approved = body.approved === true;
      const reason = body.reason as string | undefined;

      const manager = await getAgentManager();
      const success = await manager.approveRequest(id, approved, reason);

      if (!success) {
        return c.json(
          createErrorResponse('Not Found', `Approval request ${id} not found`, 404),
          404
        );
      }

      broadcastAgentEvent('agent:approval_resolved', { id, approved, reason });

      return c.json(
        createSuccessResponse({
          id,
          approved,
          message: approved ? 'Change approved' : 'Change rejected',
        })
      );
    } catch (error) {
      console.error('Error processing approval:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to process approval', 500),
        500
      );
    }
  });
}
