# LLM Wiki

An LLM-maintained personal wiki with built-in QMD search. The embedded Pi agent autonomously maintains your wiki by ingesting sources, updating pages, and maintaining consistency.

## Features

- **Persistent Knowledge Compounding**: Build a wiki that grows richer with every source ingested and every question asked
- **Embedded Pi Agent**: Full agent loop using `pi-coding-agent` SDK that autonomously maintains the wiki
- **LLM-Maintained Structure**: The agent handles all bookkeeping—summarizing, cross-referencing, and maintaining consistency
- **Built-in QMD Search**: Hybrid BM25 + vector + re-ranking search
- **Three-Layer Architecture**: Clear separation between raw sources (immutable), wiki (agent-generated), and schema (agent instructions)
- **Full-Stack Application**: Both CLI tools and a modern web interface
- **Multiple Agent Modes**: Autonomous, interactive, and semi-autonomous

## Installation

```bash
# From source
npm install
npm run build

# Or install globally
npm install -g .
```

## Quick Start

```bash
# Initialize a new wiki
llm-wiki init my-wiki
cd my-wiki

# Ingest a source document
llm-wiki ingest path/to/document.md

# Search the wiki
llm-wiki search "your query"

# Run health checks
llm-wiki lint

# Check wiki status
llm-wiki status

# Start the web server
llm-wiki server
```

## CLI Commands

### `llm-wiki init [path]`
Initialize a new wiki directory.

```bash
llm-wiki init                     # Initialize in current directory
llm-wiki init /path/to/wiki      # Initialize in specific directory
```

### `llm-wiki ingest <source>`
Ingest a source document into the wiki.

```bash
llm-wiki ingest document.md              # Local file
llm-wiki ingest https://example.com/doc   # URL
llm-wiki ingest --text "Content here"     # Raw text
llm-wiki ingest --tags ai,ml document.md  # With tags
```

### `llm-wiki search <query>`
Search the wiki using hybrid search.

```bash
llm-wiki search "machine learning"
llm-wiki search --type entity "neural networks"
llm-wiki search --json "query"  # JSON output
```

### `llm-wiki lint`
Run wiki health checks.

```bash
llm-wiki lint              # Run all checks
llm-wiki lint --fix       # Auto-fix issues
llm-wiki lint --types contradiction,orphan  # Specific checks
```

### `llm-wiki status`
Show wiki status and statistics.

### `llm-wiki list`
List all wiki pages.

```bash
llm-wiki list                    # List all pages
llm-wiki list --type entity      # Filter by type
llm-wiki list --tag ai           # Filter by tag
```

### `llm-wiki server`
Start the web server.

```bash
llm-wiki server                    # Default port 3000
llm-wiki server --port 8080        # Custom port
llm-wiki server --open             # Auto-open browser
```

### `llm-wiki agent`
Control the embedded agent.

```bash
llm-wiki agent status   # Check agent status
llm-wiki agent start    # Start agent
llm-wiki agent stop     # Stop agent
llm-wiki agent mode     # Show current mode
```

## Wiki Structure

```
wiki/
├── raw/                    # Immutable source documents
│   └── [source files]
├── entity/                # Entity pages
│   └── *.md
├── source/                # Source summaries
│   └── *.md
├── summary/               # Overview pages
│   └── *.md
├── comparison/            # Comparison pages
│   └── *.md
├── synthesis/             # Deep dive pages
│   └── *.md
├── index.md               # Content catalog
├── log.md                 # Chronological log
├── CLAUDE.md              # Schema for Claude Code
├── AGENTS.md              # Schema for embedded agent
└── llm-wiki.yml           # Wiki configuration
```

## Page Types

| Type | Description |
|------|-------------|
| `summary` | Overview synthesizing multiple sources |
| `entity` | Individual entities (people, concepts, topics) |
| `source` | Processed source summaries |
| `comparison` | Side-by-side comparisons |
| `synthesis` | Deep dives on specific themes |

## Frontmatter

```yaml
---
title: Page Title
type: entity
tags: [ai, machine-learning]
sources: [document-1.md]
relatedPages: [other-page, another-page]
createdAt: 2024-01-15T10:00:00Z
lastModified: 2024-01-20T14:30:00Z
---
```

## Agent Modes

| Mode | Description |
|------|-------------|
| **Interactive** | Agent responds to explicit commands only |
| **Semi-Autonomous** | Auto-runs, pauses for approvals on major changes |
| **Autonomous** | Continuous self-maintenance |

## API

The web server exposes a REST API:

### Pages
- `GET /api/pages` - List all pages
- `GET /api/pages/:slug` - Get page
- `POST /api/pages` - Create page
- `PUT /api/pages/:slug` - Update page
- `DELETE /api/pages/:slug` - Delete page

### Sources
- `GET /api/sources` - List sources
- `POST /api/sources/ingest` - Ingest source

### Search
- `GET /api/search?q=query` - Search

### Lint
- `GET /api/lint` - Run health checks

### Agent
- `GET /api/agent/status` - Agent status
- `POST /api/agent/start` - Start agent
- `POST /api/agent/stop` - Stop agent
- `PUT /api/agent/mode` - Change mode

## Configuration

Edit `llm-wiki.yml`:

```yaml
name: My Wiki
description: Personal knowledge base
rawDir: raw
qmd:
  model: all-MiniLM-L6-v2
  topK: 10
agent:
  mode: interactive
  cycleInterval: 60000
```

## Web UI

The web interface provides:

- **Dashboard**: Overview with stats and recent activity
- **Browse**: Filterable page list
- **Page View**: Markdown rendering with TOC and backlinks
- **Search**: Full search with filters
- **Graph**: D3.js force-directed visualization
- **Sources**: Upload and manage sources
- **Lint**: Health check dashboard
- **Agent**: Agent control panel
- **Settings**: Configuration and schema editor

Access at `http://localhost:3000` when server is running.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build packages
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Pi Agent (embedded)                   │
├─────────────────────────────────────────────────────────┤
│  Session Manager (persisted to disk)                    │
├─────────────────────────────────────────────────────────┤
│  Agent Tools (wiki_search, wiki_ingest, wiki_query)    │
├─────────────────────────────────────────────────────────┤
│  Agent Skills (ingest, query, lint)                    │
├─────────────────────────────────────────────────────────┤
│  Context Files (CLAUDE.md, AGENTS.md)                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │     Core Wiki Ops     │
              │  (packages/core)      │
              └────────────────────────┘
```

## Packages

| Package | Description |
|---------|-------------|
| `packages/core` | Types, wiki operations, QMD integration |
| `packages/cli` | CLI commands |
| `packages/server` | Hono API server |
| `packages/web` | React frontend |
| `packages/agent` | Embedded Pi agent |
| `packages/mcp` | MCP server |

## License

MIT
