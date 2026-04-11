/**
 * Wiki tools module
 * 
 * Provides agent tools for wiki operations:
 * - wiki_search: Hybrid QMD search
 * - wiki_ingest: Source ingestion
 * - wiki_query: Question answering
 * - wiki_status: Wiki health stats
 * - wiki_get: Get single page
 * - wiki_list: List pages
 */

// Search tool
export { createWikiSearchFunction, wikiSearchParams } from './wiki-search.js';
export type { WikiSearchParams } from './wiki-search.js';
export { executeWikiSearch } from './wiki-search.js';

// Ingest tool
export { wikiIngestParams, executeWikiIngest } from './wiki-ingest.js';
export type { WikiIngestParams } from './wiki-ingest.js';

// Query tool
export { wikiQueryParams, executeWikiQuery } from './wiki-query.js';
export type { WikiQueryParams } from './wiki-query.js';

// Status tool
export { wikiStatusParams, executeWikiStatus } from './wiki-status.js';
export type { WikiStatusParams } from './wiki-status.js';

// Get tool
export { wikiGetParams, executeWikiGet } from './wiki-get.js';
export type { WikiGetParams } from './wiki-get.js';

// List tool
export { wikiListParams, executeWikiList } from './wiki-list.js';
export type { WikiListParams } from './wiki-list.js';
