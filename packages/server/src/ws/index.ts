/**
 * WebSocket module exports
 */

export { WebSocketManager } from './manager.js';
export type { 
  WikiEvent, 
  WikiEventType, 
  PageEventPayload, 
  SourceEventPayload, 
  AgentEventPayload, 
  LintEventPayload,
  SubscriptionType 
} from './manager.js';
export type { WebSocketClient } from './types.js';
