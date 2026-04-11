/**
 * MCP Server Types
 * 
 * Type definitions for the wiki MCP server.
 */

/**
 * Wiki directory provider interface
 */
export interface WikiDirProvider {
  getWikiDir(): string;
  setWikiDir(path: string): void;
}

/**
 * MCP Server options
 */
export interface MCPServerOptions {
  /**
   * Wiki directory path
   */
  wikiDir?: string;
  
  /**
   * Server name (default: llm-wiki)
   */
  name?: string;
  
  /**
   * Server version (default: 0.1.0)
   */
  version?: string;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  details?: Record<string, unknown>;
  isError?: boolean;
}
