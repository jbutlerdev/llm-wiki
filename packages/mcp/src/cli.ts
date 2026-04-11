#!/usr/bin/env node

/**
 * MCP Server CLI
 * 
 * Standalone CLI for the LLM Wiki MCP server.
 * Run with: node dist/cli.js
 */

import { startMCPServer } from './index.js';

const wikiDir = process.env.WIKI_DIR || process.cwd();

console.error('Starting LLM Wiki MCP Server...');
console.error(`Wiki directory: ${wikiDir}`);

startMCPServer({
  wikiDir,
  name: 'llm-wiki',
  version: '0.1.0',
}).catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
