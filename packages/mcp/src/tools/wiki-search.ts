/**
 * Wiki Search Tool for MCP
 * 
 * Provides hybrid QMD search functionality as an MCP tool.
 */

import { createHybridSearch } from '@llm-wiki/core';
import type { WikiDirProvider } from '../types/index.js';
import type { QMDStoreWrapper, HybridSearchResult } from '@llm-wiki/core';

/**
 * Execute wiki search tool
 */
export async function executeWikiSearchTool(
  wikiDirProvider: WikiDirProvider,
  args: {
    query: string;
    limit?: number;
    pageType?: string;
    minScore?: number;
  },
  storeWrapper?: QMDStoreWrapper
): Promise<{ content: Array<{ type: 'text'; text: string }>; details?: Record<string, unknown>; isError?: boolean }> {
  const { query, limit = 10, pageType, minScore = 0 } = args;

  try {
    // If no QMD store, fall back to basic file search
    if (!storeWrapper) {
      return await basicFileSearch(wikiDirProvider, query, limit);
    }

    const searchFn = createHybridSearch(storeWrapper);
    const results = await searchFn(query, {
      limit,
      pageType: pageType as 'summary' | 'entity' | 'source' | 'comparison' | 'synthesis' | undefined,
      minScore,
    });

    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No results found for query: "${query}"`,
        }],
        details: { query, count: 0 },
      };
    }

    return formatSearchResults(query, results);
  } catch (error) {
    // Fall back to basic search on error
    try {
      return await basicFileSearch(wikiDirProvider, query, limit);
    } catch {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text',
          text: `Search error: ${errorMessage}`,
        }],
        details: { error: errorMessage },
        isError: true,
      };
    }
  }
}

/**
 * Basic file search fallback when QMD is not available
 */
async function basicFileSearch(
  wikiDirProvider: WikiDirProvider,
  query: string,
  limit: number
): Promise<{ content: Array<{ type: 'text'; text: string }>; details?: Record<string, unknown> }> {
  const wikiDir = wikiDirProvider.getWikiDir();
  const { glob } = await import('glob');
  const pathModule = await import('path');
  const fs = await import('fs');

  const pattern = pathModule.join(wikiDir, 'wiki', '**/*.md');
  const files = await glob(pattern, { ignore: ['**/node_modules/**'] });

  const results: Array<{ title: string; slug: string; content: string; path: string }> = [];
  const queryLower = query.toLowerCase();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check if query matches
    if (content.toLowerCase().includes(queryLower)) {
      const relativePath = pathModule.relative(wikiDir, file);
      const slug = relativePath
        .replace(/^wiki\//, '')
        .replace(/\.md$/, '')
        .replace(/\//g, '-');

      // Extract title from frontmatter or first heading
      const titleMatch = content.match(/^---\n[\s\S]*?title:\s*["']?(.+?)["']?\n/m) ||
                        content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : slug;

      results.push({
        title,
        slug,
        content: content.substring(0, 500),
        path: relativePath,
      });

      if (results.length >= limit) break;
    }
  }

  if (results.length === 0) {
    return {
      content: [{
        type: 'text',
        text: `No results found for query: "${query}"`,
      }],
      details: { query, count: 0 },
    };
  }

  const formattedResults = results.map((result, index) => {
    const snippet = result.content
      .replace(/^---[\s\S]*?---\n/, '')
      .replace(/[#*`_~[\]]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .substring(0, 200);

    return `${index + 1}. **${result.title}**
   Path: \`${result.slug}\`
   ${snippet}...`;
  }).join('\n\n');

  return {
    content: [{
      type: 'text',
      text: `Found ${results.length} result(s) for "${query}":\n\n${formattedResults}`,
    }],
    details: {
      query,
      count: results.length,
      results: results.map(r => ({
        title: r.title,
        slug: r.slug,
        path: r.path,
      })),
    },
  };
}

/**
 * Format search results for display
 */
function formatSearchResults(
  query: string,
  results: HybridSearchResult[]
): { content: Array<{ type: 'text'; text: string }>; details?: Record<string, unknown> } {
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

  return {
    content: [{
      type: 'text',
      text: `Found ${results.length} result(s) for "${query}":\n\n${formattedResults}`,
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
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  const cleaned = text
    .replace(/^---[\s\S]*?---\n/, '') // Remove frontmatter
    .replace(/[#*`_~[\]]/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return cleaned.slice(0, maxLength - 3) + '...';
}
