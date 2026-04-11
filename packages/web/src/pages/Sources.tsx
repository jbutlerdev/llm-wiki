/**
 * Sources page - Manage raw source documents
 */

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSources, ingestSource } from '../api/wiki';

export function SourcesPage() {
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: getSources,
  });

  const ingestMutation = useMutation({
    mutationFn: ingestSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['status'] });
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
  });

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      ingestMutation.mutate({ path: file.name });
    });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      ingestMutation.mutate({ url: urlInput.trim() });
      setUrlInput('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File upload */}
        <div
          className={`
            card p-6 border-2 border-dashed transition-colors
            ${isDragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600'
            }
          `}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <h2 className="text-lg font-semibold mb-4">Upload Files</h2>
          <div className="flex flex-col items-center justify-center py-8">
            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Drag and drop markdown files here
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
          </div>
        </div>

        {/* URL import */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Import from URL</h2>
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/article"
                className="input"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!urlInput.trim() || ingestMutation.isPending}
            >
              {ingestMutation.isPending ? 'Importing...' : 'Import'}
            </button>
          </form>
        </div>
      </div>

      {/* Error/Success messages */}
      {ingestMutation.isError && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-400">{ingestMutation.error?.message}</p>
        </div>
      )}

      {ingestMutation.isSuccess && (
        <div className="card p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <p className="text-green-700 dark:text-green-400">Source imported successfully!</p>
        </div>
      )}

      {/* Sources list */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">All Sources ({sources.length})</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Loading sources...
          </div>
        ) : sources.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No sources yet. Upload a file or import from URL to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sources.map((source) => (
              <div key={source.id} className="px-6 py-4 flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {source.type === 'url' ? (
                    <span className="text-xl">🔗</span>
                  ) : (
                    <span className="text-xl">📄</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {source.type}
                    </span>
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {source.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                    {source.url || source.path}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Ingested {new Date(source.ingestedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
