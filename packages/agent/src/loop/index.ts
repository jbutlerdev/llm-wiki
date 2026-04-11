/**
 * Agent loop module
 * 
 * Contains the autonomous maintenance loop and approval system.
 */

export { AgentLoop } from './agent-loop.js';
export type {
  AgentLoopConfig,
  AgentLoopEvents,
  AgentLoopEventType,
  MaintenanceTask,
} from './agent-loop.js';

export type { ApprovalRequest, ApprovalChange, Approval } from './approval.js';
export {
  generateApprovalId,
  createPageApproval,
  createBulkApproval,
  isApprovalExpired,
} from './approval.js';
