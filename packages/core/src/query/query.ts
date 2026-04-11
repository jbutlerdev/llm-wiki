/**
 * Query System - Process questions and synthesize answers
 * 
 * This module handles the query workflow:
 * 1. Process question with search
 * 2. Synthesize answer from results
 * 3. File answers back to wiki
 */

import type { WikiPage } from '../types/index.js';
import type { QMDStoreWrapper } from '../qmd/store.js';
import type { SearchResult } from '../qmd/search.js';
import { loadPage } from '../wiki/page.js';

/**
 * Query options for asking questions
 */
export interface QueryAskOptions {
  /** Maximum number of search results to consider */
  maxResults?: number;
  /** Minimum relevance score threshold */
  minScore?: number;
  /** Include raw sources in search */
  includeRaw?: boolean;
  /** Whether to file answer back to wiki */
  fileAnswer?: boolean;
}

/**
 * Synthesized answer result
 */
export interface SynthesizedAnswer {
  /** The synthesized answer */
  answer: string;
  /** Citations to source pages */
  citations: Citation[];
  /** Search results used */
  searchResults: SearchResult[];
  /** Whether answer was filed to wiki */
  filedToWiki?: string;
  /** Question that was answered */
  question: string;
}

/**
 * Citation to a wiki page
 */
export interface Citation {
  /** Page slug */
  slug: string;
  /** Page title */
  title: string;
  /** Snippet from the page */
  snippet: string;
  /** Whether this is a direct quote */
  isQuote?: boolean;
}

/**
 * Query result type
 */
interface QuerySearchResult {
  docId?: string;
  path?: string;
  title?: string;
  content?: string;
  score: number;
}

/**
 * Create a query function bound to a QMD store
 */
export function createQueryFunction(wrapper: QMDStoreWrapper) {
  return async function query(
    question: string,
    options: QueryAskOptions = {}
  ): Promise<SynthesizedAnswer> {
    const maxResults = options.maxResults ?? 5;
    const minScore = options.minScore ?? 0.1;
    const includeRaw = options.includeRaw ?? false;

    // Step 1: Process question with search
    const { getStore, getWikiCollection, getRawCollection } = wrapper;
    const store = getStore();

    // Expand query with related terms
    const expandedQuery = expandQuery(question);

    // Determine collections
    const collections = includeRaw
      ? [getWikiCollection(), getRawCollection()]
      : [getWikiCollection()];

    // Execute search
    const searchResults = await store.search({
      query: expandedQuery,
      collections,
      limit: maxResults * 2, // Get more results to filter
      minScore,
    }) as QuerySearchResult[];

    // Filter to top results
    const topResults = searchResults.slice(0, maxResults);

    // Step 2: Synthesize answer
    const citations: Citation[] = [];
    let answerParts: string[] = [];
    let citationIndex = 1;

    for (const result of topResults) {
      const snippet = extractRelevantSnippet(result.content || '', question);
      const slug = result.path?.replace(/\.md$/, '') || result.docId || 'unknown';
      
      citations.push({
        slug,
        title: result.title || slug,
        snippet,
        isQuote: false,
      });

      // Add to answer with citation
      answerParts.push(`[${citationIndex}] ${snippet}`);
      citationIndex++;
    }

    // Format citations
    const citationRefs = citations
      .map((c, i) => `[${i + 1}] ${c.title}: ${c.slug}`)
      .join('\n');

    const answer = `Based on the wiki:

${answerParts.join('\n\n')}

---
**Sources:**
${citationRefs}`;

    // Step 3: File answer if requested
    let filedToWiki: string | undefined;
    if (options.fileAnswer && answerParts.length > 0) {
      // Note: Filing to wiki requires additional context
      // This would typically be done by the caller with proper page creation
      filedToWiki = undefined;
    }

    // Return search results as part of QueryResult
    return {
      answer,
      citations,
      searchResults: topResults.map(r => ({
        docId: r.docId || '',
        score: r.score,
        content: r.content || '',
        title: r.title || '',
        slug: r.path?.replace(/\.md$/, '') || r.docId || '',
      })),
      filedToWiki,
      question,
    };
  };
}

/**
 * Expand query with related terms for better recall
 */
function expandQuery(query: string): string {
  // Remove common stop words
  const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'what', 'how', 'why', 'when', 'where', 'who', 'which'];
  const words = query.toLowerCase().split(/\s+/);
  const filtered = words.filter(w => !stopWords.includes(w) && w.length > 2);
  
  // Return expanded query (could be enhanced with synonyms)
  if (filtered.length === 0) {
    return query;
  }
  
  // Simple expansion: add key terms back
  return `${query} ${filtered.slice(0, 3).join(' ')}`;
}

/**
 * Extract relevant snippet from content based on query
 */
function extractRelevantSnippet(content: string, query: string): string {
  if (!content) {
    return 'No content available';
  }

  // Get query terms
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  // Find sentences containing query terms
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  
  let bestSentence = sentences[0] || content.slice(0, 200);
  let bestScore = 0;
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (lowerSentence.includes(term)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence;
    }
  }

  // Limit snippet length
  if (bestSentence.length > 300) {
    bestSentence = bestSentence.slice(0, 297) + '...';
  }

  return bestSentence;
}

/**
 * Synthesize a more detailed answer by reading actual pages
 */
export async function synthesizeDetailedAnswer(
  wikiDir: string,
  searchResults: SearchResult[],
  question: string
): Promise<{ answer: string; citations: Citation[] }> {
  const citations: Citation[] = [];
  const relevantContent: Array<{ page: WikiPage; relevantText: string }> = [];

  // Load actual pages from search results
  for (const result of searchResults.slice(0, 5)) {
    if (!result.slug) continue;
    
    try {
      const page = await loadPage(wikiDir, result.slug);
      if (!page) continue; // Skip if page not found
      
      const relevantText = extractRelevantSnippet(page.content, question);
      
      relevantContent.push({
        page,
        relevantText,
      });
      
      citations.push({
        slug: page.slug,
        title: page.title,
        snippet: relevantText,
      });
    } catch {
      // Skip pages that can't be loaded
      continue;
    }
  }

  // Generate answer from loaded content
  if (relevantContent.length === 0) {
    return {
      answer: 'No relevant pages found.',
      citations: [],
    };
  }

  // Format answer
  const answerParts = relevantContent.map(({ page, relevantText }, index) => {
    return `${index + 1}. **${page.title}**: ${relevantText}`;
  });

  const answer = `Based on the wiki:

${answerParts.join('\n\n')}

**Answer to your question:** This information was found in the pages listed above.`;

  return { answer, citations };
}

/**
 * Detect if an answer should be filed back to wiki
 * 
 * This is a heuristic - in practice, the user would confirm
 */
export function shouldFileAnswer(
  answer: string,
  citations: Citation[],
  searchResults: SearchResult[]
): { shouldFile: boolean; reason: string } {
  // Don't file very short answers
  if (answer.length < 100) {
    // Exception: if we have 3+ unique sources, still file
    const uniqueSlugs = new Set(citations.map(c => c.slug));
    if (uniqueSlugs.size >= 3) {
      return {
        shouldFile: true,
        reason: 'Answer synthesizes information from multiple pages.',
      };
    }
    return {
      shouldFile: false,
      reason: 'Answer is too short to be useful as a wiki page.',
    };
  }

  // File if we have good citations and reasonable answer length
  if (citations.length >= 2) {
    return {
      shouldFile: true,
      reason: 'Answer has multiple sources and is substantial enough to be useful.',
    };
  }

  return {
    shouldFile: false,
    reason: 'Answer may not be comprehensive enough to file.',
  };
}
