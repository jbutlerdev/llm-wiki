# LLM Wiki - Product Specification

## Header Section

- **Project Name**: LLM Wiki
- **Version**: 1.0.0
- **Date Created**: 2026-04-11
- **Status**: Draft

---

## Problem Statement

Personal knowledge bases built on traditional RAG (Retrieval-Augmented Generation) systems require the LLM to rediscover and piece together knowledge from raw documents on every query. There's no accumulation or compounding of understanding. The maintenance burden of keeping a wiki current—updating cross-references, noting contradictions, maintaining consistency across dozens of pages—causes humans to abandon wikis because the effort grows faster than the value.

### Why This Is Needed Now

- LLMs have reached sufficient capability to reliably perform the bookkeeping tasks that previously required human attention
- The gap between "having information" and "understanding information" widens as people consume more content
- Agents and coding assistants increasingly need persistent, queryable knowledge bases to operate effectively

### Consequences of Not Building This

- Knowledge remains scattered across raw documents, siloed in chat histories, or lost entirely
- Each query re-derives synthesis that should have been accumulated
- The full potential of LLMs as thinking partners is limited without persistent, compounding memory

---

## Goals & Success Criteria

### Primary Goals

1. **Persistent Knowledge Compounding**: Build a wiki that grows richer with every source ingested and every question asked, not re-derived on every query
2. **LLM-Maintained Structure**: The LLM handles all bookkeeping—summarizing, cross-referencing, filing, and maintaining consistency
3. **Built-in Search with QMD**: Integrate qmd for hybrid BM25 + vector + re-ranking search over wiki content
4. **Three-Layer Architecture**: Maintain clear separation between raw sources (immutable), wiki (LLM-generated), and schema (LLM instructions)
5. **Full-Stack Application**: Provide both CLI tools and a modern web interface for browsing, searching, and managing the wiki
6. **Agent-Friendly**: Designed for use alongside LLM agents (Claude Code, Pi, etc.) as a persistent thinking partner

### Success Metrics

- **Ingest Coverage**: A single source touches 10-15 wiki pages on average (cross-references, entity updates, index updates)
- **Query Response Time**: Search results returned in <500ms for wikis up to 1,000 pages
- **Cross-Reference Density**: Every wiki page has minimum 2 inbound links from other pages
- **Contradiction Detection**: Lint passes identify and flag contradictions between sources
- **Schema Adherence**: LLM maintains wiki structure according to schema conventions with 95%+ accuracy
- **Web UI Performance**: Page loads <1s, search results <500ms

### Non-Goals

- This is not a document management system for storing arbitrary files
- Not a collaborative wiki with multiple human editors (single-owner, LLM-maintained)
- Not a RAG system (knowledge is compiled and synthesized, not re-derived per query)

---

## Functional Requirements

### Core Features

#### 1. Raw Source Management
- **Source Ingestion**: Accept markdown files, URLs (fetched and converted to markdown), and text inputs
- **Source Indexing**: Track all sources with metadata (ingestion date, source type, tags)
- **Immutability**: Sources are never modified by the LLM; only the wiki references them
- **Source Linking**: Wiki pages cite sources via stable references

#### 2. Wiki Layer
- **Page Types**:
  - `summary.md` - Overview synthesizing multiple sources
  - `entity/*.md` - Individual entities (people, concepts, topics)
  - `source/*.md` - Processed source summaries
  - `comparison/*.md` - Side-by-side comparisons
  - `synthesis/*.md` - Deep dives on specific themes
- **Auto-Updates**: When new sources are ingested, LLM updates relevant existing pages
- **Cross-References**: Wiki-wide link maintenance with orphan detection
- **Contradiction Tracking**: Flag when new sources conflict with established claims

#### 3. Schema System
- **CLAUDE.md / AGENTS.md**: Instructions telling the LLM how to maintain the wiki
- **Convention Documentation**: Page format standards, naming conventions, link syntax
- **Workflow Definitions**: Step-by-step processes for ingest, query, and lint operations
- **Co-Evolution**: Schema grows and refines as the wiki domain becomes better understood

