/**
 * Agent approval system
 * 
 * Handles approval requests for major changes in semi-autonomous mode.
 */

export interface ApprovalRequest {
  /** Unique identifier for this approval request */
  id: string;
  /** Type of change being requested */
  type: 'create_page' | 'update_page' | 'delete_page' | 'bulk_operation' | 'schema_change';
  /** Human-readable description of the change */
  description: string;
  /** Pages affected by this change */
  affectedPages: string[];
  /** Detailed changes to be made */
  changes: ApprovalChange[];
  /** When the approval was requested */
  requestedAt: Date;
  /** Timestamp for when the approval expires (optional) */
  expiresAt?: Date;
}

export interface ApprovalChange {
  /** Type of change */
  action: 'create' | 'update' | 'delete';
  /** Page slug (for updates/deletes) or target slug (for creates) */
  slug: string;
  /** Page title */
  title?: string;
  /** Summary of changes */
  summary: string;
  /** Detailed diff (optional) */
  diff?: string;
}

export interface Approval {
  /** Request ID this approval is for */
  id: string;
  /** Whether the change was approved */
  approved: boolean;
  /** When the approval was given */
  timestamp: Date;
  /** Optional reason (for rejections) */
  reason?: string;
  /** Whether this was auto-approved */
  autoApproved?: boolean;
}

/**
 * Generate a unique approval ID
 */
export function generateApprovalId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `approval_${timestamp}_${random}`;
}

/**
 * Create an approval request for a page change
 */
export function createPageApproval(
  type: ApprovalRequest['type'],
  slug: string,
  title: string,
  summary: string,
  diff?: string
): ApprovalRequest {
  return {
    id: generateApprovalId(),
    type,
    description: `${type.replace('_', ' ')}: ${title}`,
    affectedPages: [slug],
    changes: [{
      action: type === 'delete_page' ? 'delete' : type === 'create_page' ? 'create' : 'update',
      slug,
      title,
      summary,
      diff,
    }],
    requestedAt: new Date(),
  };
}

/**
 * Create an approval request for a bulk operation
 */
export function createBulkApproval(
  slug: string,
  title: string,
  changes: ApprovalChange[],
  description: string
): ApprovalRequest {
  return {
    id: generateApprovalId(),
    type: 'bulk_operation',
    description: description || title,
    affectedPages: changes.map(c => c.slug),
    changes,
    requestedAt: new Date(),
  };
}

/**
 * Check if an approval request has expired
 */
export function isApprovalExpired(request: ApprovalRequest): boolean {
  if (!request.expiresAt) {
    return false;
  }
  return new Date() > request.expiresAt;
}
