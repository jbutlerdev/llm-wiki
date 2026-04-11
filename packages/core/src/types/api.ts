/**
 * API response types for HTTP API (server) and web frontend
 * @module @llm-wiki/core/types/api
 */

import type {
  WikiPage,
  SourceDocument,
  SearchResult,
  LintReport,
  WikiConfig,
  LogEntry,
  PageType,
  QueryResult,
} from './index.js';

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Standard pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

// ============================================================================
// Page API Types
// ============================================================================

/**
 * Filters for page listing
 */
export interface PageFilters {
  type?: PageType;
  tags?: string[];
  search?: string;
}

/**
 * Response for GET /api/pages
 */
export interface PageListResponse {
  pages: Array<Omit<WikiPage, 'content'>>;
  total: number;
  page: number;
  pageSize: number;
  filters?: PageFilters;
}

/**
 * Response for GET /api/pages/:id
 */
export interface PageResponse {
  page: WikiPage;
  backlinks?: string[];
}

/**
 * Request to create a new page
 */
export interface CreatePageRequest {
  slug: string;
  title: string;
  type: PageType;
  content: string;
  frontmatter?: Partial<WikiPage['frontmatter']>;
}

/**
 * Request to update an existing page
 */
export interface UpdatePageRequest {
  title?: string;
  content?: string;
  frontmatter?: Partial<WikiPage['frontmatter']>;
}

// ============================================================================
// Source API Types
// ============================================================================

/**
 * Response for GET /api/sources
 */
export interface SourceListResponse {
  sources: SourceDocument[];
  total: number;
}

/**
 * Response for GET /api/sources/:id
 */
export interface SourceResponse {
  source: SourceDocument;
}

/**
 * Request to ingest a new source
 */
export interface IngestSourceRequest {
  type: 'file' | 'url' | 'text';
  /** For type=file: path to the file */
  path?: string;
  /** For type=url: URL to fetch */
  url?: string;
  /** For type=text: raw content */
  content?: string;
  /** Optional title override */
  title?: string;
  /** Optional tags */
  tags?: string[];
}

// ============================================================================
// Search API Types
// ============================================================================

/**
 * Search filters
 */
export interface SearchFilters {
  pageType?: PageType;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Response for GET /api/search
 */
export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  took: number; // milliseconds
  filters?: SearchFilters;
}

/**
 * Graph data for visualization
 */
export interface GraphNode {
  id: string;
  title: string;
  slug: string;
  type: PageType;
  linkCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ============================================================================
// Lint API Types
// ============================================================================

/**
 * Response for GET /api/lint
 */
export interface LintReportResponse {
  report: LintReport;
  fixed: number;
}

/**
 * Lint history entry
 */
export interface LintHistoryEntry {
  timestamp: Date;
  issueCount: number;
  fixedCount: number;
}

// ============================================================================
// System API Types
// ============================================================================

/**
 * Wiki statistics
 */
export interface WikiStats {
  name: string;
  pageCount: number;
  sourceCount: number;
  lastModified: Date;
}

/**
 * QMD index statistics
 */
export interface QmdStats {
  indexedDocuments: number;
  indexSize: number; // bytes
  lastIndexed: Date;
}

/**
 * Response for GET /api/status
 */
export interface StatusResponse {
  wiki: WikiStats;
  qmd: QmdStats;
}

/**
 * Fields that can be edited via API
 */
export type EditableConfigField = 'name' | 'description';

/**
 * Response for GET /api/config
 */
export interface ConfigResponse {
  config: WikiConfig;
  editableFields: EditableConfigField[];
}

/**
 * Request to update configuration
 */
export interface UpdateConfigRequest {
  name?: string;
  description?: string;
}

// ============================================================================
// Log API Types
// ============================================================================

/**
 * Response for GET /api/log
 */
export interface LogResponse {
  entries: LogEntry[];
  total: number;
}

// ============================================================================
// Agent API Types
// ============================================================================

/**
 * Agent running modes
 */
export type AgentMode = 'interactive' | 'semi-autonomous' | 'autonomous';

/**
 * Agent status information
 */
export interface AgentStatusResponse {
  running: boolean;
  mode: AgentMode;
  currentTask: string | null;
  lastActivity: Date;
}

/**
 * Request to change agent mode
 */
export interface SetAgentModeRequest {
  mode: AgentMode;
}

/**
 * Agent event types for SSE
 */
export type AgentEventType =
  | 'status_changed'
  | 'task_started'
  | 'task_completed'
  | 'error'
  | 'approval_needed'
  | 'message';

/**
 * Agent event payload
 */
export interface AgentEvent {
  type: AgentEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

/**
 * Pending approval for semi-autonomous mode
 */
export interface PendingApproval {
  id: string;
  type: 'create_page' | 'update_page' | 'delete_page' | 'ingest_source';
  title: string;
  description: string;
  changes?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Approval response
 */
export interface ApprovalResponse {
  approved: boolean;
  approvedBy?: 'user';
}

// ============================================================================
// Query API Types
// ============================================================================

/**
 * Request to query the wiki
 */
export interface QueryRequest {
  question: string;
  fileAnswer?: boolean;
  expand?: boolean;
}

/**
 * Response for query operations
 */
export interface QueryResponse {
  question: string;
  answer: string;
  citations: Array<{
    pageId: string;
    snippet: string;
  }>;
  sources: string[];
  filedToWiki?: string; // slug of filed answer page
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// ============================================================================
// Common HTTP Response Wrappers
// ============================================================================

/**
 * Success response wrapper
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/**
 * Union type for all API responses
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ============================================================================
// Type exports for convenience
// ============================================================================

export type {
  WikiPage,
  SourceDocument,
  SearchResult,
  LintReport,
  WikiConfig,
  LogEntry,
  PageType,
  QueryResult,
};
