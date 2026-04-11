# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **E2E Test Infrastructure**: Playwright-based end-to-end tests for browser automation
  - Browse page tests
  - Search functionality tests
  - Page view tests
  - Graph visualization tests
- **GitHub Actions CI/CD**: Automated testing and continuous integration workflows
- **Release Workflow**: Automated npm publishing on version tags

## [0.1.0] - 2026-04-11

### Added

#### Core Package (`@llm-wiki/core`)
- **Type System**: Complete TypeScript types for WikiPage, SourceDocument, LogEntry, LintReport
- **Wiki Operations**: 
  - `init` - Initialize wiki directory structure
  - `loadPage`, `createPage`, `updatePage`, `deletePage` - Page CRUD operations
  - `listPages`, `getBacklinks`, `getOrphanPages` - Page queries
  - Path validation and traversal protection
- **Schema System**:
  - `SchemaLoader` - Load and cache CLAUDE.md schema files
  - `SchemaValidator` - Validate page conventions
  - `SchemaTemplate` - Generate CLAUDE.md and AGENTS.md templates
- **Source Ingestion**:
  - `SourceLoader` - Load markdown files, URLs, and text
  - `SourceSummarizer` - Extract entities and key points
  - Entity and summary page updates on ingest
  - Index and log maintenance
- **QMD Search Integration**:
  - `QMDStore` wrapper for @tobilu/qmd
  - Hybrid search (BM25 + vector + re-ranking)
  - Automatic indexing on wiki changes
  - File watcher for hot-reload
- **Lint System**:
  - Contradiction detection
  - Staleness checking
  - Coverage analysis
  - Orphan detection
- **Query System**:
  - Question answering with search context
  - Answer synthesis with citations
  - File answer back to wiki
- **Git Integration**:
  - Status, diff, commit, log, revert operations
  - Auto-commit workflow
- **Performance Module**:
  - `TTLCache`, `LRUCache` - Caching utilities
  - `debounce`, `throttle`, `batch` - Rate limiting
  - Custom error classes and Result type

#### CLI Package (`@llm-wiki/cli`)
- `init` - Initialize new wiki
- `ingest` - Ingest source documents
- `search` - Hybrid QMD search
- `lint` - Run wiki health checks
- `status` - Show wiki statistics
- `list` - List wiki pages
- `server` - Start web server
- `agent` - Control embedded agent

#### Server Package (`@llm-wiki/server`)
- **REST API**:
  - `GET/POST/PUT/DELETE /api/pages` - Page CRUD
  - `GET/POST /api/sources` - Source management
  - `GET /api/search` - Hybrid search
  - `GET /api/lint` - Health checks
  - `GET /api/status` - Wiki statistics
  - `GET/PUT /api/config` - Configuration
  - `GET/POST /api/log` - Activity log
  - `GET/POST /api/agent/*` - Agent control
  - `GET /api/graph` - Graph data
  - `GET/POST /api/git/*` - Version control
- **WebSocket**: Real-time updates for wiki changes and agent events
- **Static File Serving**: Built web UI
- **File Watcher**: Hot-reload on wiki changes

#### Web Package (`@llm-wiki/web`)
- **Pages**:
  - Dashboard - Overview with stats and recent activity
  - Browse - Paginated page list with filters
  - PageView - Markdown rendering with TOC and backlinks
  - Search - Full-text and semantic search
  - Graph - D3.js force-directed visualization
  - Sources - File upload and URL import
  - Lint - Health dashboard with issue list
  - Settings - Configuration and schema editor
  - Agent - Status, mode, and activity controls
  - AgentApproval - Approval workflow for semi-autonomous mode
- **Components**:
  - Layout with sidebar navigation
  - Search overlay (Cmd+K)
  - Theme toggle (light/dark)
- **Features**:
  - React Query for data fetching
  - React Router for navigation
  - Tailwind CSS styling
  - Responsive design

#### Agent Package (`@llm-wiki/agent`)
- **Session Manager**: Pi agent session management with pi-coding-agent SDK
- **Wiki Tools**: 
  - `wiki_search` - Hybrid search
  - `wiki_ingest` - Source ingestion
  - `wiki_query` - Question answering
  - `wiki_status`, `wiki_get`, `wiki_list`
- **Agent Skills**: 
  - Ingest workflow skill
  - Query workflow skill
  - Lint workflow skill
- **Modes**:
  - Interactive - User-driven commands
  - Semi-autonomous - Auto-run with approvals
  - Autonomous - Continuous self-maintenance
- **Agent Loop**: Maintenance cycle with configurable intervals
- **Event System**: SSE streaming for real-time updates

#### MCP Package (`@llm-wiki/mcp`)
- MCP server exposing wiki as Model Context Protocol tools
- Tools: `wiki_search`, `wiki_get`, `wiki_ingest`, `wiki_status`
- Stdio transport for local integration
- Configuration guides for Claude Desktop, Claude Code, Pi Agent

### Documentation
- `README.md` - Comprehensive documentation
- `spec.md` - Product specification
- `plan.md` - Development plan
- `llm-wiki.md` - User documentation
- MCP configuration documentation

### Testing
- **Unit Tests**: Vitest with 400+ tests across packages
- **Integration Tests**: Full workflow tests in `integration/`
- **E2E Tests**: Playwright tests for browser automation

### Infrastructure
- Monorepo with Turborepo
- TypeScript strict mode
- ESLint + Prettier
- Git hooks for pre-commit validation
- GitHub Actions CI/CD
- Semantic versioning with automated releases

[unreleased]: https://github.com/jbutlerdev/llm-wiki/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jbutlerdev/llm-wiki/releases/tag/v0.1.0
