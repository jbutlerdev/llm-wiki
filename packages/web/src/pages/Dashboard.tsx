/**
 * Dashboard page - Main wiki overview
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getWikiStatus, getLog, runLint } from '../api/wiki';

export function Dashboard() {
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['status'],
    queryFn: getWikiStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: log = [], isLoading: logLoading } = useQuery({
    queryKey: ['log'],
    queryFn: () => getLog(10),
  });

  const { data: lintReport } = useQuery({
    queryKey: ['lint'],
    queryFn: runLint,
    enabled: false, // Only run on demand
  });

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Wiki Pages"
          value={statusLoading ? '...' : String(status?.pageCount ?? 0)}
          icon="📄"
          color="blue"
        />
        <StatCard
          label="Sources"
          value={statusLoading ? '...' : String(status?.sourceCount ?? 0)}
          icon="📚"
          color="green"
        />
        <StatCard
          label="Contradictions"
          value={statusLoading ? '...' : String(status?.lintSummary?.contradictions ?? 0)}
          icon="⚠️"
          color="red"
        />
        <StatCard
          label="Orphan Pages"
          value={statusLoading ? '...' : String(status?.lintSummary?.orphans ?? 0)}
          icon="🔗"
          color="amber"
        />
      </div>

      {/* Quick actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/sources" className="btn btn-primary">
            📥 Ingest Source
          </Link>
          <Link to="/search" className="btn btn-secondary">
            🔍 Search Wiki
          </Link>
          <Link to="/lint" className="btn btn-secondary">
            🔧 Run Lint
          </Link>
          <Link to="/agent" className="btn btn-secondary">
            🤖 Agent Controls
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {logLoading ? (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : log.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              No recent activity. Ingest a source to get started!
            </div>
          ) : (
            log.map((entry, index) => (
              <div key={index} className="px-6 py-4 flex items-start gap-4">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {entry.title}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {entry.type}
                    </span>
                  </div>
                  {entry.details && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                      {entry.details}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'red' | 'amber';
}

const colorClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
};

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colors = colorClasses[color];
  return (
    <div className="card p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
