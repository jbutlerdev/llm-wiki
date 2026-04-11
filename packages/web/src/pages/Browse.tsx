/**
 * Browse page - List and filter wiki pages
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPages } from '../api/wiki';

const PAGE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'summary', label: 'Summaries' },
  { value: 'entity', label: 'Entities' },
  { value: 'source', label: 'Sources' },
  { value: 'comparison', label: 'Comparisons' },
  { value: 'synthesis', label: 'Syntheses' },
];

const SORT_OPTIONS = [
  { value: 'lastModified', label: 'Last Modified' },
  { value: 'title', label: 'Title' },
  { value: 'createdAt', label: 'Created' },
];

export function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const type = searchParams.get('type') || '';
  const sort = searchParams.get('sort') || 'lastModified';

  const { data: allPages = [], isLoading } = useQuery({
    queryKey: ['pages', type],
    queryFn: () => getPages(type ? { type } : undefined),
  });

  // Sort pages
  const sortedPages = [...allPages].sort((a, b) => {
    switch (sort) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'createdAt':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    }
  });

  // Paginate
  const totalPages = Math.ceil(sortedPages.length / pageSize);
  const paginatedPages = sortedPages.slice((page - 1) * pageSize, page * pageSize);

  const updateFilter = (key: string, value: string) => {
    setPage(1);
    if (value) {
      setSearchParams({ [key]: value });
    } else {
      searchParams.delete(key);
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
            <select
              value={type}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="input py-1.5 text-sm w-auto"
            >
              {PAGE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</label>
            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="input py-1.5 text-sm w-auto"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Result count */}
          <div className="flex-1 text-right text-sm text-gray-500 dark:text-gray-400">
            {sortedPages.length} page{sortedPages.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Page list */}
      {isLoading ? (
        <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
          Loading pages...
        </div>
      ) : paginatedPages.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No pages found</p>
          <Link to="/sources" className="btn btn-primary">
            Ingest your first source
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-gray-200 dark:divide-gray-700">
          {paginatedPages.map((pageItem) => (
            <Link
              key={pageItem.id}
              to={`/page/${pageItem.id}`}
              className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`page-type-badge ${pageItem.type}`}>
                      {pageItem.type}
                    </span>
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {pageItem.title}
                    </h3>
                  </div>
                  {pageItem.summary && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {pageItem.summary}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <span>Modified {new Date(pageItem.lastModified).toLocaleDateString()}</span>
                    {pageItem.tags.length > 0 && (
                      <>
                        <span>•</span>
                        {pageItem.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                            {tag}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
