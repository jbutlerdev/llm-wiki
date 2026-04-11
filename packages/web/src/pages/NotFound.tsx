/**
 * 404 - Not Found page
 */

import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <span className="text-8xl mb-4 block">🔍</span>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          404 - Page Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/" className="btn btn-primary">
            Go Home
          </Link>
          <Link to="/browse" className="btn btn-secondary">
            Browse Pages
          </Link>
        </div>
      </div>
    </div>
  );
}
