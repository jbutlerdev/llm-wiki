/**
 * Wiki API client
 * 
 * Provides functions for interacting with the LLM Wiki backend API.
 */

const API_BASE = '/api';

interface Page {
  id: string;
  slug: string;
  title: string;
  type: 'summary' | 'entity' | 'source' | 'comparison' | 'synthesis';
  content: string;
  tags: string[];
  sources: string[];
  relatedPages: string[];
  summary?: string;
  lastModified: string;
  createdAt: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  snippet: string;
  score: number;
}

interface WikiStatus {
  wikiDir: string;
  pageCount: number;
  sourceCount: number;
  lastModified: string;
  lintSummary: {
    contradictions: number;
    orphans: number;
    stale: number;
  };
}

interface LintReport {
  timestamp: string;
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

interface CoverageGap {
  concept: string;
  suggestion: string;
}

interface Source {
  id: string;
  path: string;
  type: 'markdown' | 'url' | 'text';
  title: string;
  ingestedAt: string;
  url?: string;
}

interface AgentStatus {
  running: boolean;
  mode: 'interactive' | 'semi-autonomous' | 'autonomous';
  currentTask?: string;
  lastActivity?: string;
}

/**
 * Fetch with error handling
 */
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

// ===== Page Operations =====

export async function getPages(filters?: {
  type?: string;
  tags?: string[];
}): Promise<Page[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.tags) params.set('tags', filters.tags.join(','));
  
  const query = params.toString();
  return fetchApi<Page[]>(`/pages${query ? `?${query}` : ''}`);
}

export async function getPage(id: string): Promise<Page> {
  return fetchApi<Page>(`/pages/${encodeURIComponent(id)}`);
}

export async function getPageBySlug(type: string, slug: string): Promise<Page> {
  return fetchApi<Page>(`/pages/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`);
}

export async function createPage(page: Partial<Page>): Promise<Page> {
  return fetchApi<Page>('/pages', {
    method: 'POST',
    body: JSON.stringify(page),
  });
}

export async function updatePage(id: string, changes: Partial<Page>): Promise<Page> {
  return fetchApi<Page>(`/pages/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(changes),
  });
}

export async function deletePage(id: string): Promise<void> {
  await fetchApi(`/pages/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getBacklinks(id: string): Promise<Page[]> {
  return fetchApi<Page[]>(`/pages/${encodeURIComponent(id)}/backlinks`);
}

// ===== Search =====

export async function searchWiki(query: string, filters?: {
  type?: string;
  tags?: string[];
  limit?: number;
}): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (filters?.type) params.set('type', filters.type);
  if (filters?.tags) params.set('tags', filters.tags.join(','));
  if (filters?.limit) params.set('limit', String(filters.limit));
  
  return fetchApi<SearchResult[]>(`/search?${params.toString()}`);
}

// ===== Query =====

export interface QueryResponse {
  answer: string;
  citations: Array<{
    slug: string;
    title: string;
    snippet: string;
    isQuote?: boolean;
  }>;
  filedToWiki?: string;
}

export async function queryWiki(question: string, fileAnswer?: boolean): Promise<QueryResponse> {
  return fetchApi<QueryResponse>('/query', {
    method: 'POST',
    body: JSON.stringify({ question, fileAnswer }),
  });
}

export async function getGraphData(): Promise<{
  nodes: Array<{ id: string; title: string; type: string }>;
  edges: Array<{ source: string; target: string }>;
}> {
  return fetchApi('/search/graph');
}

// ===== Sources =====

export async function getSources(): Promise<Source[]> {
  return fetchApi<Source[]>('/sources');
}

export async function getSource(id: string): Promise<Source> {
  return fetchApi<Source>(`/sources/${encodeURIComponent(id)}`);
}

export async function ingestSource(source: {
  path?: string;
  url?: string;
  content?: string;
}): Promise<{ createdPages: string[] }> {
  return fetchApi('/sources/ingest', {
    method: 'POST',
    body: JSON.stringify(source),
  });
}

// ===== Lint =====

export async function runLint(): Promise<LintReport> {
  return fetchApi<LintReport>('/lint');
}

export async function getLintHistory(): Promise<LintReport[]> {
  return fetchApi<LintReport[]>('/lint/history');
}

// ===== Status =====

export async function getWikiStatus(): Promise<WikiStatus> {
  return fetchApi<WikiStatus>('/status');
}

export async function getConfig(): Promise<Record<string, unknown>> {
  return fetchApi('/config');
}

export async function updateConfig(config: Record<string, unknown>): Promise<void> {
  await fetchApi('/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

// ===== Log =====

export async function getLog(limit?: number): Promise<Array<{
  timestamp: string;
  type: string;
  title: string;
  details?: string;
}>> {
  const params = limit ? `?limit=${limit}` : '';
  return fetchApi(`/log${params}`);
}

// ===== Agent =====

export async function getAgentStatus(): Promise<AgentStatus> {
  return fetchApi<AgentStatus>('/agent/status');
}

export async function startAgent(): Promise<void> {
  await fetchApi('/agent/start', { method: 'POST' });
}

export async function stopAgent(): Promise<void> {
  await fetchApi('/agent/stop', { method: 'POST' });
}

export async function setAgentMode(mode: string): Promise<void> {
  await fetchApi('/agent/mode', {
    method: 'PUT',
    body: JSON.stringify({ mode }),
  });
}

export async function sendAgentCommand(command: string): Promise<string> {
  const result = await fetchApi<{ response: string }>('/agent/command', {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
  return result.response;
}

// ===== Agent Approvals =====

export interface ApprovalChange {
  type: 'create' | 'update' | 'delete';
  pageId?: string;
  title?: string;
  description: string;
}

export interface ApprovalRequest {
  id: string;
  requestedAt: string;
  changes: ApprovalChange[];
  reason?: string;
}

export async function getApprovals(): Promise<ApprovalRequest[]> {
  return fetchApi<ApprovalRequest[]>('/agent/approvals');
}

export async function respondToApproval(id: string, approved: boolean): Promise<void> {
  await fetchApi(`/agent/approvals/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ approved }),
  });
}

// ===== Re-export types =====

export type { Page, SearchResult, WikiStatus, LintReport, LintIssue, Source, AgentStatus };
