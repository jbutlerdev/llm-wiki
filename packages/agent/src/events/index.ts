/**
 * Agent events module
 */

export {
  AgentEventEmitter,
  getAgentEventEmitter,
  setAgentEventEmitter,
} from './emitter.js';

export type {
  AgentEventType,
  AgentEvent,
  SSEClient,
} from './emitter.js';
