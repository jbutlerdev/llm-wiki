/**
 * Agent session manager
 * 
 * Manages the pi agent session lifecycle, including creation,
 * event subscription, and disposal.
 */

import type { AgentMode, ModeConfig } from '../modes/modes.js';
import { getModeConfig } from '../modes/modes.js';
import type { AgentLoop } from '../loop/agent-loop.js';
import type { ApprovalRequest, Approval } from '../loop/approval.js';
import { AgentEventEmitter, getAgentEventEmitter } from '../events/emitter.js';

export interface AgentConfig {
  /** Working directory (defaults to wiki directory) */
  cwd?: string;
  /** Wiki directory */
  wikiDir: string;
  /** API key for LLM provider */
  apiKey?: string;
  /** Provider name (e.g., 'anthropic', 'openai') */
  provider?: string;
  /** Model to use (e.g., 'claude-opus-4-5') */
  model?: string;
  /** Thinking level */
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  /** Agent operating mode */
  mode?: AgentMode;
  /** Cycle interval in ms (for autonomous/semi-autonomous) */
  cycleIntervalMs?: number;
}

export interface WikiDirProvider {
  getWikiDir(): string;
  setWikiDir(path: string): void;
}

export interface AgentStatus {
  isRunning: boolean;
  sessionId?: string;
  wikiDir: string;
  mode: AgentMode;
  thinkingLevel: string;
  modelId?: string;
  messageCount: number;
  loopStats?: {
    isRunning: boolean;
    cycleCount: number;
    pendingApprovals: number;
  };
}

export type AgentEventType =
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:error'
  | 'agent:prompt'
  | 'agent:message'
  | 'agent:tool_call'
  | 'agent:tool_result'
  | 'wiki:changed'
  | 'agent:mode_changed'
  | 'agent:task_start'
  | 'agent:task_end'
  | 'agent:approval_needed'
  | 'agent:approval_resolved';

export interface AgentEvent {
  type: AgentEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type AgentEventListener = (event: AgentEvent) => void | Promise<void>;

/**
 * Agent session manager
 * 
 * Manages the pi agent session lifecycle.
 * Uses dynamic imports to avoid bundling issues.
 */
export class AgentSessionManager implements WikiDirProvider {
  private config: AgentConfig;
  private wikiDir: string;
  private eventListeners: Map<symbol, AgentEventListener> = new Map();
  private session: any = null;
  private authStorage: any = null;
  private modelRegistry: any = null;
  private mode: AgentMode;
  private modeConfig: ModeConfig;
  private eventEmitter: AgentEventEmitter;
  private agentLoop: AgentLoop | null = null;
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private commandQueue: string[] = [];
  private isProcessingCommands = false;

  constructor(config: AgentConfig) {
    this.config = config;
    this.wikiDir = config.wikiDir;
    this.mode = config.mode ?? 'interactive';
    this.modeConfig = getModeConfig(this.mode);
    this.eventEmitter = getAgentEventEmitter();
  }

  /**
   * Get the wiki directory
   */
  getWikiDir(): string {
    return this.wikiDir;
  }

  /**
   * Set the wiki directory
   */
  setWikiDir(path: string): void {
    this.wikiDir = path;
    this.emit({ type: 'wiki:changed', timestamp: new Date(), data: { wikiDir: path } });
  }

  /**
   * Get the current session
   */
  getSession(): any {
    return this.session;
  }

  /**
   * Get the session ID
   */
  getSessionId(): string | undefined {
    return this.session?.sessionId;
  }

  /**
   * Check if session is running
   */
  isRunning(): boolean {
    return this.session !== null;
  }

  /**
   * Get current agent mode
   */
  getMode(): AgentMode {
    return this.mode;
  }

  /**
   * Get mode configuration
   */
  getModeConfig(): ModeConfig {
    return { ...this.modeConfig };
  }

  /**
   * Set agent mode
   */
  async setMode(mode: AgentMode): Promise<void> {
    if (this.mode === mode) {
      return;
    }

    const oldMode = this.mode;
    this.mode = mode;
    this.modeConfig = getModeConfig(mode);

    // Handle loop state transitions
    if (mode === 'interactive') {
      // Stop the loop when switching to interactive
      if (this.agentLoop) {
        this.agentLoop.stop();
      }
    } else {
      // Start the loop when switching from interactive
      if (oldMode === 'interactive' && this.session) {
        await this.startLoop();
      } else if (this.agentLoop) {
        await this.agentLoop.setMode(mode);
      }
    }

    this.emit({ type: 'agent:mode_changed', timestamp: new Date(), data: { from: oldMode, to: mode } });
    this.eventEmitter.emit('agent:mode_changed', { from: oldMode, to: mode });
  }

