/**
 * QMD Search Integration for LLM Wiki
 * 
 * This module provides integration with the QMD search engine for
 * hybrid BM25 + vector + re-ranking search capabilities.
 */

// Store operations
export { createQMDStore, type QMDStoreOptions, type QMDStoreWrapper, type QMDStoreStatus, type CollectionStats } from './store.js';

// Search operations
export { createSearchFunction, createHybridSearch, type WikiSearchOptions, type HybridSearchResult } from './search.js';

// Context management
export { createContextManager, type ContextEntry, CONTEXT_TEMPLATES } from './context.js';

// File watching and auto-indexing
export { createWikiWatcher, type WikiWatcher, type WikiWatcherOptions, type WatchEvent } from './watch.js';

// Indexing operations
export { createIndexer, type Indexer, type IndexProgress, type IndexResult, type EmbedResult, type ReindexResult } from './indexer.js';
