/**
 * Agent Approval UI - Component for handling agent approval requests
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgentStatus, getApprovals, respondToApproval } from '../api/wiki';

export function AgentApprovals() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: status } = useQuery({
    queryKey: ['agent-status'],
    queryFn: getAgentStatus,
  });

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['agent-approvals'],
    queryFn: getApprovals,
    enabled: status?.mode === 'semi-autonomous',
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      respondToApproval(id, approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['agent-status'] });
    },
  });

  if (status?.mode !== 'semi-autonomous') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="card p-4 text-center text-gray-500 dark:text-gray-400">
        Loading approval requests...
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Pending Approvals
        </h2>
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <span className="text-3xl mb-3 block">✅</span>
          <p>No pending approval requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              Pending Approvals ({approvals.length})
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Review and approve or reject agent changes
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
        {approvals.map((approval) => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            expanded={expandedId === approval.id}
            onToggle={() => setExpandedId(expandedId === approval.id ? null : approval.id)}
            onApprove={() => respondMutation.mutate({ id: approval.id, approved: true })}
            onReject={() => respondMutation.mutate({ id: approval.id, approved: false })}
            isResponding={respondMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

interface ApprovalChange {
  type: 'create' | 'update' | 'delete';
  pageId?: string;
  title?: string;
  description: string;
}

interface ApprovalRequest {
  id: string;
  requestedAt: string;
  changes: ApprovalChange[];
  reason?: string;
}

interface ApprovalCardProps {
  approval: ApprovalRequest;
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  isResponding: boolean;
}

function ApprovalCard({
  approval,
  expanded,
  onToggle,
  onApprove,
  onReject,
  isResponding,
}: ApprovalCardProps) {
  const changeTypeColors = {
    create: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    update: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    delete: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  const changeTypeIcons = {
    create: '➕',
    update: '✏️',
    delete: '🗑️',
  };

  return (
    <div className="px-6 py-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <button
            onClick={onToggle}
            className="text-left w-full flex items-center gap-2"
          >
            <span className="text-gray-400 dark:text-gray-500">
              {expanded ? '▼' : '▶'}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {approval.changes.length} change{approval.changes.length !== 1 ? 's' : ''} requested
            </span>
          </button>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Requested {new Date(approval.requestedAt).toLocaleString()}
          </p>
          {approval.reason && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
              {approval.reason}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onReject}
            disabled={isResponding}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            disabled={isResponding}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isResponding ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pl-6 space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Changes in this request:
          </h4>
          <ul className="space-y-2">
            {approval.changes.map((change, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${changeTypeColors[change.type]}`}
                >
                  {changeTypeIcons[change.type]} {change.type}
                </span>
                <div className="flex-1">
                  {change.title && (
                    <span className="font-medium text-gray-900 dark:text-white">
                      {change.title}
                    </span>
                  )}
                  <p className="text-gray-600 dark:text-gray-400">{change.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