#### 4. QMD Integration (Built-in)
- **Hybrid Search Pipeline**: BM25 + vector semantic + LLM re-ranking via qmd
- **Collection Management**: Wiki pages automatically indexed as qmd collections
- **MCP Server**: Expose qmd as an MCP server for agentic access
- **Query Expansion**: LLM-generated query variations for better recall
- **Context System**: Collection-level and path-level context for improved relevance

#### 5. Index & Logging
- **index.md**: Content-oriented catalog of all wiki pages with one-line summaries
- **log.md**: Chronological append-only record of all operations (ingests, queries, lint passes)
- **Log Parsing**: Entries prefixed with `## [YYYY-MM-DD] type | Title` for unix tool compatibility

#### 6. Lint Operations
- **Contradiction Detection**: Cross-reference claims across pages for conflicts
- **Staleness Check**: Identify claims superseded by newer sources
- **Orphan Detection**: Find pages with no inbound links
- **Coverage Analysis**: Suggest missing cross-references and new pages for under-covered concepts
- **Gap Filling**: Identify data gaps addressable via web search

### Web Frontend Features

#### 1. Wiki Browser
- **Page List View**: Browse all wiki pages with filtering by type, tags, date
- **Page Detail View**: Rendered markdown with syntax highlighting, TOC, backlinks
- **Graph View**: Interactive visualization of page connections (D3.js force-directed graph)
- **Quick Search**: Keyboard shortcut (Cmd/Ctrl+K) for instant search overlay

#### 2. Search Interface
- **Hybrid Search**: Full-text + semantic search powered by QMD
- **Filters**: Filter by page type, tags, date range
- **Results Preview**: Snippet preview with highlighted matches
- **Search History**: Recent searches saved locally

#### 3. Source Management
- **Source Upload**: Drag-and-drop or file picker for markdown files
- **URL Import**: Paste URL to fetch and convert to markdown
- **Source List**: View all ingested sources with metadata
- **Source Preview**: View raw source content

#### 4. Lint Dashboard
- **Health Overview**: Summary of wiki health (contradictions, orphans, stale content)
- **Issue List**: Detailed list of issues with navigation to affected pages
- **Fix Actions**: One-click or batch actions to resolve issues
- **History**: Track lint results over time

#### 5. Configuration UI
- **Wiki Settings**: Configure wiki name, description, schema
- **Schema Editor**: Edit CLAUDE.md/AGENTS.md with live preview
- **QMD Status**: View index health, collection stats, re-index controls
- **Theme Settings**: Light/dark mode, font size, layout preferences

### User Stories

1. **As a researcher**, I want to ingest a paper via web UI and have the LLM automatically update all relevant entity pages, summaries, and cross-references so I can focus on analysis rather than bookkeeping.

2. **As a writer**, I want to build a companion wiki as I read a book, with the LLM cross-referencing characters, themes, and plot threads so I end with a rich reference document.

3. **As a knowledge worker**, I want to ask questions against my accumulated knowledge and get synthesized answers with citations, where good answers are filed back into the wiki for future reference.

4. **As a developer**, I want a modern web interface to browse, search, and manage my wiki with a graph view showing how concepts connect.

5. **As an agent user**, I want my coding assistant to have a persistent, queryable memory that compounds over time, not re-derives from raw sources every session.

6. **As a project lead**, I want an LLM-maintained team wiki fed by meeting transcripts and documents, staying current with minimal human effort, accessible via web browser.

### User Interactions

#### CLI Commands
- `llm-wiki init` - Initialize new wiki
- `llm-wiki ingest <source>` - Ingest a source document
- `llm-wiki query <question>` - Query the wiki
- `llm-wiki lint` - Run health checks
- `llm-wiki status` - Show wiki status
- `llm-wiki server` - Start web server

