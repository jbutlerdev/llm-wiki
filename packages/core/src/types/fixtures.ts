/**
 * Mock fixtures for testing
 * @module @llm-wiki/core/types/fixtures
 */

import type {
  WikiPage,
  SourceDocument,
  LogEntry,
  LintReport,
  WikiConfig,
  SearchResult,
  PageMeta,
  PageType,
  SourceType,
  LogType,
  LintIssue,
  CoverageGap,
} from './index.js';

/**
 * Generate a random ID
 */
function randomId(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate a random checksum (MD5-style hex)
 */
function randomChecksum(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Convert a slug to a title (e.g., 'test-page' -> 'Test Page')
 */
function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Options for creating a WikiPage
 */
export interface WikiPageOptions {
  slug?: string;
  title?: string;
  type?: PageType;
  content?: string;
  frontmatter?: Partial<PageMeta>;
  docId?: string;
  lastModified?: Date;
  createdAt?: Date;
}

/**
 * Create a WikiPage with default values
 */
export function createWikiPage(options: WikiPageOptions = {}): WikiPage {
  const slug = options.slug ?? `test-page-${randomId()}`;
  const now = new Date();

  return {
    slug,
    title: options.title ?? slugToTitle(slug),
    type: options.type ?? 'entity',
    content: options.content ?? `# ${options.title ?? slugToTitle(slug)}`,
    frontmatter: {
      tags: [],
      sources: [],
      relatedPages: [],
      ...options.frontmatter,
    },
    docId: options.docId,
    lastModified: options.lastModified ?? now,
    createdAt: options.createdAt ?? now,
  };
}

/**
 * Options for creating a PageMeta
 */
export interface PageMetaOptions {
  tags?: string[];
  sources?: string[];
  relatedPages?: string[];
  summary?: string;
}

/**
 * Create PageMeta with default values
 */
export function createPageMeta(options: PageMetaOptions = {}): PageMeta {
  return {
    tags: options.tags ?? [],
    sources: options.sources ?? [],
    relatedPages: options.relatedPages ?? [],
    summary: options.summary,
  };
}

/**
 * Options for creating a SourceDocument
 */
export interface SourceDocumentOptions {
  path?: string;
  type?: SourceType;
  title?: string;
  content?: string;
  url?: string;
  ingestedAt?: Date;
  checksum?: string;
}

/**
 * Create a SourceDocument with default values
 */
export function createSourceDocument(
  options: SourceDocumentOptions = {}
): SourceDocument {
  const type = options.type ?? 'markdown';
  const path = options.path ?? `raw/test-${randomId()}.md`;
  // Default title is "Test Document" for most cases
  const defaultTitle = options.title ?? 'Test Document';
  const defaultContent = options.content ?? `# ${defaultTitle}\n\nThis is test content for the source document.`;

  return {
    path,
    type,
    title: defaultTitle,
    content: defaultContent,
    ingestedAt: options.ingestedAt ?? new Date(),
    url: options.url,
    checksum: options.checksum ?? randomChecksum(),
  };
}

/**
 * Options for creating a LogEntry
 */
export interface LogEntryOptions {
  timestamp?: Date;
  type?: LogType;
  title?: string;
  details?: string;
  sources?: string[];
}

/**
 * Create a LogEntry with default values
 */
export function createLogEntry(options: LogEntryOptions = {}): LogEntry {
  return {
    timestamp: options.timestamp ?? new Date(),
    type: options.type ?? 'update',
    title: options.title ?? 'Operation completed',
    details: options.details,
    sources: options.sources,
  };
}

/**
 * Options for creating a LintReport
 */
export interface LintReportOptions {
  timestamp?: Date;
  issues?: LintIssue[];
}

/**
 * Create a LintReport with default values
 */
export function createLintReport(options: LintReportOptions = {}): LintReport {
  const issues = options.issues ?? [];
  const timestamp = options.timestamp ?? new Date();

  // Count issues by type
  const summary = {
    contradictions: issues.filter((i) => i.type === 'contradiction').length,
    orphans: issues.filter((i) => i.type === 'orphan').length,
    stale: issues.filter((i) => i.type === 'stale').length,
    coverage: issues.filter((i) => i.type === 'coverage').length,
  };

  // Also extract coverage gaps from coverage issues
  const coverageGaps: CoverageGap[] = issues
    .filter((i) => i.type === 'coverage')
    .map((i) => ({
      concept: i.pageId,
      description: i.message,
      suggestedPages: [],
    }));

  return {
    timestamp,
    issues,
    summary: {
      ...summary,
      coverage: coverageGaps,
    },
  };
}

/**
 * Options for creating a LintIssue
 */
export interface LintIssueOptions {
  type: LintIssue['type'];
  pageId: string;
  message: string;
  severity?: LintIssue['severity'];
}

/**
 * Create a LintIssue with default values
 */
export function createLintIssue(options: LintIssueOptions): LintIssue {
  return {
    type: options.type,
    pageId: options.pageId,
    message: options.message,
    severity: options.severity ?? 'warning',
  };
}

/**
 * Options for creating a WikiConfig
 */
export interface WikiConfigOptions {
  wikiDir?: string;
  rawDir?: string;
  qmdDir?: string;
  name?: string;
  description?: string;
  schemaPath?: string;
}

/**
 * Create a WikiConfig with default values
 */
export function createWikiConfig(options: WikiConfigOptions = {}): WikiConfig {
  const wikiDir = options.wikiDir ?? './wiki';

  return {
    wikiDir,
    rawDir: options.rawDir ?? `${wikiDir}/raw`,
    qmdDir: options.qmdDir ?? './.llm-wiki',
    name: options.name ?? 'LLM Wiki',
    description: options.description ?? '',
    schemaPath: options.schemaPath ?? `${wikiDir}/CLAUDE.md`,
  };
}

/**
 * Options for creating a SearchResult
 */
export interface SearchResultOptions {
  docId?: string;
  score?: number;
  content?: string;
  title?: string;
  slug?: string;
  pageType?: PageType;
}

/**
 * Create a SearchResult with default values
 */
export function createSearchResult(options: SearchResultOptions = {}): SearchResult {
  return {
    docId: options.docId ?? `doc-${randomId()}`,
    score: options.score ?? 0.5 + Math.random() * 0.5,
    content: options.content ?? 'This is a sample Result with searchable content.',
    title: options.title,
    slug: options.slug,
    pageType: options.pageType,
  };
}

/**
 * Create multiple WikiPages for testing
 */
export function createWikiPages(count: number, baseOptions: Partial<WikiPageOptions> = {}): WikiPage[] {
  return Array.from({ length: count }, (_, i) =>
    createWikiPage({
      ...baseOptions,
      slug: `${baseOptions.slug ?? 'page'}-${i + 1}`,
    })
  );
}

/**
 * Create multiple SourceDocuments for testing
 */
export function createSourceDocuments(count: number, baseOptions: Partial<SourceDocumentOptions> = {}): SourceDocument[] {
  return Array.from({ length: count }, (_, i) =>
    createSourceDocument({
      ...baseOptions,
      path: `raw/document-${i + 1}.md`,
    })
  );
}
