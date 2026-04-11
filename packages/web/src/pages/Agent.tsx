/**
 * Agent page - Embedded agent controls and status
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgentStatus, startAgent, stopAgent, setAgentMode, sendAgentCommand } from '../api/wiki';
import { getLog } from '../api/wiki';
import { AgentApprovals } from './AgentApproval';

const MODES = [
  { value: 'interactive', label: 'Interactive', description: 'Responds to explicit commands only' },
  { value: 'semi-autonomous', label: 'Semi-Autonomous', description: 'Auto-runs, pauses for approvals' },
  { value: 'autonomous', label: 'Autonomous', description: 'Continuous self-maintenance' },
];

export function AgentPage() {
  const [command, setCommand] = useState('');
  const [commandResponse, setCommandResponse] = useState('');
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['agent-status'],
    queryFn: getAgentStatus,
    refetchInterval: 5000, // Refresh every 5 seconds when agent is running
  });

  const { data: recentLog = [] } = useQuery({
    queryKey: ['log', 'agent'],
    queryFn: () => getLog(20),
  });

  const startMutation = useMutation({
    mutationFn: startAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-status'] }),
  });

  const stopMutation = useMutation({
    mutationFn: stopAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-status'] }),
  });

  const modeMutation = useMutation({
    mutationFn: setAgentMode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-status'] }),
  });

  const commandMutation = useMutation({
    mutationFn: sendAgentCommand,
    onSuccess: (response) => setCommandResponse(response),
  });

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      commandMutation.mutate(command.trim());
      setCommand('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${status?.running ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Agent {status?.running ? 'Running' : 'Stopped'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {status?.running ? (
              <button
                onClick={() => stopMutation.mutate()}
                className="btn bg-red-600 text-white hover:bg-red-700"
                disabled={stopMutation.isPending}
              >
                {stopMutation.isPending ? 'Stopping...' : 'Stop'}
              </button>
            ) : (
              <button
                onClick={() => startMutation.mutate()}
                className="btn btn-primary"
                disabled={startMutation.isPending}
              >
                {startMutation.isPending ? 'Starting...' : 'Start'}
              </button>
            )}
          </div>
        </div>

        {status?.running && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Mode:</span>
              <span className="px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-medium">
                {status.mode}
              </span>
            </div>
            {status.currentTask && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Current task:</span>
                <p className="text-gray-900 dark:text-white">{status.currentTask}</p>
              </div>
            )}
            {status.lastActivity && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last activity: {new Date(status.lastActivity).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mode selector */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Agent Mode</h2>
        <div className="space-y-3">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => modeMutation.mutate(mode.value)}
              disabled={!status?.running || modeMutation.isPending}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${status?.mode === mode.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${!status?.running ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{mode.label}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {mode.description}
                  </p>
                </div>
                {status?.mode === mode.value && (
                  <span className="px-2 py-1 rounded bg-primary-500 text-white text-xs font-medium">
                    Active
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Approvals (semi-autonomous mode) */}
      {status?.running && status.mode === 'semi-autonomous' && (
        <AgentApprovals />
      )}

      {/* Command input (interactive mode) */}
      {status?.running && status.mode === 'interactive' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Send Command
          </h2>
          <form onSubmit={handleCommand} className="space-y-4">
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter a command for the agent..."
              className="input h-24 resize-none"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!command.trim() || commandMutation.isPending}
            >
              {commandMutation.isPending ? 'Processing...' : 'Send'}
            </button>
          </form>
          {commandResponse && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Response:
              </h3>
              <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {commandResponse}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Activity log */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
          {recentLog.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No recent activity
            </div>
          ) : (
            recentLog.map((entry, index) => (
              <div key={index} className="px-6 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 dark:text-gray-500">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    {entry.type}
                  </span>
                  <span className="text-gray-900 dark:text-white">{entry.title}</span>
                </div>
                {entry.details && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                    {entry.details}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
