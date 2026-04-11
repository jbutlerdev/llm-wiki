# LLM Wiki - Development Plan

## Overview

This plan follows Test-Driven Development (TDD) patterns. Each phase begins with failing tests and progresses through the Red-Green-Refactor cycle.

---

## Phase 0: Project Foundation

### Objective
Set up the monorepo structure, TypeScript configuration, testing infrastructure, and establish coding conventions.

### Deliverables
- Monorepo with Turborepo (packages/core, packages/cli, packages/server, packages/web)
- TypeScript strict mode configuration
- Vitest testing framework for all packages
- ESLint + Prettier configuration
- QMD package integrated into core
- Git hooks for pre-commit validation

### Estimated Duration
1 week

### Dependencies
None

### Tasks

- [x] **Initialize monorepo with Turborepo**
  - Create root package.json with workspaces
  - Configure turbo.json build pipeline
  - Set up shared tooling (tsconfig, eslint, prettier)

- [x] **Create packages/core**
  - Set up TypeScript package
  - Configure path aliases (@llm-wiki/core)
  - Add to workspace

- [x] **Create packages/cli**
  - Set up CLI package
  - Add command scaffolding
  - Add to workspace

- [x] **Create packages/server**
  - Set up Hono server package
  - Configure public directory for web assets
  - Add to workspace

- [x] **Create packages/web**
  - Set up React + Vite project
  - Configure Tailwind CSS
  - Add to workspace

- [x] **Configure Vitest for all packages**
  - Set up test environment (Node.js for core/cli/server)
  - Set up test environment (JS DOM for web)
  - Configure coverage reporting (v8)
  - Define test file naming convention (*.test.ts)

- [x] **Write failing tests for project setup**
  - Test that TypeScript compiles without errors across packages
  - Test that test framework runs in each package
  - Test that lint passes on all source files

- [x] **Initialize git repository with .gitignore**
  - Ignore node_modules/, dist/, .turbo/
  - Include wiki/ templates

---

## Phase 1: Core Data Models & Types

### Objective
Define TypeScript types for all core entities: WikiPage, SourceDocument, LogEntry, configuration schemas, API types.

### Deliverables
- Complete type definitions in packages/core/src/types/
- Zod schemas for runtime validation
- Mock fixtures for testing
- Shared API types for server/web communication

### Estimated Duration
3-5 days

### Dependencies
Phase 0

### Tasks (TDD Cycle)

- [x] **Write failing test: WikiPage type includes required fields**
  - Test slug, title, type, content, frontmatter, timestamps
  - Verify page type enum values

- [x] **Implement: WikiPage and PageMeta interfaces**
  - Define PageType union
  - Add optional docId for QMD integration

- [x] **Write failing test: SourceDocument validation**
  - Test path, type, title, ingestedAt, checksum
  - Test SourceType union values

- [x] **Implement: SourceDocument interface and Zod schema**
  - Add validation for checksum format
  - Ensure immutability semantics

