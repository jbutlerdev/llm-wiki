/**
 * Agent loop
 * 
 * Implements the autonomous maintenance loop for the embedded agent.
 * Handles periodic wiki maintenance tasks like:
 * - Checking for new sources
 * - Running lint
 * - Updating stale pages
 * - Answering pending questions
 */

import type { AgentMode, ModeConfig } from '../modes/modes.js';
import { getModeConfig } from '../modes/modes.js';
import type { AgentSessionManager, AgentStatus, WikiDirProvider } from '../session/agent-session.js';
import type { Approval, ApprovalRequest } from './approval.js';

export interface AgentLoopEvents {
  'loop:cycle_start': { cycle: number };
  'loop:cycle_end': { cycle: number; duration: number };
  'loop:maintenance_start': { task: string };
  'loop:maintenance_end': { task: string; success: boolean };
  'loop:approval_needed': ApprovalRequest;
  'loop:approval_resolved': { id: string; approved: boolean };
  'loop:error': { error: Error };
  'loop:stopped': void;
}

export type AgentLoopEventType = keyof AgentLoopEvents;

export interface MaintenanceTask {
  name: string;
  execute: () => Promise<{ success: boolean; changes?: unknown[] }>;
}

export interface AgentLoopConfig {
  /** Wiki directory provider */
  wikiDirProvider: WikiDirProvider;
  /** Agent session manager */
  sessionManager: AgentSessionManager;
  /** Agent operating mode */
  mode: AgentMode;
  /** Cycle interval in ms */
  cycleIntervalMs?: number;
  /** Maintenance tasks to run each cycle */
  maintenanceTasks?: MaintenanceTask[];
  /** Callback for approval requests */
  onApprovalRequest?: (request: ApprovalRequest) => Promise<Approval | null>;
  /** Event callback */
  onEvent?: <T extends AgentLoopEventType>(
    eventType: T,
    data: AgentLoopEvents[T]
  ) => void;
}

/**
 * Agent maintenance loop
 * 
 * Runs periodic maintenance cycles when in autonomous or semi-autonomous mode.
 */
