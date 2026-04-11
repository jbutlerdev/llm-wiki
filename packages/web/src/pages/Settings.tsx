/**
 * Settings page - Configuration and schema editor
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConfig, updateConfig } from '../api/wiki';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'schema'>('config');
  const [configJson, setConfigJson] = useState('');
  const [schemaContent, setSchemaContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
  });

  // Initialize JSON editor when config loads
  useState(() => {
    if (config) {
      setConfigJson(JSON.stringify(config, null, 2));
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    try {
      const parsed = JSON.parse(configJson);
      updateMutation.mutate(parsed);
    } catch (e) {
      alert('Invalid JSON');
    }
  };

  const tabs = [
    { id: 'config', label: 'Configuration' },
    { id: 'schema', label: 'Schema Editor' },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'config' | 'schema')}
                className={`
                  px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Wiki Configuration</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-secondary"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setConfigJson(JSON.stringify(config, null, 2));
                        setIsEditing(false);
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="btn btn-primary"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Loading configuration...
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    readOnly={!isEditing}
                    className={`
                      input font-mono text-sm h-96 resize-none
                      ${isEditing
                        ? 'bg-gray-50 dark:bg-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                      }
                    `}
                  />
                  {updateMutation.isError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {updateMutation.error?.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Schema Editor</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Edit CLAUDE.md and AGENTS.md schema files
                  </p>
                </div>
                <button
                  onClick={() => {
                    // TODO: Implement save schema
                    alert('Schema editing coming soon');
                  }}
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CLAUDE.md (for Claude Code)
                  </label>
                  <textarea
                    value={schemaContent || '# LLM Wiki Schema\n\nEdit your schema here...'}
                    onChange={(e) => setSchemaContent(e.target.value)}
                    className="input font-mono text-sm h-64 resize-none bg-gray-50 dark:bg-gray-900"
                    placeholder="Enter schema content..."
                  />
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Tip:</strong> The schema files tell the LLM how to maintain your wiki.
                    Include conventions for page formatting, workflows for common tasks, and any
                    domain-specific rules.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
