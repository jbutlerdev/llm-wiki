/**
 * Wiki Tools for MCP
 * 
 * Exposes wiki operations as MCP tools.
 */

// Import executors
import { executeWikiSearchTool } from './wiki-search.js';
import { executeWikiGetTool } from './wiki-get.js';
import { executeWikiIngestTool } from './wiki-ingest.js';
import { executeWikiStatusTool } from './wiki-status.js';

// Re-export executors
export { executeWikiSearchTool };
export { executeWikiGetTool };
export { executeWikiIngestTool };
export { executeWikiStatusTool };

/**
 * Tool execution functions map
 */
export const TOOL_EXECUTORS = {
  wiki_search: executeWikiSearchTool,
  wiki_get: executeWikiGetTool,
  wiki_ingest: executeWikiIngestTool,
  wiki_status: executeWikiStatusTool,
} as const;