#### Web Interface
- **Navigation**: Sidebar with page tree, breadcrumbs, quick search
- **Actions**: Buttons for ingest, lint, settings
- **Real-time**: WebSocket updates when wiki changes via CLI

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Raw       │     │   Schema    │     │   Wiki      │
│   Sources   │────▶│  (CLAUDE.md)│◀────│  (md files) │
│   (immutable)│     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                           ▲                    │
                           │                    ▼
                    ┌──────┴──────┐      ┌─────────────┐
                    │   LLM       │─────▶│    QMD      │
                    │   Agent     │      │   Search    │
                    └─────────────┘      └─────────────┘
                                               │
                    ┌──────────────────────────┴──────────────────────────┐
                    ▼                                                    ▼
           ┌─────────────┐                                    ┌─────────────┐
           │   CLI        │                                    │   Web UI    │
           │  (Terminal)  │                                    │  (Browser)  │
           └─────────────┘                                    └─────────────┘
```

---

## Technical Requirements

### Languages & Runtimes

- **TypeScript**: Primary implementation language for CLI and server
- **Node.js >= 22**: Runtime environment
- **Bun >= 1.0.0**: Alternative runtime (for faster startup)

### CLI & Server Frameworks

- **Hono**: Lightweight web framework for API server
- **esbuild / vite**: Bundling for web frontend
- **WebSocket**: Real-time updates from CLI to web UI

### Web Frontend Frameworks & Libraries

- **React 18+**: UI framework
- **Tailwind CSS**: Styling
- **D3.js**: Graph visualization
- **React Router**: Client-side routing
- **@tanstack/react-query**: Data fetching and caching
- **react-markdown**: Markdown rendering
- **shiki**: Syntax highlighting

### Backend Libraries

- **qmd**: Built-in search engine (BM25 + vector + re-ranking)
  - Wrapped as internal module, not separate process
- **marked**: Markdown parsing
- **turndown**: HTML to markdown conversion
- **gray-matter**: YAML frontmatter parsing
- **chokidar**: File watching for hot-reload
- **zod**: Schema validation
- **execa**: Process execution for git operations

### Architecture Patterns

- **Monorepo Structure**: Single repo with CLI, server, and web packages
  - `packages/cli/` - Terminal interface
  - `packages/server/` - Hono API server
  - `packages/web/` - React frontend
  - `packages/core/` - Shared types and wiki operations

- **Event-Driven Architecture**: Wiki changes broadcast via WebSocket
- **Plugin Architecture**: Extensible via user-defined hooks in schema

### Development Style

- **Test-Driven Development (TDD)**: Tests written before implementation
- **Feature Flags**: Incremental feature rollout
- **Semantic Versioning**: Clear breaking change policy

---

## Non-Functional Requirements

### Performance

- **Search Latency**: <500ms for hybrid query on 1,000-page wiki
- **Web Page Load**: <1s initial load, <100ms navigation
- **Ingest Throughput**: Process 10 sources/minute for average documents
- **Memory Footprint**: <500MB baseline, <2GB under load with QMD models loaded
- **Startup Time**: <2 seconds for CLI commands, <3 seconds for server

### Security

- **Source Isolation**: Raw sources never modified by the system
- **Path Traversal Protection**: Validate all file paths within wiki directory
- **Local-Only**: No external network calls except URL fetching
- **Data Ownership**: All files owned by user, no cloud dependencies
- **CORS**: Server only serves localhost by default

### Scalability

- **Target Scale**: 100-1,000 sources, hundreds to low-thousands of wiki pages
- **Above Scale**: Recommend splitting into multiple wikis by domain
- **QMD Limits**: Tested up to ~10,000 documents; beyond that, consider sharding

### Reliability

- **Atomic Operations**: Wiki updates wrapped in transactions (git commits)
- **Crash Recovery**: Git history enables rollback from any bad state
- **Idempotent Ingest**: Re-ingesting same source updates rather than duplicates

### Usability

- **Progressive Disclosure**: Simple commands work, advanced features discoverable
- **Clear Feedback**: Every operation reports what changed
- **Modern Web UI**: Clean, responsive design with keyboard shortcuts
- **Real-time Sync**: Web UI updates live when CLI makes changes

### Maintainability

- **Code Coverage**: >80% unit test coverage
- **Documentation**: Inline JSDoc, README for each module
- **Changelog**: Semantic versioning with detailed change notes

---

## Data Requirements

### Data Models

#### Wiki Page

```typescript
interface WikiPage {
  slug: string;           // URL-safe identifier
  title: string;           // Human-readable title
  type: PageType;          // 'summary' | 'entity' | 'source' | 'comparison' | 'synthesis'
  content: string;         // Markdown content
  frontmatter: PageMeta;   // YAML frontmatter
  docId?: string;          // QMD document ID (6-char hash)
  lastModified: Date;
  createdAt: Date;
}

