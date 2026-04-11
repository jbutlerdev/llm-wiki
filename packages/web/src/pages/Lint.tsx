/**
 * Lint page - Wiki health checks and issue management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { runLint, getLintHistory } from '../api/wiki';

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

export function LintPage() {
  const queryClient = useQueryClient();

  const { data: report, isLoading: reportLoading, refetch: runLintCheck } = useQuery({
    queryKey: ['lint'],
    queryFn: runLint,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['lint-history'],
    queryFn: getLintHistory,
  });

  // Sort issues by severity
  const sortedIssues = [...(report?.issues || [])].sort((a, b) => {
    return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  });

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Contradictions"
          count={report?.summary.contradictions || 0}
          icon="⚠️"
          color="red"
        />
        <SummaryCard
          title="Orphan Pages"
          count={report?.summary.orphans || 0}
          icon="🔗"
          color="amber"
        />
        <SummaryCard
          title="Stale Content"
          count={report?.summary.stale || 0}
          icon="📅"
          color="yellow"
        />
        <SummaryCard
          title="Coverage Gaps"
          count={report?.summary.coverage?.length || 0}
          icon="📝"
          color="blue"
        />
      </div>

      {/* Run lint button */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Lint Check</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Run health checks to find issues in your wiki
          </p>
        </div>
        <button
          onClick={() => runLintCheck()}
          className="btn btn-primary"
          disabled={reportLoading}
        >
          {reportLoading ? 'Running...' : 'Run Lint'}
        </button>
      </div>

      {/* Issues list */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">
            Issues ({sortedIssues.length})
          </h2>
        </div>

        {sortedIssues.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-4xl mb-4 block">✨</span>
            <p className="text-gray-500 dark:text-gray-400">
              No issues found! Your wiki is healthy.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedIssues.map((issue, index) => (
              <IssueCard key={`${issue.pageId}-${index}`} issue={issue} />
            ))}
          </div>
        )}
      </div>

      {/* Coverage gaps */}
      {report?.summary.coverage && report.summary.coverage.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Coverage Suggestions</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {report.summary.coverage.map((gap, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">💡</span>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {gap.concept}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {gap.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Lint History</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.slice(0, 10).map((entry, index) => (
              <div key={index} className="px-6 py-3 flex items-center gap-4 text-sm">
                <span className="text-gray-400 dark:text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-red-500">
                    ⚠️ {entry.summary.contradictions}
                  </span>
                  <span className="text-amber-500">
                    🔗 {entry.summary.orphans}
                  </span>
                  <span className="text-yellow-500">
                    📅 {entry.summary.stale}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  count: number;
  icon: string;
  color: 'red' | 'amber' | 'yellow' | 'blue';
}

const colorClasses: Record<string, { bg: string; text: string }> = {
  red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
};

function SummaryCard({ title, count, icon, color }: SummaryCardProps) {
  const colors = colorClasses[color];
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
          <p className={`text-sm ${colors.text}`}>{title}</p>
        </div>
      </div>
    </div>
  );
}

interface IssueCardProps {
  issue: {
    type: string;
    pageId: string;
    message: string;
    severity: string;
  };
}

function IssueCard({ issue }: IssueCardProps) {
  const severityColors = {
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  };

  const typeIcons: Record<string, string> = {
    contradiction: '⚠️',
    orphan: '🔗',
    stale: '📅',
    coverage: '📝',
  };

  return (
    <div className="px-6 py-4">
      <div className="flex items-start gap-4">
        <span className="text-xl">{typeIcons[issue.type] || '📄'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[issue.severity as keyof typeof severityColors]}`}>
              {issue.severity}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {issue.type}
            </span>
          </div>
          <p className="text-gray-900 dark:text-white">{issue.message}</p>
          <Link
            to={`/page/${issue.pageId}`}
            className="mt-2 inline-block text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            View page →
          </Link>
        </div>
      </div>
    </div>
  );
}
