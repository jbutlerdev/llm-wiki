/**
 * Core type definitions for LLM Wiki
 * @module @llm-wiki/core/types
 */

/**
 * Wiki page types
 */
export type PageType = 'summary' | 'entity' | 'source' | 'comparison' | 'synthesis';

/**
 * Source document types
 */
export type SourceType = 'markdown' | 'url' | 'text';

/**
 * Log entry types
 */
export type LogType = 'ingest' | 'query' | 'lint' | 'update';

/**
 * Lint issue types
 */
export type LintIssueType = 'contradiction' | 'orphan' | 'stale' | 'coverage';

/**
 * Lint issue severity levels
 */
export type LintSeverity = 'error' | 'warning' | 'info';

/**
 * Page metadata stored in YAML frontmatter
 */
export interface PageMeta {
  tags: string[];
  sources: string[];
  relatedPages: string[];
  summary?: string;
}

/**
 * Wiki page document
 */
export interface WikiPage {
  slug: string;
  title: string;
  type: PageType;
  content: string;
  frontmatter: PageMeta;
  docId?: string;
  lastModified: Date;
  createdAt: Date;
}

/**
 * Source document reference
 */
export interface SourceDocument {
  path: string;
  type: SourceType;
  title: string;
  ingestedAt: Date;
  url?: string;
  checksum: string;
}

/**
 * Log entry for wiki operations
 */
export interface LogEntry {
  timestamp: Date;
  type: LogType;
  title: string;
  details?: string;
  sources?: string[];
}

/**
 * Coverage gap recommendation
 */
export interface CoverageGap {
  concept: string;
  description: string;
  suggestedPages: string[];
}

/**
 * Individual lint issue
 */
export interface LintIssue {
  type: LintIssueType;
  pageId: string;
  message: string;
  severity: LintSeverity;
}

/**
 * Lint report summary
 */
export interface LintReport {
  timestamp: Date;
  issues: LintIssue[];
  summary: {
    contradictions: number;
    orphans: number;
    stale: number;
    coverage: CoverageGap[];
  };
}

/**
 * Wiki configuration
 */
export interface WikiConfig {
  wikiDir: string;
  rawDir: string;
  qmdDir: string;
  name: string;
  description: string;
  schemaPath: string;
}

/**
 * Search result from QMD
 */
export interface SearchResult {
  docId: string;
  score: number;
  content: string;
  title?: string;
  slug?: string;
  pageType?: PageType;
}

/**
 * Query options
 */
export interface QueryOptions {
  expand?: boolean;
  limit?: number;
  pageType?: PageType;
}

/**
 * Query result
 */
export interface QueryResult {
  question: string;
  answer: string;
  citations: Array<{
    pageId: string;
    snippet: string;
  }>;
  sources: string[];
}

/**
 * Ingest options
 */
export interface IngestOptions {
  title?: string;
  tags?: string[];
}

/**
 * Ingest result
 */
export interface IngestResult {
  source: SourceDocument;
  pagesCreated: string[];
  pagesUpdated: string[];
  logEntry: LogEntry;
}

/**
 * Lint options
 */
export interface LintOptions {
  fix?: boolean;
  types?: LintIssueType[];
}

/**
 * Search options
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  pageType?: PageType;
  tags?: string[];
}