interface PageMeta {
  tags: string[];
  sources: string[];       // Referenced source files
  relatedPages: string[];  // Cross-references
  summary?: string;        // Auto-generated one-line summary
}

type PageType = 'summary' | 'entity' | 'source' | 'comparison' | 'synthesis';
```

#### Source Document

```typescript
interface SourceDocument {
  path: string;            // Relative path within raw/
  type: SourceType;        // 'markdown' | 'url' | 'text'
  title: string;
  ingestedAt: Date;
  url?: string;            // For URL sources
  checksum: string;        // For deduplication
}

type SourceType = 'markdown' | 'url' | 'text';
```

#### Wiki Log Entry

```typescript
interface LogEntry {
  timestamp: Date;
  type: 'ingest' | 'query' | 'lint' | 'update';
  title: string;
  details?: string;
  sources?: string[];
}
```

#### Lint Report

```typescript
interface LintReport {
  timestamp: Date;
  issues: LintIssue[];
  summary: {
    contradictions: number;
    orphans: number;
    stale: number;
    coverage: CoverageGap[];
  };
}

interface LintIssue {
  type: 'contradiction' | 'orphan' | 'stale' | 'coverage';
  pageId: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}
```

### Data Storage

- **Wiki Files**: Markdown files in `./wiki/` directory
- **Raw Sources**: Immutable files in `./raw/` directory
- **QMD Index**: SQLite database at `./.llm-wiki/qmd.sqlite`
- **Configuration**: `llm-wiki.yml` in wiki root
- **Schema**: `CLAUDE.md` (or `AGENTS.md`) in wiki root
- **Server State**: In-memory with file-based persistence for user preferences

### Data Migration

- **Import**: Convert existing markdown collections to wiki format
- **Export**: Generate static site or flat markdown from wiki
- **Git Integration**: Native; wiki is a git repo

### Data Retention

- **Git History**: Full version history for all wiki changes
- **Source Snapshots**: Sources stored verbatim, never deleted by system
- **Log Rotation**: Configurable log retention (default: keep all)

---

## API & Integration Requirements

### Internal CLI API

```typescript
// Core commands exposed as API
async function ingest(source: string, options: IngestOptions): Promise<IngestResult>
async function query(question: string, options: QueryOptions): Promise<QueryResult>
async function lint(options: LintOptions): Promise<LintReport>
async function updateIndex(): Promise<void>
async function search(query: string, options: SearchOptions): Promise<SearchResult[]>
```

### HTTP API (Server)

```typescript
// Wiki operations
GET    /api/pages              // List all pages
GET    /api/pages/:id          // Get page by ID
GET    /api/pages/:id/backlinks // Get pages linking to this page
POST   /api/pages              // Create page
PUT    /api/pages/:id          // Update page
DELETE /api/pages/:id          // Delete page

// Sources
GET    /api/sources            // List all sources
POST   /api/sources/ingest     // Ingest new source
GET    /api/sources/:id        // Get source by ID

// Search
GET    /api/search?q=...&type=... // Hybrid search
GET    /api/search/graph        // Graph data for visualization

// Lint
GET    /api/lint               // Run lint and return report
GET    /api/lint/history       // Lint history