export class AgentLoop {
  private config: AgentLoopConfig;
  private modeConfig: ModeConfig;
  private cycleIntervalMs: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private cycleCount = 0;
  private isRunning = false;
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: AgentLoopConfig) {
    this.config = config;
    this.modeConfig = getModeConfig(config.mode);
    this.cycleIntervalMs = config.cycleIntervalMs ?? this.modeConfig.cycleIntervalMs;
  }

  /**
   * Start the maintenance loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    if (this.modeConfig.mode === 'interactive') {
      throw new Error('Cannot start loop in interactive mode');
    }

    this.isRunning = true;
    this.emit('loop:stopped', undefined); // Reset event

    // Run initial cycle
    await this.runCycle();

    // Schedule periodic cycles if not zero
    if (this.cycleIntervalMs > 0) {
      this.intervalId = setInterval(() => {
        this.runCycle().catch((error) => {
          this.emit('loop:error', { error });
        });
      }, this.cycleIntervalMs);
    }
  }

  /**
   * Stop the maintenance loop
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.emit('loop:stopped', undefined);
  }

  /**
   * Check if loop is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current mode
   */
  getMode(): AgentMode {
    return this.modeConfig.mode;
  }

  /**
   * Get current mode configuration
   */
  getModeConfig(): ModeConfig {
    return { ...this.modeConfig };
  }

  /**
   * Change the agent mode
   */
  async setMode(mode: AgentMode): Promise<void> {
    const oldConfig = this.modeConfig;
    const wasRunning = this.isRunning;
    this.modeConfig = getModeConfig(mode);
    this.cycleIntervalMs = this.modeConfig.cycleIntervalMs;

    // If switching to interactive, stop the loop
    if (mode === 'interactive' && wasRunning) {
      this.stop();
    }

    // If switching from interactive to autonomous/semi, start the loop
    if (oldConfig.mode === 'interactive' && mode !== 'interactive' && !wasRunning) {
      await this.start();
    }

    // Update cycle interval if loop is running
    if (this.isRunning && oldConfig.cycleIntervalMs !== this.cycleIntervalMs) {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.cycleIntervalMs > 0) {
        this.intervalId = setInterval(() => {
          this.runCycle().catch((error) => {
            this.emit('loop:error', { error });
          });
        }, this.cycleIntervalMs);
      }
    }
  }

  /**
   * Run a single maintenance cycle
   */
  async runCycle(): Promise<void> {
    const startTime = Date.now();
    this.cycleCount++;

    this.emit('loop:cycle_start', { cycle: this.cycleCount });

    try {
      // Get maintenance tasks
      const tasks = this.config.maintenanceTasks ?? this.getDefaultTasks();

      // Run each task
      for (const task of tasks) {
        this.emit('loop:maintenance_start', { task: task.name });

        try {
          const result = await task.execute();
          this.emit('loop:maintenance_end', { task: task.name, success: result.success });
        } catch (error) {
          this.emit('loop:maintenance_end', { task: task.name, success: false });
          console.error(`Maintenance task ${task.name} failed:`, error);
        }
      }

      const duration = Date.now() - startTime;
      this.emit('loop:cycle_end', { cycle: this.cycleCount, duration });
    } catch (error) {
      this.emit('loop:error', { error: error as Error });
    }
  }

  /**
   * Get default maintenance tasks
   */
  private getDefaultTasks(): MaintenanceTask[] {
    const wikiDirProvider = this.config.wikiDirProvider;
    
    return [
      {
        name: 'check_sources',
        execute: async () => {
          // Check for new sources in raw/ directory
          // This would integrate with source ingestion
          return { success: true, changes: [] };
        },
      },
      {
        name: 'run_lint',
        execute: async () => {
          // Run lint checks
          // This would integrate with lint system
          return { success: true, changes: [] };
        },
      },
      {
        name: 'update_stale',
        execute: async () => {
          // Check for stale pages
          // This would update pages based on new sources
          return { success: true, changes: [] };
        },
      },
      {
        name: 'answer_questions',
        execute: async () => {
          // Check for pending questions
          // This would answer questions and file back to wiki
          return { success: true, changes: [] };
        },
      },
    ];
  }

  /**
   * Request approval for a major change
   */
  async requestApproval(request: ApprovalRequest): Promise<Approval | null> {
    this.pendingApprovals.set(request.id, request);
    this.emit('loop:approval_needed', request);

    // If in autonomous mode, auto-approve
    if (this.modeConfig.mode === 'autonomous') {
      const approval: Approval = {
        id: request.id,
        approved: true,
        timestamp: new Date(),
        autoApproved: true,
      };
      this.pendingApprovals.delete(request.id);
      this.emit('loop:approval_resolved', { id: request.id, approved: true });
      return approval;
    }

    // In semi-autonomous mode, wait for user approval
    if (this.config.onApprovalRequest) {
      const result = await this.config.onApprovalRequest(request);
      if (result) {
        this.pendingApprovals.delete(request.id);
        this.emit('loop:approval_resolved', { id: request.id, approved: result.approved });
        return result;
      }
    }

    return null;
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }

  /**
   * Subscribe to loop events
   */
  on<T extends AgentLoopEventType>(
    eventType: T,
    callback: (data: AgentLoopEvents[T]) => void
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);

    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit an event
   */
  private emit<T extends AgentLoopEventType>(
    eventType: T,
    data: AgentLoopEvents[T]
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      }
    }

    // Also call config callback if set
    if (this.config.onEvent) {
      this.config.onEvent(eventType, data);
    }
  }

  /**
   * Get loop statistics
   */
  getStats(): {
    isRunning: boolean;
    cycleCount: number;
    mode: AgentMode;
    pendingApprovals: number;
    cycleIntervalMs: number;
  } {
    return {
      isRunning: this.isRunning,
      cycleCount: this.cycleCount,
      mode: this.modeConfig.mode,
      pendingApprovals: this.pendingApprovals.size,
      cycleIntervalMs: this.cycleIntervalMs,
    };
  }
}
