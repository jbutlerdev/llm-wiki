/**
 * LLM Wiki MCP Server
 * 
 * Model Context Protocol server that exposes wiki operations
 * as tools for external AI assistants like Claude Desktop.
 * 
 * @example
 * // Start the MCP server
 * import { createMCPServer } from '@llm-wiki/mcp';
 * 
 * const server = createMCPServer({
 *   wikiDir: '/path/to/wiki',
 * });
 * 
 * // Connect to stdio
 * server.connect();
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { WikiDirProvider, MCPServerOptions } from './types/index.js';
import type { QMDStoreWrapper } from '@llm-wiki/core';
import { TOOL_EXECUTORS } from './tools/index.js';

/**
 * Wiki directory provider implementation
 */
export function createWikiDirProvider(initialPath?: string): WikiDirProvider {
  let wikiDir = initialPath || process.cwd();

  return {
    getWikiDir(): string {
      return wikiDir;
    },
    setWikiDir(path: string): void {
      wikiDir = path;
    },
  };
}

/**
 * MCP Server interface
 */
export interface MCPServerInstance {
  /**
   * The underlying MCP server instance
   */
  server: McpServer;

  /**
   * Wiki directory provider
   */
  wikiDirProvider: WikiDirProvider;

  /**
   * Connect to stdio transport (blocking)
   */
  connect(): Promise<void>;

  /**
   * Get the QMD store wrapper (if configured)
   */
  getStoreWrapper(): QMDStoreWrapper | undefined;
}

/**
 * Create an MCP server for LLM Wiki
 * 
 * @param options - Server configuration options
 * @param storeWrapper - Optional QMD store wrapper for hybrid search
 * @returns MCP server instance
 */
export function createMCPServer(
  options: MCPServerOptions = {},
  storeWrapper?: QMDStoreWrapper
): MCPServerInstance {
  const {
    wikiDir = process.cwd(),
    name = 'llm-wiki',
    version = '0.1.0',
  } = options;

  const wikiDirProvider = createWikiDirProvider(wikiDir);

  // Create MCP server
  const server = new McpServer({
    name,
    version,
  });

  // Define tool schemas using Zod
  const WikiSearchSchema = z.object({
    query: z.string().describe('The search query'),
    limit: z.number().optional().default(10).describe('Maximum number of results to return'),
    pageType: z.enum(['summary', 'entity', 'source', 'comparison', 'synthesis']).optional().describe('Filter by page type'),
    minScore: z.number().optional().default(0).describe('Minimum relevance score threshold'),
  });

  const WikiGetSchema = z.object({
    id: z.string().describe('Page ID or path (e.g., "entity/my-page" or "my-page")'),
    raw: z.boolean().optional().default(false).describe('Return raw markdown without formatting'),
  });

  const WikiIngestSchema = z.object({
    source: z.string().describe('Source content - file path, URL, or raw text content'),
    sourceType: z.enum(['file', 'url', 'text']).optional().default('text').describe('Type of source'),
    title: z.string().optional().describe('Title for the source document'),
  });

  const WikiStatusSchema = z.object({});

  // Register wiki_search tool
  server.registerTool('wiki_search', {
    description: 'Search the wiki using hybrid QMD search (BM25 + vector). Returns matching pages with relevance scores.',
    inputSchema: WikiSearchSchema,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }, async (args, _extra) => {
    try {
      const executor = TOOL_EXECUTORS.wiki_search;
      const result = await executor(wikiDirProvider, args as { query: string; limit?: number; pageType?: string; minScore?: number; }, storeWrapper);
      return {
        content: result.content,
        _meta: result.details,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  // Register wiki_get tool
  server.registerTool('wiki_get', {
    description: 'Get a specific wiki page by ID or path. Returns the full page content with metadata.',
    inputSchema: WikiGetSchema,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }, async (args, _extra) => {
    try {
      const executor = TOOL_EXECUTORS.wiki_get;
      const result = await executor(wikiDirProvider, args as { id: string; raw?: boolean });
      return {
        content: result.content,
        _meta: result.details,
        isError: result.isError,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  // Register wiki_ingest tool
  server.registerTool('wiki_ingest', {
    description: 'Ingest a source document into the wiki. Supports markdown files, URLs, and raw text. Creates a source page and updates related entities.',
    inputSchema: WikiIngestSchema,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }, async (args, _extra) => {
    try {
      const executor = TOOL_EXECUTORS.wiki_ingest;
      const result = await executor(wikiDirProvider, args as { source: string; sourceType?: 'file' | 'url' | 'text'; title?: string });
      return {
        content: result.content,
        _meta: result.details,
        isError: result.isError,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  // Register wiki_status tool
  server.registerTool('wiki_status', {
    description: 'Get wiki health and statistics including page counts, recent changes, and health metrics.',
    inputSchema: WikiStatusSchema,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }, async (_args, _extra) => {
    try {
      const executor = TOOL_EXECUTORS.wiki_status;
      const result = await executor(wikiDirProvider);
      return {
        content: result.content,
        _meta: result.details,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  return {
    server,
    wikiDirProvider,
    getStoreWrapper: () => storeWrapper,
    connect: async () => {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}

/**
 * Default server instance for CLI usage
 */
let defaultServer: MCPServerInstance | null = null;

/**
 * Get or create the default MCP server
 */
export function getDefaultServer(
  options: MCPServerOptions = {},
  storeWrapper?: QMDStoreWrapper
): MCPServerInstance {
  if (!defaultServer) {
    defaultServer = createMCPServer(options, storeWrapper);
  }
  return defaultServer;
}

/**
 * Start the MCP server with stdio transport
 * 
 * This function is typically called from the CLI:
 * 
 * @example
 * // In your CLI mcp command
 * import { startMCPServer } from '@llm-wiki/mcp';
 * 
 * await startMCPServer({
 *   wikiDir: '/path/to/wiki',
 * });
 */
export async function startMCPServer(options: MCPServerOptions = {}): Promise<void> {
  const server = getDefaultServer(options);
  await server.connect();
}

// Re-export types
export type { WikiDirProvider, MCPServerOptions, ToolResult } from './types/index.js';

// Re-export tool executors for direct use
export {
  executeWikiSearchTool,
  executeWikiGetTool,
  executeWikiIngestTool,
  executeWikiStatusTool,
} from './tools/index.js';