// System
GET    /api/status             // Wiki status
GET    /api/config             // Get configuration
PUT    /api/config             // Update configuration
GET    /api/log                // Recent log entries

// WebSocket
WS     /ws                     // Real-time updates
```

### QMD Integration

```typescript
// Internal QMD wrapper
import { createStore } from '@tobilu/qmd';

interface QMDIntegration {
  store: QMDStore;
  index(): Promise<void>;
  search(query: string): Promise<HybridQueryResult[]>;
  getDocument(docId: string): Promise<DocumentResult>;
}
```

### MCP Server

Expose wiki operations as MCP tools:

- `wiki_search` - Hybrid search with query expansion
- `wiki_get` - Retrieve specific wiki page
- `wiki_ingest` - Process new source
- `wiki_status` - Get wiki health stats
- `wiki_log` - Recent operations log

---

## Web Frontend Architecture

### Pages

1. **Dashboard** (`/`) - Overview with recent activity, quick stats, lint summary
2. **Browse** (`/browse`) - Paginated list of all wiki pages with filters
3. **Page View** (`/page/:id`) - Full page content with TOC, backlinks, metadata
4. **Search** (`/search`) - Full search interface with filters and results
5. **Graph** (`/graph`) - Interactive force-directed graph of page connections
6. **Sources** (`/sources`) - List and manage raw sources
7. **Lint** (`/lint`) - Lint dashboard with issues and fix actions
8. **Settings** (`/settings`) - Configuration and schema editor

### Components

| Component | Description |
|-----------|-------------|
| `Sidebar` | Navigation tree, quick search trigger |
| `PageList` | Filterable, sortable page listing |
| `PageView` | Rendered markdown with TOC |
| `SearchBar` | Global search with keyboard shortcut |
| `SearchResults` | Paginated search results with snippets |
| `GraphView` | D3 force-directed graph |
| `SourceUploader` | Drag-and-drop file upload |
| `LintReport` | Issue cards with fix actions |
| `SchemaEditor` | Monaco-based CLAUDE.md editor |
| `ThemeToggle` | Light/dark mode switcher |

### State Management

- **Server State**: React Query for API data fetching and caching
- **UI State**: React Context for local UI state (sidebar, modals)
- **Preferences**: localStorage for theme, layout preferences

---

## Testing Requirements

### Unit Tests

- **Core Operations**: Test ingest, query, lint, index functions in isolation
- **Schema Validation**: Test schema loading and page generation
- **QMD Integration**: Mock qmd store for unit tests
- **File Operations**: Test path validation, directory creation
- **API Handlers**: Test HTTP handlers with mocked services
- **React Components**: Test components with Testing Library
- **Target Coverage**: 80%+ line coverage

### Integration Tests

- **Full Ingest Flow**: Source → wiki page → index update → searchability
- **Query Flow**: Question → search → synthesis → answer
- **Lint Flow**: Wiki scan → contradiction detection → report
- **Git Integration**: File changes → git commit → rollback
- **API Integration**: HTTP requests → wiki operations → response

### End-to-End Tests

- **CLI Smoke Tests**: All commands execute without errors
- **Web UI Tests**: Playwright tests for critical user flows
- **Real QMD Test**: Full hybrid search with actual model inference
- **Agent Simulation**: Simulate agent interaction with MCP server

### Performance Tests

- **Search Latency**: Measure p50, p95, p99 over 1,000 pages
- **Ingest Throughput**: Sources/minute under load
- **Memory Profiling**: Baseline and peak memory usage
- **Web Load Tests**: Page load times under various conditions

---

## Deployment Requirements

### Environments

- **Development**: Local filesystem, hot reload
- **CI/CD**: GitHub Actions, automated tests on PR
- **Release**: npm package distribution

### Infrastructure

- **Single Command**: `llm-wiki server` starts web UI
- **Platform Support**: macOS, Linux, Windows (WSL)
- **Storage**: Local filesystem only
- **No Build Required**: Pre-bundled web assets served by server

### CI/CD

- **Test Pipeline**: Run tests on Node 22 and Bun
- **Type Check**: `tsc --noEmit` on every PR
- **Lint**: ESLint + Prettier enforcement
- **E2E Tests**: Playwright on every PR
- **Release**: Automated npm publish on tag

### Monitoring & Logging

- **Structured Logging**: JSON logs for machine parsing
- **Verbose Mode**: `-v` flag for detailed operation logs
- **Performance Metrics**: Optional telemetry for aggregate stats
- **Web Server Logs**: Request logging with timing

### Rollback Strategy

- **Git Revert**: Any wiki state can be reverted via `git revert` or `git checkout`
- **Source Isolation**: Bad wiki changes don't affect raw sources
- **Incremental Commits**: Each operation commits separately for surgical rollback

---

## Dependencies & Constraints

### External Dependencies

- **qmd**: Required for search functionality
- **Node.js >= 22**: Runtime requirement
- **Git**: For version control (typically pre-installed)

### Team Constraints

- **Initial Development**: Single developer
- **Open Source**: MIT license, community contributions welcome

### Time Constraints

- **MVP**: Core ingest/query/lint + web UI basic browse in 2 months
- **Full Feature Set**: Graph view, MCP server, advanced lint in 3 months

---

## Risks & Mitigation

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| QMD model inference too slow | High | Low | Async processing, caching, fallback to BM25-only |
| Schema drift over time | Medium | Medium | Automated schema validation, linting rules |
| Wiki becomes inconsistent | High | Medium | Atomic git commits, lint passes catch issues |
| Memory pressure with large wikis | Medium | Medium | Lazy loading, collection sharding |
| WebSocket reconnection issues | Low | Medium | Auto-reconnect with exponential backoff |
| D3 graph performance with many nodes | Medium | Low | Pagination, level-of-detail rendering |

### Resource Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| QMD models don't download | High | Low | Retry logic, manual download instructions |
| npm package conflicts | Low | Low | Pin dependencies, test on clean environments |

### Timeline Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| QMD API changes | Medium | Low | Pin qmd version, test against release candidate |
| TypeScript strict mode issues | Low | Medium | Incremental adoption, opt-in strictness |
| Web frontend complexity | Medium | Medium | Use proven libraries, keep it simple |

---

## Appendix: Directory Structure

```
llm-wiki/
├── packages/
│   ├── core/                # Shared types and wiki operations
│   │   ├── src/
│   │   │   ├── types/       # TypeScript definitions
│   │   │   ├── core/        # Wiki operations (ingest, query, lint)
│   │   │   ├── qmd/        # QMD integration wrapper
│   │   │   ├── schema/     # Schema loading and enforcement
│   │   │   └── utils/      # Shared utilities
│   │   └── package.json
│   │
│   ├── cli/                 # Terminal interface
│   │   ├── src/
│   │   │   ├── commands/   # CLI command implementations
│   │   │   └── index.ts    # Entry point
│   │   └── package.json
│   │
│   ├── server/              # Hono API server
│   │   ├── src/
│   │   │   ├── routes/     # API route handlers
│   │   │   ├── ws/         # WebSocket handlers
│   │   │   └── index.ts    # Entry point
│   │   ├── public/         # Bundled web assets
│   │   └── package.json
│   │
│   └── web/                 # React frontend
│       ├── src/
│       │   ├── components/ # Reusable UI components
│       │   ├── pages/     # Page components
│       │   ├── hooks/     # Custom React hooks
│       │   ├── api/       # API client
│       │   └── main.tsx   # Entry point
│       ├── public/
│       ├── package.json
│       └── vite.config.ts
│
├── wiki/                    # Generated wiki (created on init)
│   ├── raw/                 # Immutable source documents
│   ├── index.md             # Content catalog
│   ├── log.md               # Chronological log
│   ├── CLAUDE.md            # Schema for LLM agents
│   └── [pages]/             # Wiki pages by type
│
├── package.json             # Workspace root
├── tsconfig.json            # Root TypeScript config
├── turbo.json               # Turborepo config
└── README.md
```
