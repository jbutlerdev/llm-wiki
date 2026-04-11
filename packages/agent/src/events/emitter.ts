/**
 * Agent event emitter
 * 
 * Manages event emission for agent activities, supporting:
 * - SSE (Server-Sent Events) streaming
 * - WebSocket broadcasting
 * - In-memory event listeners
 */

export type AgentEventType =
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:mode_changed'
  | 'agent:task_start'
  | 'agent:task_end'
  | 'agent:task_error'
  | 'agent:tool_call'
  | 'agent:tool_result'
  | 'agent:message'
  | 'agent:prompt'
  | 'agent:error'
  | 'agent:cycle_start'
  | 'agent:cycle_end'
  | 'agent:approval_needed'
  | 'agent:approval_resolved'
  | 'wiki:changed'
  | 'wiki:page_created'
  | 'wiki:page_updated'
  | 'wiki:page_deleted'
  | 'wiki:source_ingested';

export interface AgentEvent {
  type: AgentEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  subscribedEvents: Set<AgentEventType>;
}

const encoder = new TextEncoder();

/**
 * Agent event emitter
 * 
 * Central event bus for agent activities.
 */
export class AgentEventEmitter {
  private clients: Map<string, SSEClient> = new Map();
  private listeners: Map<AgentEventType, Set<(event: AgentEvent) => void>> = new Map();
  private anyListeners: Set<(event: AgentEvent) => void> = new Set();
  private clientIdCounter = 0;

  /**
   * Subscribe a new SSE client
   */
  subscribe(controller: ReadableStreamDefaultController<Uint8Array>): string {
    const id = `sse_${++this.clientIdCounter}`;
    this.clients.set(id, {
      id,
      controller,
      subscribedEvents: new Set(['agent:started', 'agent:stopped', 'agent:mode_changed', 'agent:task_start', 'agent:task_end', 'agent:error', 'agent:cycle_start', 'agent:cycle_end', 'agent:approval_needed', 'agent:approval_resolved'] as AgentEventType[]),
    });
    return id;
  }

  /**
   * Unsubscribe an SSE client
   */
  unsubscribe(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Subscribe to specific event types
   */
  subscribeToEvents(clientId: string, events: AgentEventType[]): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }
    for (const event of events) {
      client.subscribedEvents.add(event);
    }
    return true;
  }

  /**
   * Unsubscribe from specific event types
   */
  unsubscribeFromEvents(clientId: string, events: AgentEventType[]): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }
    for (const event of events) {
      client.subscribedEvents.delete(event);
    }
    return true;
  }

  /**
   * Emit an event to all subscribed clients and listeners
   */
  emit(type: AgentEventType, data?: Record<string, unknown>): void {
    const event: AgentEvent = {
      type,
      timestamp: new Date(),
      data,
    };

    // Send to SSE clients
    const message = `data: ${JSON.stringify(event)}\n\n`;
    const encoded = encoder.encode(message);

    for (const [clientId, client] of this.clients) {
      if (client.subscribedEvents.has(type)) {
        try {
          client.controller.enqueue(encoded);
        } catch {
          // Client disconnected, remove it
          this.clients.delete(clientId);
        }
      }
    }

    // Notify in-memory listeners
    const listeners = this.listeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      }
    }

    // Notify anyListeners
    for (const listener of this.anyListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in any listener:`, error);
      }
    }
  }

  /**
   * Add an in-memory event listener
   */
  on(type: AgentEventType, listener: (event: AgentEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * Add a listener for all events
   */
  onAny(listener: (event: AgentEvent) => void): () => void {
    this.anyListeners.add(listener);
    return () => {
      this.anyListeners.delete(listener);
    };
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if there are any connected clients
   */
  hasClients(): boolean {
    return this.clients.size > 0;
  }
}

// Global event emitter instance
let globalEmitter: AgentEventEmitter | null = null;

/**
 * Get the global event emitter
 */
export function getAgentEventEmitter(): AgentEventEmitter {
  if (!globalEmitter) {
    globalEmitter = new AgentEventEmitter();
  }
  return globalEmitter;
}

/**
 * Set a custom event emitter
 */
export function setAgentEventEmitter(emitter: AgentEventEmitter): void {
  globalEmitter = emitter;
}