- [x] **Write failing test: LogEntry parsing**
  - Test timestamp, type, title parsing
  - Test log format (## [YYYY-MM-DD] type | Title)

- [x] **Implement: LogEntry interface and parser**
  - Regex for parsing existing log entries
  - Serializer for new entries

- [x] **Write failing test: LintReport type**
  - Test LintIssue structure
  - Test issue types (contradiction, orphan, stale, coverage)

- [x] **Implement: LintReport and LintIssue interfaces**
  - Define issue severity levels
  - Add coverage gap type

- [x] **Write failing test: WikiConfig validation**
  - Test wiki directory path
  - Test raw directory path
  - Test QMD configuration

- [x] **Implement: WikiConfig interface and Zod schema**
  - Default values for optional fields
  - Path validation

- [ ] **Write failing test: API response types for server**
  - Test PageListResponse
  - Test SearchResponse
  - Test LintReportResponse

- [ ] **Implement: API types in shared location**
  - Make types available to both server and web packages
  - Export via packages/core

- [ ] **Refactor: Extract shared types to index.ts barrel export**
  - Re-export all types from packages/core
  - Ensure barrel exports work across packages

---

## Phase 2: Core Wiki Operations (packages/core)

### Objective
Implement file system operations for creating, reading, updating wiki pages and managing directory structure.

### Deliverables
- Page CRUD operations
- Directory initialization
- Path validation and safety checks
- Frontmatter parsing with gray-matter

### Estimated Duration
1 week

### Dependencies
Phase 1

### Tasks (TDD Cycle)

- [ ] **Write failing test: Initialize wiki directory structure**
  - Test raw/, wiki/ directories created
  - Test initial index.md created
  - Test CLAUDE.md schema template created

- [ ] **Implement: init function in core**
  - Create directory structure
  - Generate initial files from templates
  - Return success with created paths

- [ ] **Write failing test: Read existing wiki page**
  - Test loading page by slug
  - Test frontmatter parsing
  - Test content extraction

- [ ] **Implement: loadPage function**
  - Parse markdown file
  - Extract YAML frontmatter with gray-matter
  - Return WikiPage object

- [ ] **Write failing test: Create new wiki page**
  - Test page creation with all fields
  - Test frontmatter serialization
  - Test content formatting

- [ ] **Implement: createPage function**
  - Generate markdown with frontmatter
  - Write to correct directory based on type
  - Return created page

- [ ] **Write failing test: Update existing wiki page**
  - Test partial update (only changed fields)
  - Test full replacement
  - Test timestamp update

- [ ] **Implement: updatePage function**
  - Preserve existing frontmatter keys
  - Update modified fields
  - Touch lastModified timestamp

- [ ] **Write failing test: Path traversal protection**
  - Test that paths outside wiki/ are rejected
  - Test that hidden files (..) are blocked
  - Test absolute path rejection

- [ ] **Implement: validateWikiPath utility**
  - Resolve relative paths
  - Ensure within wiki directory
  - Throw on traversal attempts

- [ ] **Write failing test: List all wiki pages**
  - Test returning array of page metadata
  - Test filtering by page type
  - Test including orphan detection

- [ ] **Implement: listPages function**
  - Recursively find all .md files
  - Parse frontmatter for metadata
  - Return sorted by lastModified

---

## Phase 3: Schema System

### Objective
Implement the schema system that instructs the LLM how to maintain the wiki.

### Deliverables
- CLAUDE.md template generation
- Schema loading and parsing
- Convention validation
- Workflow step definitions

### Estimated Duration
4-5 days

### Dependencies
Phase 2

### Tasks (TDD Cycle)

- [ ] **Write failing test: Load CLAUDE.md schema**
  - Test file existence check
  - Test section extraction
  - Test workflow parsing

- [ ] **Implement: SchemaLoader class**
  - Load and cache schema
  - Extract workflow sections
  - Provide helper methods for schema access

- [ ] **Write failing test: Generate initial CLAUDE.md**
  - Test default schema template
  - Test customizable wiki name/description
  - Test workflow definitions

- [ ] **Implement: generateSchemaTemplate function**
  - Create CLAUDE.md with standard sections
  - Include ingest workflow
  - Include query workflow
  - Include lint workflow

- [ ] **Write failing test: Schema convention validation**
  - Test page naming conventions
  - Test frontmatter required fields
  - Test cross-reference format

- [ ] **Implement: SchemaValidator class**
  - Validate page against conventions
  - Report convention violations
  - Suggest corrections

- [ ] **Write failing test: Extract workflow steps from schema**
  - Test ingest workflow parsing
  - Test query workflow parsing
  - Test lint workflow parsing

- [ ] **Implement: WorkflowParser**
  - Parse numbered workflow steps
  - Extract expected actions
  - Return structured workflow definition

---

## Phase 4: Source Ingestion

### Objective
Implement the core ingest functionality that processes raw sources and updates the wiki.

### Deliverables
- Source file loading
- Content extraction and parsing
- Source summary generation
- Wiki page updates on ingest

### Estimated Duration
1-2 weeks

### Dependencies
Phase 3

### Tasks (TDD Cycle)

- [ ] **Write failing test: Load source document**
  - Test markdown file loading
  - Test URL fetching and conversion
  - Test raw text input

- [ ] **Implement: SourceLoader class**
  - Handle markdown files
  - Fetch and convert URLs (turndown)
  - Accept raw text strings

- [ ] **Write failing test: Generate source summary**
  - Test content analysis
  - Test key takeaway extraction
  - Test title generation

- [ ] **Implement: SourceSummarizer**
  - Analyze document content
  - Extract key entities
  - Generate structured summary

- [ ] **Write failing test: Create source page on ingest**
  - Test creating wiki/source/*.md
  - Test frontmatter with source metadata
  - Test linking to original source

- [ ] **Implement: createSourcePage function**
  - Generate source page from document
  - Add appropriate frontmatter
  - Store in wiki/source/ directory

- [ ] **Write failing test: Update entity pages on ingest**
  - Test finding related entity pages
  - Test updating relevant cross-references
  - Test adding new entity pages

- [ ] **Implement: updateRelatedEntities function**
  - Analyze source for entity mentions
  - Find existing entity pages
  - Update cross-references

- [ ] **Write failing test: Update summary pages on ingest**
  - Test synthesizing with existing summary
  - Test identifying contradictions
  - Test maintaining coherent overview

- [ ] **Implement: updateSummaryPages function**
  - Merge new information
  - Flag contradictions
  - Regenerate summary

- [ ] **Write failing test: Update index.md on ingest**
  - Test adding new page to index
  - Test updating page summaries
  - Test maintaining categorization

- [ ] **Implement: updateIndex function**
  - Parse current index
  - Add/update entry for new page
  - Maintain alphabetical/sorted order

- [ ] **Write failing test: Log ingest operation**
  - Test appending to log.md
  - Test consistent entry format
  - Test timestamp generation

- [ ] **Implement: logIngest function**
  - Generate log entry
  - Append to log.md
  - Format as ## [YYYY-MM-DD] ingest | Title

- [ ] **Write failing test: Ingest command integration**
  - Test full ingest flow with all steps
  - Test error recovery
  - Test idempotency (re-ingest same source)

- [ ] **Implement: ingest function (core)**
  - Orchestrate all ingest steps
  - Handle errors gracefully
  - Report changes made

---

## Phase 5: QMD Search Integration

### Objective
Integrate qmd as the built-in search engine for the wiki.

### Deliverables
- QMD store initialization and configuration
- Hybrid search command
- Automatic indexing on wiki changes

### Estimated Duration
1-2 weeks

### Dependencies
Phase 4

### Tasks (TDD Cycle)

- [ ] **Write failing test: Initialize QMD store for wiki**
  - Test store creation
  - Test collection configuration
  - Test wiki/ directory as collection

- [ ] **Implement: QMDStore wrapper class**
  - Create store with wiki collection
  - Configure glob patterns for wiki pages
  - Handle store lifecycle (open/close)

- [ ] **Write failing test: Index wiki pages to QMD**
  - Test indexing all wiki pages
  - Test incremental updates
  - Test tracking docIds

- [ ] **Implement: indexWiki function**
  - Scan wiki/ directory
  - Index all markdown files
  - Store docId mapping

- [ ] **Write failing test: Hybrid search with query expansion**
  - Test BM25 + vector combination
  - Test LLM re-ranking
  - Test result relevance scoring

- [ ] **Implement: search function**
  - Use qmd query pipeline
  - Return formatted results

- [ ] **Write failing test: Context system for collections**
  - Test adding context to wiki collection
  - Test path-level context
  - Test improving search relevance

- [ ] **Implement: context management**
  - Add context for wiki/root
  - Add context for wiki/source, wiki/entity, etc.
  - Expose via qmd context API

- [ ] **Write failing test: Auto-index on page update**
  - Test triggering re-index on createPage
  - Test triggering re-index on updatePage
  - Test batching for bulk operations

- [ ] **Implement: watchWikiChanges**
  - Integrate with createPage/updatePage
  - Debounce re-indexing
  - Track modified pages

---

## Phase 6: CLI Commands (packages/cli)

### Objective
Implement the terminal interface that exposes all core functionality.

### Deliverables
- CLI commands: init, ingest, query, search, lint, status
- Help text and documentation
- Error handling and user feedback

### Estimated Duration
1 week

### Dependencies
Phase 5

### Tasks (TDD Cycle)

- [ ] **Write failing test: Init command**
  - Test creating new wiki
  - Test with existing wiki (error)
  - Test custom directory

- [ ] **Implement: init command**
  - Import from core
  - Add user prompts
  - Generate initial files

- [ ] **Write failing test: Ingest command**
  - Test ingest single file
  - Test ingest URL
  - Test ingest directory

- [ ] **Implement: ingest command**
  - Parse arguments
  - Call core ingest
  - Format output

- [ ] **Write failing test: Search command**
  - Test basic search
  - Test with filters
  - Test JSON output

- [ ] **Implement: search command**
  - Parse arguments
  - Call core search
  - Format results

- [ ] **Write failing test: Lint command**
  - Test running lint
  - Test with --fix option
  - Test JSON output

- [ ] **Implement: lint command**
  - Parse arguments
  - Call lint functions
  - Format report

- [ ] **Write failing test: Status command**
  - Test wiki status output
  - Test QMD stats

- [ ] **Implement: status command**
  - Get wiki stats
  - Get QMD status
  - Format output

- [ ] **Write failing test: Help text and errors**
  - Test --help output
  - Test unknown command error
  - Test validation errors

- [ ] **Implement: CLI error handling**
  - Add help command
  - Add version command
  - Handle errors gracefully

---

## Phase 7: Server API (packages/server)

### Objective
Build the Hono-based HTTP API server that serves the web frontend and exposes wiki operations.

### Deliverables
- RESTful API for all wiki operations
- WebSocket for real-time updates
- Static file serving for web assets
- CORS configuration

### Estimated Duration
1-2 weeks

### Dependencies
Phase 6

### Tasks (TDD Cycle)

- [ ] **Write failing test: Server starts successfully**
  - Test server initialization
  - Test port binding
  - Test health endpoint

- [ ] **Implement: Server entry point**
  - Set up Hono app
  - Add health route
  - Configure CORS

- [ ] **Write failing test: Pages API**
  - Test GET /api/pages
  - Test GET /api/pages/:id
  - Test POST /api/pages

- [ ] **Implement: Pages routes**
  - GET all pages with filtering
  - GET single page by ID
  - POST create page
  - PUT update page
  - DELETE page

- [ ] **Write failing test: Sources API**
  - Test GET /api/sources
  - Test POST /api/sources/ingest

- [ ] **Implement: Sources routes**
  - GET all sources
  - POST ingest new source
  - GET source by ID

- [ ] **Write failing test: Search API**
  - Test GET /api/search
  - Test query parameters
  - Test response format

- [ ] **Implement: Search route**
  - GET search with qmd
  - Parse query and filters
  - Return formatted results

- [ ] **Write failing test: Lint API**
  - Test GET /api/lint
  - Test lint report format

- [ ] **Implement: Lint routes**
  - GET run lint and return report
  - GET lint history

- [ ] **Write failing test: Config API**
  - Test GET /api/config
  - Test PUT /api/config

- [ ] **Implement: Config routes**
  - GET wiki configuration
  - PUT update configuration

- [ ] **Write failing test: WebSocket updates**
  - Test connection established
  - Test message format
  - Test file change broadcasts

- [ ] **Implement: WebSocket handler**
  - Set up ws protocol
  - Broadcast wiki changes
  - Handle client connections

- [ ] **Write failing test: Static file serving**
  - Test serving index.html
  - Test serving JS/CSS bundles
  - Test 404 handling

- [ ] **Implement: Static file middleware**
  - Serve built web assets
  - SPA fallback for /app/* routes

---

## Phase 8: Web Frontend - Core UI (packages/web)

### Objective
Build the React web application with core pages and components.

### Deliverables
- Dashboard page
- Browse/List pages
- Page view with markdown rendering
- Sidebar navigation
- Global search overlay

### Estimated Duration
2 weeks

### Dependencies
Phase 7

### Tasks (TDD Cycle)

- [ ] **Write failing test: App routing**
  - Test React Router setup
  - Test route guards
  - Test 404 handling

- [ ] **Implement: App routing**
  - Set up React Router
  - Define route structure
  - Add layout wrapper

- [ ] **Write failing test: Sidebar component**
  - Test navigation tree
  - Test collapse/expand
  - Test active state

- [ ] **Implement: Sidebar component**
  - Fetch page tree from API
  - Render navigation
  - Add collapse state

- [ ] **Write failing test: Dashboard page**
  - Test stats cards
  - Test recent activity
  - Test lint summary

- [ ] **Implement: Dashboard page**
  - Fetch wiki status
  - Display stats
  - Show recent log entries

- [ ] **Write failing test: Browse page**
  - Test page list
  - Test filtering
  - Test pagination

- [ ] **Implement: Browse page**
  - Fetch pages from API
  - Add type/tag filters
  - Add sorting options

- [ ] **Write failing test: Page view**
  - Test markdown rendering
  - Test table of contents
  - Test backlinks display

- [ ] **Implement: Page view**
  - Fetch page by ID
  - Render markdown with react-markdown
  - Extract TOC from headings
  - Show backlinks

- [ ] **Write failing test: Search overlay**
  - Test Cmd+K trigger
  - Test search input
  - Test results display

- [ ] **Implement: Search overlay**
  - Add keyboard shortcut
  - Create modal component
  - Fetch and display results

- [ ] **Write failing test: Theme toggle**
  - Test light/dark switching
  - Test persistence

- [ ] **Implement: Theme toggle**
  - Add theme context
  - Persist to localStorage
  - Apply Tailwind dark mode

---

## Phase 9: Web Frontend - Advanced Features

### Objective
Build advanced web UI features: graph view, sources management, lint dashboard.

### Deliverables
- Interactive graph visualization (D3.js)
- Source management UI
- Lint dashboard with fix actions
- Settings/schema editor

### Estimated Duration
2 weeks

### Dependencies
Phase 8

### Tasks (TDD Cycle)

- [ ] **Write failing test: Graph page**
  - Test D3 force-directed graph
  - Test node clicking
  - Test zoom/pan

- [ ] **Implement: Graph page**
  - Fetch graph data from API
  - Render D3 force simulation
  - Add interactions

- [ ] **Write failing test: Sources page**
  - Test source list
  - Test upload component
  - Test URL import

- [ ] **Implement: Sources page**
  - Fetch sources from API
  - Add file upload
  - Add URL import form

- [ ] **Write failing test: Lint dashboard**
  - Test issue list
  - Test filtering by type
  - Test fix actions

- [ ] **Implement: Lint dashboard**
  - Fetch lint report
  - Display issues by severity
  - Add fix buttons

- [ ] **Write failing test: Settings page**
  - Test config display
  - Test schema editor

- [ ] **Implement: Settings page**
  - Display current config
  - Add schema editor
  - Add save functionality

- [ ] **Write failing test: Responsive design**
  - Test mobile sidebar
  - Test tablet layout
  - Test touch interactions

- [ ] **Implement: Responsive layouts**
  - Add mobile breakpoints
  - Implement hamburger menu
  - Improve touch targets

---

## Phase 10: Query System

### Objective
Implement the query workflow that answers questions against the wiki.

### Deliverables
- Question processing and search
- Answer synthesis
- Citation formatting
- Filing good answers back to wiki

### Estimated Duration
1 week

### Dependencies
Phase 5 (QMD), Phase 6 (CLI), Phase 7 (Server)

### Tasks (TDD Cycle)

- [ ] **Write failing test: Process question with search**
  - Test query expansion
  - Test hybrid search execution
  - Test result ranking

- [ ] **Implement: processQuestion function (core)**
  - Expand question with related terms
  - Execute hybrid search
  - Return ranked results

- [ ] **Write failing test: Synthesize answer from results**
  - Test reading relevant pages
  - Test combining information
  - Test citation generation

- [ ] **Implement: synthesizeAnswer function**
  - Read top-ranked wiki pages
  - Generate coherent answer
  - Add inline citations

- [ ] **Write failing test: CLI query command**
  - Test query command with question
  - Test output formatting

- [ ] **Implement: query command (CLI)**
  - Call processQuestion
  - Format answer with citations
  - Offer to file answer

- [ ] **Write failing test: Query API endpoint**
  - Test POST /api/query
  - Test response format

- [ ] **Implement: Query route (server)**
  - Accept question in body
  - Call core query functions
  - Return formatted answer

- [ ] **Write failing test: File answer back to wiki**
  - Test creating new wiki page from answer
  - Test CLI prompting user for confirmation

- [ ] **Implement: fileAnswer function**
  - Detect "good answer" candidates
  - Create wiki page from answer
  - Update index and log

---

## Phase 11: Lint System

### Objective
Implement wiki health checks and maintenance operations.

### Deliverables
- Contradiction detection
- Staleness checking
- Orphan detection
- Coverage analysis

### Estimated Duration
1 week

### Dependencies
Phase 2 (file operations), Phase 10 (query)

### Tasks (TDD Cycle)

- [ ] **Write failing test: Detect contradictions between pages**
  - Test extracting factual claims
  - Test comparing claims across pages
  - Test flagging conflicting information

- [ ] **Implement: contradictionDetector**
  - Parse factual claims from pages
  - Build claim index
  - Find conflicts

- [ ] **Write failing test: Check for stale information**
  - Test comparing source dates
  - Test identifying superseded claims
  - Test marking stale content

- [ ] **Implement: stalenessChecker**
  - Track source timestamps
  - Compare with wiki page dates
  - Flag potentially stale content

- [ ] **Write failing test: Find orphan pages**
  - Test building link graph
  - Test identifying pages with no inbound links
  - Test detecting dead ends

- [ ] **Implement: orphanDetector**
  - Parse [[wiki-links]] from pages
  - Build adjacency list
  - Find unlinked pages

- [ ] **Write failing test: Coverage analysis**
  - Test identifying under-covered concepts
  - Test suggesting missing cross-references
  - Test recommending new pages

- [ ] **Implement: coverageAnalyzer**
  - Analyze concept mentions
  - Compare with existing entity pages
  - Generate coverage report

- [ ] **Write failing test: Lint command integration**
  - Test running all checks
  - Test report generation
  - Test --fix option

- [ ] **Implement: lint command**
  - Run all lint operations
  - Generate markdown report
  - Offer automated fixes

---

## Phase 12: MCP Server

### Objective
Expose wiki operations as MCP tools for LLM agents.

### Deliverables
- MCP server implementation
- Wiki tools: search, get, ingest, status, log
- Configuration for Claude Desktop, Claude Code, etc.

### Estimated Duration
3-5 days

### Dependencies
Phase 10, Phase 11

### Tasks (TDD Cycle)

- [ ] **Write failing test: MCP server starts**
  - Test server initialization
  - Test tool registration
  - Test stdio communication

- [ ] **Implement: MCP server entry point**
  - Set up MCP protocol
  - Register wiki tools
  - Handle stdio transport

- [ ] **Write failing test: wiki_search tool**
  - Test search tool call
  - Test parameters
  - Test response format

- [ ] **Implement: wiki_search tool**
  - Expose search via MCP
  - Parse search parameters
  - Return formatted results

- [ ] **Write failing test: wiki_get tool**
  - Test get page by path
  - Test get by docid

- [ ] **Implement: wiki_get tool**
  - Expose page retrieval
  - Support path and docid lookup

- [ ] **Write failing test: wiki_ingest tool**
  - Test ingest source
  - Test file and URL sources

- [ ] **Implement: wiki_ingest tool**
  - Expose ingest via MCP
  - Support file and URL sources

- [ ] **Write failing test: wiki_status tool**
  - Test status output
  - Test stats formatting

- [ ] **Implement: wiki_status tool**
  - Expose wiki status
  - Return formatted stats

- [ ] **Write documentation: MCP configuration**
  - Document Claude Desktop config
  - Document Claude Code config
  - Document Pi/other agents

---

## Phase 13: Integration & Polish

### Objective
Polish the system, improve user experience, and ensure robustness.

### Deliverables
- File watching for hot-reload
- Git integration
- Performance optimizations
- Error handling improvements

### Estimated Duration
1 week

### Dependencies
Phase 12

### Tasks (TDD Cycle)

- [ ] **Write failing test: File watching for hot-reload**
  - Test chokidar watching wiki/
  - Test WebSocket broadcast on changes

- [ ] **Implement: File watcher**
  - Watch wiki directory
  - Broadcast changes via WebSocket
  - Debounce events

- [ ] **Write failing test: Git integration (CLI)**
  - Test git commit on changes
  - Test git diff output
  - Test rollback capability

- [ ] **Implement: Git integration**
  - Auto-commit on changes (optional)
  - Show pending changes
  - Support revert

- [ ] **Write failing test: Performance benchmarks**
  - Test search latency under load
  - Test page load times
  - Test memory usage

- [ ] **Implement: Performance optimizations**
  - Batch QMD operations
  - Cache schema parsing
  - Optimize React rendering

- [ ] **Write failing test: Error handling**
  - Test API error responses
  - Test CLI error formatting
  - Test web error boundaries

- [ ] **Implement: Error handling**
  - Add API error middleware
  - Improve CLI errors
  - Add React error boundaries

- [ ] **Write failing test: User documentation**
  - Test README examples work
  - Test command help output

- [ ] **Implement: Documentation**
  - Complete README with examples
  - Add command help text
  - Add web UI guide

---

## Phase 14: Testing & QA

### Objective
Comprehensive testing across all components and edge cases.

### Deliverables
- Integration test suite
- E2E test suite with Playwright
- Performance benchmarks
- Bug fixes from testing

### Estimated Duration
1 week

### Dependencies
Phase 13

### Tasks (TDD Cycle)

- [ ] **Write failing test: Full ingest flow integration**
  - Test source → wiki page → search → query
  - Test cross-reference updates
  - Test index synchronization

- [ ] **Implement: Integration tests**
  - Test complete workflows
  - Test error recovery
  - Test concurrent operations

- [ ] **Write failing test: API integration tests**
  - Test all endpoints
  - Test authentication
  - Test error responses

- [ ] **Implement: API integration tests**
  - Supertest for HTTP
  - Test all routes
  - Test edge cases

- [ ] **Write failing test: Web E2E tests (Playwright)**
  - Test browse pages
  - Test search
  - Test page view
  - Test graph view

- [ ] **Implement: Playwright E2E tests**
  - Set up Playwright
  - Write critical path tests
  - Run in CI

- [ ] **Write failing test: Performance regression tests**
  - Test search latency <500ms
  - Test web page load <1s

- [ ] **Implement: Performance tests**
  - Set up benchmarks
  - Add to CI
  - Document known limits

- [ ] **Fix: Bugs discovered during testing**
  - Triage issues by severity
  - Fix critical bugs first
  - Add regression tests

---

## Phase 15: Release & Launch

### Objective
Package for distribution, set up CI/CD, and publish.

### Deliverables
- npm packages published
- GitHub Actions CI/CD
- Release notes
- Version tagging

### Estimated Duration
2-3 days

### Dependencies
Phase 14

### Tasks

- [ ] **Finalize package.json metadata**
  - Add keywords, author, license
  - Verify scripts
  - Add funding info

- [ ] **Set up GitHub Actions CI**
  - Test on Node 22
  - Test on Bun
  - Run lint and type check
  - Run Playwright tests

- [ ] **Create release workflow**
  - Semantic version tagging
  - npm publish all packages
  - GitHub release creation

- [ ] **Write CHANGELOG.md**
  - Document all changes
  - Categorize by type
  - Include migration notes

- [ ] **Publish to npm**
  - Test install locally
  - Publish to npm
  - Verify packages work

- [ ] **Create GitHub repository**
  - Push code
  - Set up branch protection
  - Add issue templates

---

## Summary Timeline

| Phase | Name | Duration | Dependencies |
|-------|------|----------|--------------|
| 0 | Project Foundation | 1 week | - |
| 1 | Core Data Models & Types | 3-5 days | Phase 0 |
| 2 | Core Wiki Operations | 1 week | Phase 1 |
| 3 | Schema System | 4-5 days | Phase 2 |
| 4 | Source Ingestion | 1-2 weeks | Phase 3 |
| 5 | QMD Search Integration | 1-2 weeks | Phase 4 |
| 6 | CLI Commands | 1 week | Phase 5 |
| 7 | Server API | 1-2 weeks | Phase 6 |
| 8 | Web Frontend - Core UI | 2 weeks | Phase 7 |
| 9 | Web Frontend - Advanced | 2 weeks | Phase 8 |
| 10 | Query System | 1 week | Phase 5, 6, 7 |
| 11 | Lint System | 1 week | Phase 2, 10 |
| 12 | MCP Server | 3-5 days | Phase 10, 11 |
| 13 | Integration & Polish | 1 week | Phase 12 |
| 14 | Testing & QA | 1 week | Phase 13 |
| 15 | Release & Launch | 2-3 days | Phase 14 |

**Total Estimated Duration**: 14-18 weeks

---

## Running the Plan

1. **Review spec.md** and this plan together
2. **Begin Phase 0** - Set up monorepo structure
3. **Follow TDD cycle** for each phase:
   - Write failing test
   - Implement minimal code to pass
   - Refactor
4. **Proceed to next phase** after all tasks checked
5. **Phase 15** - Release when all previous phases complete
