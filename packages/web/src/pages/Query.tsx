/**
 * Query page - Ask questions against the wiki
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { queryWiki } from '../api/wiki';

export function QueryPage() {
  const [question, setQuestion] = useState('');
  const [shouldFile, setShouldFile] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<{
    answer: string;
    citations: Array<{ slug: string; title: string; snippet: string }>;
    filedToWiki?: string;
  } | null>(null);

  const queryMutation = useMutation({
    mutationFn: ({ q, file }: { q: string; file: boolean }) => queryWiki(q, file),
    onSuccess: (data) => {
      setCurrentAnswer(data);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      queryMutation.mutate({ q: question.trim(), file: shouldFile });
    }
  };

  const handleClear = () => {
    setQuestion('');
    setCurrentAnswer(null);
    setShouldFile(false);
  };

  return (
    <div className="space-y-6">
      {/* Query form */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Ask a Question
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know about your wiki?"
              className="input h-24 resize-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shouldFile}
                onChange={(e) => setShouldFile(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                File answer to wiki
              </span>
            </label>

            <div className="flex-1" />

            {currentAnswer && (
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-secondary"
              >
                Clear
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!question.trim() || queryMutation.isPending}
            >
              {queryMutation.isPending ? 'Thinking...' : 'Ask'}
            </button>
          </div>
        </form>
      </div>

      {/* Error message */}
      {queryMutation.isError && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-400">
            {queryMutation.error?.message || 'An error occurred'}
          </p>
        </div>
      )}

      {/* Answer display */}
      {currentAnswer && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Answer
            </h3>
            {currentAnswer.filedToWiki && (
              <Link
                to={`/page/${currentAnswer.filedToWiki}`}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                View filed answer →
              </Link>
            )}
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {currentAnswer.answer}
            </div>
          </div>

          {currentAnswer.citations.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sources
              </h4>
              <ul className="space-y-2">
                {currentAnswer.citations.map((citation, index) => (
                  <li key={citation.slug} className="text-sm">
                    <Link
                      to={`/page/${citation.slug}`}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                    >
                      [{index + 1}] {citation.title}
                    </Link>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      {citation.snippet}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Help text */}
      {!currentAnswer && !queryMutation.isPending && (
        <div className="card p-6 text-center">
          <span className="text-4xl mb-4 block">💡</span>
          <p className="text-gray-500 dark:text-gray-400">
            Ask questions about the knowledge in your wiki.
            <br />
            Good answers can be filed back to the wiki for future reference.
          </p>
        </div>
      )}
    </div>
  );
}
