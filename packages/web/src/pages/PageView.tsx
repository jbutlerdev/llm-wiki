/**
 * Page view - Display a single wiki page with markdown rendering
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPage, getBacklinks, getPageBySlug } from '../api/wiki';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function PageView() {
  const { id, type, slug } = useParams<{ id?: string; type?: string; slug?: string }>();

  // Build page identifier from params
  const pageId = id || (type && slug ? `${type}/${slug}` : '');

  const { data: page, isLoading: pageLoading, error: pageError } = useQuery({
    queryKey: ['page', pageId],
    queryFn: () => {
      if (id && !id.includes('/')) {
        return getPage(id);
      } else if (type && slug) {
        return getPageBySlug(type, slug);
      }
      throw new Error('Invalid page ID');
    },
    enabled: !!pageId,
  });

  const { data: backlinks = [] } = useQuery({
    queryKey: ['backlinks', pageId],
    queryFn: () => getBacklinks(pageId!),
    enabled: !!pageId,
  });

  // Extract table of contents from headings
  const headings = page?.content.match(/^#{2,3}\s+.+$/gm) || [];

  if (pageLoading) {
    return (
      <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
        Loading page...
      </div>
    );
  }

  if (pageError || !page) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">Page not found</p>
        <Link to="/browse" className="btn btn-secondary">
          Back to Browse
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className={`page-type-badge ${page.type}`}>{page.type}</span>
              {page.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{page.title}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Last modified: {new Date(page.lastModified).toLocaleString()}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4 prose dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom link handling for wiki links
                a: ({ href, children }) => {
                  if (href?.startsWith('/') || href?.startsWith('#')) {
                    return (
                      <Link to={href} className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                        {children}
                      </Link>
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  );
                },
              }}
            >
              {page.content}
            </ReactMarkdown>
          </div>

          {/* Sources */}
          {page.sources.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sources</h3>
              <ul className="space-y-1">
                {page.sources.map((source) => (
                  <li key={source} className="text-sm">
                    <Link
                      to={`/page/${source}`}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      {source}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-64 space-y-6">
        {/* Table of contents */}
        {headings.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">On this page</h3>
            <nav className="space-y-1">
              {headings.map((heading, index) => {
                const level = heading.match(/^#+/)?.[0].length || 2;
                const text = heading.replace(/^#+\s+/, '');
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <a
                    key={index}
                    href={`#${id}`}
                    className={`
                      block text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400
                      ${level === 3 ? 'pl-3' : ''}
                    `}
                  >
                    {text}
                  </a>
                );
              })}
            </nav>
          </div>
        )}

        {/* Backlinks */}
        {backlinks.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Backlinks ({backlinks.length})
            </h3>
            <nav className="space-y-1">
              {backlinks.map((link) => (
                <Link
                  key={link.id}
                  to={`/page/${link.id}`}
                  className="block text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 truncate"
                >
                  {link.title}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Related pages */}
        {page.relatedPages.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Related Pages
            </h3>
            <nav className="space-y-1">
              {page.relatedPages.map((relPage) => (
                <Link
                  key={relPage}
                  to={`/page/${relPage}`}
                  className="block text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 truncate"
                >
                  {relPage}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}


