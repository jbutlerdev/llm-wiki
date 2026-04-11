/**
 * WebSocket connection manager for LLM Wiki
 * 
 * Handles WebSocket connections, broadcasts events, and manages client state.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import type { 
  WebSocketClient, 
  WikiEvent, 
  WikiEventType,
  PageEventPayload,
  SourceEventPayload,
  AgentEventPayload,
  LintEventPayload
} from './types.js';

// Event types that can be subscribed to
export type SubscriptionType = 'pages' | 'sources' | 'agent' | 'lint' | 'all';

interface ClientInfo {
  ws: WebSocket;
  subscribedTo: Set<SubscriptionType>;
  connectedAt: Date;
}

/**
 * WebSocket manager for handling wiki events
 */
export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientInfo> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize the WebSocket server
   */
  initialize(port: number, host: string = '0.0.0.0'): void {
    if (this.wss) {
      console.log('WebSocket server already initialized');
      return;
    }

    this.wss = new WebSocketServer({ port, host });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
    });

    // Start ping interval to keep connections alive
    this.pingInterval = setInterval(() => {
      this.broadcastToAll({ type: 'ping', payload: null, timestamp: new Date().toISOString() });
    }, 30000);

    console.log(`WebSocket server started on ws://${host}:${port}`);
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    const clientId = randomUUID();
    const clientInfo: ClientInfo = {
      ws,
      subscribedTo: new Set(['all']), // Subscribe to all events by default
      connectedAt: new Date(),
    };

    this.clients.set(clientId, clientInfo);
    console.log(`WebSocket client connected: ${clientId}`);

    // Send connection confirmation
    this.sendToClient(clientId, {
      type: 'connected',
      payload: { clientId },
      timestamp: new Date().toISOString(),
    });

    ws.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error: Error) => {
      console.error(`WebSocket client error (${clientId}):`, error);
      this.clients.delete(clientId);
    });

    ws.on('pong', () => {
      // Connection is alive
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(clientId: string, data: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = JSON.parse(data.toString()) as { action?: string; subscription?: SubscriptionType };

      switch (message.action) {
        case 'subscribe':
          if (message.subscription) {
            client.subscribedTo.add(message.subscription);
            this.sendToClient(clientId, {
              type: 'connected',
              payload: { 
                clientId, 
                subscribed: Array.from(client.subscribedTo),
                message: `Subscribed to ${message.subscription}`
              },
              timestamp: new Date().toISOString(),
            });
          }
          break;

        case 'unsubscribe':
          if (message.subscription) {
            client.subscribedTo.delete(message.subscription);
          }
          break;

        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            payload: null,
            timestamp: new Date().toISOString(),
          });
          break;

        default:
          console.log(`Unknown message action from ${clientId}:`, message);
      }
    } catch (error) {
      console.error(`Error parsing message from ${clientId}:`, error);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, event: WikiEvent): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(event));
    } catch (error) {
      console.error(`Error sending to client ${clientId}:`, error);
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: WikiEvent): void {
    this.broadcastToAll(event);
  }

  /**
   * Broadcast event to all clients
   */
  private broadcastToAll(event: WikiEvent): void {
    const message = JSON.stringify(event);

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (error) {
          console.error(`Error broadcasting to client ${clientId}:`, error);
        }
      }
    }
  }

  /**
   * Broadcast page event
   */
  broadcastPageEvent(type: 'page:created' | 'page:updated' | 'page:deleted', payload: PageEventPayload): void {
    this.broadcast({
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast source event
   */
  broadcastSourceEvent(type: 'source:ingested', payload: SourceEventPayload): void {
    this.broadcast({
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast agent event
   */
  broadcastAgentEvent(
    type: 'agent:started' | 'agent:stopped' | 'agent:mode_changed' | 'agent:task_completed',
    payload: AgentEventPayload
  ): void {
    this.broadcast({
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast lint event
   */
  broadcastLintEvent(type: 'lint:completed', payload: LintEventPayload): void {
    this.broadcast({
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get list of connected clients
   */
  getClients(): Array<{
    id: string;
    connectedAt: string;
    subscribedTo: SubscriptionType[];
  }> {
    return Array.from(this.clients.entries()).map(([id, client]) => ({
      id,
      connectedAt: client.connectedAt.toISOString(),
      subscribedTo: Array.from(client.subscribedTo),
    }));
  }

  /**
   * Close all connections and stop server
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    for (const [clientId, client] of this.clients) {
      client.ws.close();
      this.clients.delete(clientId);
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('WebSocket server shut down');
  }
}

// Export types from types.ts
export type { 
  WikiEvent, 
  WikiEventType, 
  PageEventPayload, 
  SourceEventPayload, 
  AgentEventPayload, 
  LintEventPayload 
} from './types.js';
