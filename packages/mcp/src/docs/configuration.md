# MCP Server Configuration

The LLM Wiki MCP server exposes wiki operations as Model Context Protocol tools, allowing external AI assistants to query and interact with your wiki.

## Quick Start

### 1. Install the MCP package

```bash
npm install @llm-wiki/mcp
```

### 2. Configure Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "wiki": {
      "command": "node",
      "args": ["/path/to/node_modules/@llm-wiki/mcp/dist/cli.js"],
      "env": {
        "WIKI_DIR": "/path/to/your/wiki"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

After updating the configuration, restart Claude Desktop to load the new MCP server.

## Available Tools

### wiki_search

Search the wiki using hybrid QMD search (BM25 + vector).

```json
{
  "name": "wiki_search",
  "arguments": {
    "query": "machine learning",
    "limit": 10,
    "pageType": "entity",
    "minScore": 0.1
  }
}
```

**Parameters:**
- `query` (required): The search query string
- `limit` (optional): Maximum number of results (default: 10)
- `pageType` (optional): Filter by type (summary, entity, source, comparison, synthesis)
- `minScore` (optional): Minimum relevance score threshold (default: 0)

### wiki_get

Retrieve a specific wiki page by ID or path.

```json
{
  "name": "wiki_get",
  "arguments": {
    "id": "entity/my-entity",
    "raw": false
  }
}
```

**Parameters:**
- `id` (required): Page ID or path (e.g., "entity/my-page" or "my-page")
- `raw` (optional): Return raw markdown without formatting (default: false)

### wiki_ingest

Ingest a source document into the wiki.

```json
{
  "name": "wiki_ingest",
  "arguments": {
    "source": "The content of the document...",
    "sourceType": "text",
    "title": "My Document"
  }
}
```

**Parameters:**
- `source` (required): Source content - file path, URL, or raw text
- `sourceType` (optional): Type of source ("file", "url", or "text", default: "text")
- `title` (optional): Title for the source document

### wiki_status

Get wiki health and statistics.

```json
{
  "name": "wiki_status",
  "arguments": {}
}
```

Returns total pages, pages by type, tags, recent pages, and health metrics.

## Claude Code Configuration

For Claude Code (command-line), add to your `~/.claude.json`:

```json
{
  "mcpServers": {
    "wiki": {
      "command": "node",
      "args": ["/path/to/node_modules/@llm-wiki/mcp/dist/cli.js"],
      "env": {
        "WIKI_DIR": "/path/to/your/wiki"
      }
    }
  }
}
```

## Pi Agent Configuration

To use the MCP server with the embedded Pi agent, configure the agent to connect to the MCP server:

```json
{
  "mcpServers": {
    "wiki": {
      "command": "node",
      "args": ["/path/to/node_modules/@llm-wiki/mcp/dist/cli.js"],
      "env": {
        "WIKI_DIR": "/path/to/your/wiki"
      }
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WIKI_DIR` | Wiki directory path | Current working directory |

## CLI Usage

The MCP server can also be run as a standalone CLI:

```bash
# Set wiki directory
export WIKI_DIR=/path/to/wiki

# Start the MCP server (stdio mode)
node node_modules/@llm-wiki/mcp/dist/cli.js
```

## Troubleshooting

### Server not starting

1. Verify Node.js version (requires Node.js 20+)
2. Check that the wiki directory exists and is accessible
3. Ensure the MCP package is properly installed

### Tools not responding

1. Verify the wiki directory path is correct
2. Check that the wiki has been initialized (`llm-wiki init`)
3. Look for errors in the Claude Desktop logs

### Search returns no results

1. Ensure QMD has been initialized: `llm-wiki index`
2. Check that wiki pages exist in the wiki/ directory
3. Verify the search query is spelled correctly
