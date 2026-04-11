import type { QMDStoreWrapper } from './store.js';
import type { SearchResult, PageType } from '../types/index.js';

/**
 * Re-export SearchResult from types
 */
export type { SearchResult };

/**
 * Hybrid search result with additional metadata
 */
export interface HybridSearchResult extends SearchResult {
  /** BM25 score if available */
  bm25Score?: number;
  /** Vector score if available */
  vectorScore?: number;
}

/**
 * Search function options
 */
export interface WikiSearchOptions {
  /** Collections to search (defaults to wiki) */
  collections?: string[];
  /** Include raw sources in search */
  includeRaw?: boolean;
  /** Skip re-ranking for faster results */
  fastMode?: boolean;
  /** Include explanation of scoring */
  explain?: boolean;
  /** Limit number of results */
  limit?: number;
  /** Minimum score threshold */
  minScore?: number;
  /** Filter by page type */
  pageType?: PageType;
}

/**
 * Create a search function bound to a QMD store
 */
export function createSearchFunction(wrapper: QMDStoreWrapper) {
  return async function search(
    query: string,
    options: WikiSearchOptions = {}
  ): Promise<SearchResult[]> {
    const { getStore, getWikiCollection, getRawCollection } = wrapper;
    const store = getStore();

    // Determine which collections to search
    let collections = options.collections;
    if (!collections) {
      collections = options.includeRaw
        ? [getWikiCollection(), getRawCollection()]
        : [getWikiCollection()];
    }

    // Build search options
    const searchOptions: Record<string, unknown> = {
      query,
      collections,
      limit: options.limit ?? 10,
      minScore: options.minScore ?? 0,
    };

    // Execute search
    const rawResults = await store.search(searchOptions);

    // Transform and filter results
    const results: SearchResult[] = rawResults
      .map((result: any) => transformResult(result, wrapper))
      .filter((result: SearchResult) => {
        // Filter by page type if specified
        if (options.pageType) {
          return result.pageType === options.pageType;
        }
        return true;
      });

    return results;
  };
}

/**
 * Create a hybrid search function that combines BM25 and vector search
 */
export function createHybridSearch(wrapper: QMDStoreWrapper) {
  return async function hybridSearch(
    query: string,
    options: WikiSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const { getStore, getWikiCollection, getRawCollection } = wrapper;
    const store = getStore();

    // Determine collection
    let collection = options.collections?.[0];
    if (!collection) {
      collection = options.includeRaw
        ? getWikiCollection()
        : getWikiCollection();
    }

    // Execute parallel searches using singular 'collection' for QMD API
    const [lexResults, vecResults] = await Promise.all([
      store.searchLex(query, { collection, limit: options.limit ?? 30 }),
      store.searchVector(query, { collection, limit: options.limit ?? 30 }),
    ]);

    // Apply RRF fusion
    const fusedResults = fuseWithRRF(lexResults, vecResults, 60);

    // Filter by minimum score
    const minScore = options.minScore ?? 0;
    const filteredResults = fusedResults.filter((r) => r.score >= minScore);

    // Limit results
    const limit = options.limit ?? 10;
    return filteredResults.slice(0, limit);
  };
}

/**
 * Fuse search results using Reciprocal Rank Fusion
 * @param k - RRF parameter (default 60)
 */
function fuseWithRRF(
  lexResults: any[],
  vecResults: any[],
  k: number = 60
): HybridSearchResult[] {
  const scoreMap = new Map<string, HybridSearchResult>();

  // Process BM25 results
  lexResults.forEach((result, index) => {
    const docId = result.docId;
    const rrfScore = 1 / (k + index + 1);
    const existing = scoreMap.get(docId);
    
    if (existing) {
      existing.score += rrfScore;
      existing.bm25Score = result.score;
    } else {
      scoreMap.set(docId, {
        docId,
        score: rrfScore,
        bm25Score: result.score,
        content: result.content,
        title: result.title,
        slug: result.path,
        pageType: undefined,
      });
    }
  });

  // Process vector results
  vecResults.forEach((result, index) => {
    const docId = result.docId;
    const rrfScore = 1 / (k + index + 1);
    const existing = scoreMap.get(docId);
    
    if (existing) {
      existing.score += rrfScore;
      existing.vectorScore = result.score;
    } else {
      scoreMap.set(docId, {
        docId,
        score: rrfScore,
        vectorScore: result.score,
        content: result.content,
        title: result.title,
        slug: result.path,
        pageType: undefined,
      });
    }
  });

  // Sort by fused score
  return Array.from(scoreMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * Transform QMD search result to wiki SearchResult
 */
function transformResult(result: any, _wrapper: QMDStoreWrapper): SearchResult {
  const { path, title, content, score, docId } = result;

  // Determine page type from path
  let pageType: PageType | undefined;
  if (path) {
    if (path.startsWith('entity/') || path.startsWith('entity\\')) {
      pageType = 'entity';
    } else if (path.startsWith('source/') || path.startsWith('source\\')) {
      pageType = 'source';
    } else if (path.startsWith('summary/') || path.startsWith('summary\\')) {
      pageType = 'summary';
    } else if (path.startsWith('comparison/') || path.startsWith('comparison\\')) {
      pageType = 'comparison';
    } else if (path.startsWith('synthesis/') || path.startsWith('synthesis\\')) {
      pageType = 'synthesis';
    }
  }

  // Extract slug from path
  const slug = path ? path.replace(/\.md$/, '') : undefined;

  return {
    docId,
    score,
    content,
    title,
    slug,
    pageType,
  };
}
