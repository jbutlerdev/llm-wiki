/**
 * WebSocket types for LLM Wiki
 */

export type WikiEventType = 
  | 'page:created'
  | 'page:updated'
  | 'page:deleted'
  | 'source:ingested'
  | 'source:added'
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:mode_changed'
  | 'agent:task_completed'
  | 'lint:completed'
  | 'connected'
  | 'ping'
  | 'pong';

export interface WikiEvent {
  type: WikiEventType;
  payload: unknown;
  timestamp: string;
}

export interface PageEventPayload {
  pageSlug: string;
  pageType: string;
  title: string;
}

export interface SourceEventPayload {
  sourceId: string;
  sourceType: string;
  title: string;
}

export interface AgentEventPayload {
  mode?: string;
  task?: string;
  message?: string;
}

export interface LintEventPayload {
  issuesCount: number;
  errors: number;
  warnings: number;
}

export interface WebSocketClient {
  id: string;
  connectedAt: string;
  subscribedTo: Set<string>;
}
