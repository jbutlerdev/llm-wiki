import { Type } from '@sinclair/typebox';
import { createHybridSearch } from '@llm-wiki/core';
import type { WikiDirProvider } from '../session/agent-session.js';
import type { HybridSearchResult } from '@llm-wiki/core';
import type { QMDStoreWrapper } from '@llm-wiki/core';

/**
 * Wiki search tool parameters
 */
export const wikiSearchParams = Type.Object({
  query: Type.String({
    description: 'The search query',
  }),
  limit: Type.Optional(Type.Number({
    description: 'Maximum number of results to return',
    default: 10,
  })),
  pageType: Type.Optional(Type.Union([
    Type.Literal('summary'),
    Type.Literal('entity'),
    Type.Literal('source'),
    Type.Literal('comparison'),
    Type.Literal('synthesis'),
  ], {
    description: 'Filter by page type',
  })),
  minScore: Type.Optional(Type.Number({
    description: 'Minimum relevance score threshold',
    default: 0,
  })),
});

export type WikiSearchParams = {
  query: string;
  limit?: number;
  pageType?: 'summary' | 'entity' | 'source' | 'comparison' | 'synthesis';
  minScore?: number;
};

/**
 * Create a wiki search function
 * 
 * Provides hybrid search functionality using QMD to search
 * wiki pages with BM25 + vector search and RRF fusion.
 */
export function createWikiSearchFunction(storeWrapper?: QMDStoreWrapper) {
  return async function search(
    query: string,
    options?: { limit?: number; pageType?: string; minScore?: number }
  ): Promise<HybridSearchResult[]> {
    if (!storeWrapper) {
      // Return empty results when QMD is not configured
      return [];
    }

    const searchFn = createHybridSearch(storeWrapper);
    return searchFn(query, {
      limit: options?.limit ?? 10,
      pageType: options?.pageType as any,
      minScore: options?.minScore ?? 0,
    });
  };
}

/**
 * Execute wiki search
 */
export async function executeWikiSearch(
  wikiDirProvider: WikiDirProvider,
  params: WikiSearchParams,
  storeWrapper?: QMDStoreWrapper
): Promise<{ content: { type: 'text'; text: string }[]; details: Record<string, unknown> }> {
  const { query, limit = 10, pageType, minScore = 0 } = params;

  try {
    const searchFn = createWikiSearchFunction(storeWrapper);
    const results = await searchFn(query, { limit, pageType, minScore });

    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No results found for query.',
        }],
        details: { query, count: 0 },
      };
    }

    // Format results
    const formattedResults = results.map((result, index) => {
      const pageTypeLabel = result.pageType ? ` [${result.pageType}]` : '';
      const scoreInfo = result.bm25Score !== undefined || result.vectorScore !== undefined
        ? ` (BM25: ${result.bm25Score?.toFixed(2) ?? 'N/A'}, Vec: ${result.vectorScore?.toFixed(2) ?? 'N/A'})`
        : ` (Score: ${result.score.toFixed(2)})`;
      
      const snippet = result.content
        ? truncateText(result.content, 200)
        : 'No preview available';

      return `${index + 1}. **${result.title}${pageTypeLabel}**${scoreInfo}
   Path: \`${result.slug || 'unknown'}\`
   ${snippet}`;
    }).join('\n\n');

    const summary = `Found ${results.length} result(s) for "${query}":\n\n${formattedResults}`;

    return {
      content: [{
        type: 'text',
        text: summary,
      }],
      details: {
        query,
        count: results.length,
        results: results.map(r => ({
          title: r.title,
          slug: r.slug,
          score: r.score,
          pageType: r.pageType,
        })),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Search error: ${errorMessage}`,
      }],
      details: { error: errorMessage },
    };
  }
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  const cleaned = text
    .replace(/[#*`_~[\]]/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return cleaned.slice(0, maxLength - 3) + '...';
}
