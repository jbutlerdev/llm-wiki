import { Type } from '@sinclair/typebox';
import { createHybridSearch } from '@llm-wiki/core';
import type { WikiDirProvider } from '../session/agent-session.js';
import type { HybridSearchResult } from '@llm-wiki/core';

/**
 * Wiki query tool parameters
 */
export const wikiQueryParams = Type.Object({
  question: Type.String({
    description: 'The question to answer',
  }),
  maxResults: Type.Optional(Type.Number({
    description: 'Maximum number of pages to search',
    default: 5,
  })),
  fileAnswer: Type.Optional(Type.Boolean({
    description: 'Whether to file the answer back to the wiki',
    default: false,
  })),
  tags: Type.Optional(Type.Array(Type.String(), {
    description: 'Filter by page tags',
  })),
});

export type WikiQueryParams = {
  question: string;
  maxResults?: number;
  fileAnswer?: boolean;
  tags?: string[];
};

/**
 * Execute wiki query
 */
export async function executeWikiQuery(
  wikiDirProvider: WikiDirProvider,
  params: WikiQueryParams
): Promise<{ content: { type: 'text'; text: string }[]; details: Record<string, unknown> }> {
  const { question, maxResults = 5, fileAnswer = false, tags } = params;

  try {
    // Search for relevant pages
    const searchResults = await createHybridSearch(
      {} as any
    )(question, { limit: maxResults });

    if (searchResults.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No relevant information found in the wiki for question: "${question}"\n\nConsider ingesting relevant sources or rephrasing the question.`,
        }],
        details: {
          question,
          searchResults: [],
          answer: null,
          fileAnswer,
        },
      };
    }

    // Format results as context for the LLM
    const contextParts = searchResults.map((result, index) => {
      const pageTypeLabel = result.pageType ? `[${result.pageType}]` : '';
      return `[${index + 1}] ${result.title} ${pageTypeLabel}
Path: ${result.slug || 'unknown'}
Content: ${truncateText(result.content || '', 500)}`;
    }).join('\n\n');

    const resultText = `## Question: ${question}

### Relevant Pages Found: ${searchResults.length}

${contextParts}

---

**Note:** The above context is provided for synthesis. The answer should be generated based on this information with proper citations to the source pages.

${fileAnswer ? '> This answer will be filed back to the wiki after review.' : ''}`;

    return {
      content: [{
        type: 'text',
        text: resultText,
      }],
      details: {
        question,
        searchResults: searchResults.map(r => ({
          title: r.title,
          slug: r.slug,
          score: r.score,
          pageType: r.pageType,
        })),
        answer: null,
        fileAnswer,
        tags,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Query error: ${errorMessage}`,
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