  /**
   * Create a new agent session
   */
  async createSession(): Promise<any> {
    if (this.session) {
      throw new Error('Session already exists. Call dispose() first.');
    }

    // Dynamic import to avoid bundling issues
    const { AuthStorage, ModelRegistry, SessionManager, createAgentSession } = 
      await import('@mariozechner/pi-coding-agent');

    // Create auth storage
    this.authStorage = AuthStorage.create();

    // Set API key if provided
    if (this.config.apiKey && this.config.provider) {
      this.authStorage.setRuntimeApiKey(this.config.provider, this.config.apiKey);
    }

    // Create model registry
    this.modelRegistry = ModelRegistry.create(this.authStorage);

    // Create session manager
    const sessionManager = SessionManager.inMemory();

    // Create the session
    const cwd = this.config.cwd ?? this.config.wikiDir;
    
    const result = await createAgentSession({
      cwd,
      sessionManager,
      authStorage: this.authStorage,
      modelRegistry: this.modelRegistry,
    });

    this.session = result.session;

    // Start loop if not in interactive mode
    if (this.mode !== 'interactive') {
      await this.startLoop();
    }

    this.emit({ type: 'agent:started', timestamp: new Date() });
    this.eventEmitter.emit('agent:started', { mode: this.mode });

    return this.session;
  }

  /**
   * Start the maintenance loop
   */
  private async startLoop(): Promise<void> {
    if (this.agentLoop) {
      return;
    }

    const { AgentLoop } = await import('../loop/agent-loop.js');
    
    this.agentLoop = new AgentLoop({
      wikiDirProvider: this,
      sessionManager: this,
      mode: this.mode,
      cycleIntervalMs: this.config.cycleIntervalMs,
      onApprovalRequest: async (request) => this.handleApprovalRequest(request),
      onEvent: (type, data) => {
        this.eventEmitter.emit(type as any, data as Record<string, unknown>);
      },
    });

    await this.agentLoop.start();
  }

  /**
   * Handle an approval request from the loop
   */
  private async handleApprovalRequest(request: ApprovalRequest): Promise<Approval | null> {
    this.pendingApprovals.set(request.id, request);
    this.eventEmitter.emit('agent:approval_needed', { 
      ...request,
      requestedAt: request.requestedAt.toISOString() 
    });

    // In autonomous mode, auto-approve
    if (this.mode === 'autonomous') {
      const approval: Approval = {
        id: request.id,
        approved: true,
        timestamp: new Date(),
        autoApproved: true,
      };
      this.pendingApprovals.delete(request.id);
      this.eventEmitter.emit('agent:approval_resolved', { id: request.id, approved: true });
      return approval;
    }

    // In semi-autonomous mode, return null (waiting for external approval)
    return null;
  }

  /**
   * Approve a pending request
   */
  async approveRequest(requestId: string, approved: boolean, reason?: string): Promise<boolean> {
    const request = this.pendingApprovals.get(requestId);
    if (!request) {
      return false;
    }

    const approval: Approval = {
      id: requestId,
      approved,
      timestamp: new Date(),
      reason,
    };

    this.pendingApprovals.delete(requestId);
    this.eventEmitter.emit('agent:approval_resolved', { id: requestId, approved });
    return true;
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): ApprovalRequest[] {
    const loopApprovals = this.agentLoop?.getPendingApprovals() ?? [];
    return [...loopApprovals, ...Array.from(this.pendingApprovals.values())];
  }

  /**
   * Send a prompt to the agent
   */
  async prompt(text: string): Promise<void> {
    if (!this.session) {
      throw new Error('No active session. Call createSession() first.');
    }

    this.emit({ type: 'agent:prompt', timestamp: new Date(), data: { text } });
    this.eventEmitter.emit('agent:prompt', { text });
    
    await this.session.prompt(text);
  }

  /**
   * Send a command (for interactive mode)
   */
  async sendCommand(command: string): Promise<void> {
    this.commandQueue.push(command);
    this.processCommandQueue();
  }

  /**
   * Process command queue
   */
  private async processCommandQueue(): Promise<void> {
    if (this.isProcessingCommands || this.commandQueue.length === 0) {
      return;
    }

    this.isProcessingCommands = true;

    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift()!;
      try {
        this.eventEmitter.emit('agent:task_start', { task: command });
        await this.prompt(command);
        this.eventEmitter.emit('agent:task_end', { task: command });
      } catch (error) {
        this.eventEmitter.emit('agent:task_end', { task: command, error: String(error) });
      }
    }

    this.isProcessingCommands = false;
  }

  /**
   * Subscribe to internal agent events
   */
  on(listener: AgentEventListener): () => void {
    const id = Symbol();
    this.eventListeners.set(id, listener);
    return () => this.eventListeners.delete(id);
  }

  /**
   * Emit an internal agent event
   */
  private emit(event: AgentEvent): void {
    for (const listener of this.eventListeners.values()) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }
  }

  /**
   * Get event emitter for SSE/WebSocket integration
   */
  getEventEmitter(): AgentEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Get agent status
   */
  getStatus(): AgentStatus {
    return {
      isRunning: this.session !== null,
      sessionId: this.session?.sessionId,
      wikiDir: this.config.wikiDir,
      mode: this.mode,
      thinkingLevel: this.session?.thinkingLevel ?? this.config.thinkingLevel ?? 'medium',
      modelId: this.session?.model?.id,
      messageCount: this.session?.messages?.length ?? 0,
      loopStats: this.agentLoop?.getStats(),
    };
  }

  /**
   * Dispose of the session
   */
  async dispose(): Promise<void> {
    // Stop the loop first
    if (this.agentLoop) {
      this.agentLoop.stop();
      this.agentLoop = null;
    }

    // Dispose the session
    if (this.session) {
      this.session.dispose();
      this.session = null;
      this.emit({ type: 'agent:stopped', timestamp: new Date() });
      this.eventEmitter.emit('agent:stopped', {});
    }
  }
}
