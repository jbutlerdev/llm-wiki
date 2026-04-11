/**
 * Search page - Full search interface with filters
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchWiki } from '../api/wiki';

const PAGE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'summary', label: 'Summaries' },
  { value: 'entity', label: 'Entities' },
  { value: 'source', label: 'Sources' },
  { value: 'comparison', label: 'Comparisons' },
  { value: 'synthesis', label: 'Syntheses' },
];

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const { data: results = [], isLoading, isFetching } = useQuery({
    queryKey: ['search', submittedQuery, selectedType],
    queryFn: () => searchWiki(submittedQuery, selectedType ? { type: selectedType } : undefined),
    enabled: submittedQuery.length >= 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setSubmittedQuery(query.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Search form */}
      <form onSubmit={handleSearch} className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the wiki..."
              className="input text-lg"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input py-2 w-auto"
            >
              {PAGE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" disabled={query.length < 2}>
              Search
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      {isLoading || isFetching ? (
        <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4">Searching...</p>
        </div>
      ) : submittedQuery.length < 2 ? (
        <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg">Enter at least 2 characters to search</p>
          <p className="mt-2 text-sm">Try searching for topics, concepts, or specific page titles</p>
        </div>
      ) : results.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-lg text-gray-700 dark:text-gray-300">No results found</p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Try different keywords or remove filters
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Found {results.length} result{results.length !== 1 ? 's' : ''} for "{submittedQuery}"
          </p>

          <div className="space-y-3">
            {results.map((result) => (
              <Link
                key={result.id}
                to={`/page/${result.id}`}
                className="card p-4 block hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`page-type-badge ${result.type}`}>{result.type}</span>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {result.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {result.snippet}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {Math.round(result.score * 100)}%
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
