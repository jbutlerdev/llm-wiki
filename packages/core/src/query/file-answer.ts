/**
 * File Answer - Create wiki pages from query answers
 * 
 * This module handles filing good answers back to the wiki
 */

import type { WikiPage, PageMeta } from '../types/index.js';
import type { Citation } from './query.js';
import { createPage } from '../wiki/page.js';
import { appendLog } from '../wiki/log.js';
import { addPageToIndex } from '../wiki/index-page.js';

/**
 * File answer options
 */
export interface FileAnswerOptions {
  /** Title for the answer page */
  title?: string;
  /** Tags to add to the page */
  tags?: string[];
  /** Whether to include citations in the page */
  includeCitations?: boolean;
  /** Related pages to link */
  relatedPages?: string[];
}

/**
 * Result of filing an answer
 */
export interface FileAnswerResult {
  /** Created page */
  page: WikiPage;
  /** Slug of created page */
  slug: string;
  /** Title of created page */
  title: string;
}

/**
 * Generate a title from a question
 */
function generateTitle(question: string): string {
  // Clean up the question
  let title = question
    .replace(/^(what|how|why|when|where|who|which|is|are|was|were)/i, '')
    .trim()
    .replace(/\?$/, '')
    .trim();

  // Capitalize first letter of each word
  title = title
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Limit length
  if (title.length > 60) {
    title = title.slice(0, 57) + '...';
  }

  // Add suffix if needed
  if (!title.toLowerCase().includes('question') && !title.toLowerCase().includes('answer')) {
    title = `${title} - Answer`;
  }

  return title || 'Answer';
}

/**
 * Generate slug from question
 */
function generateSlug(question: string): string {
  let slug = question
    .toLowerCase()
    .replace(/^(what|how|why|when|where|who|which|is|are|was|were)/i, '')
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);

  // Add timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36);
  slug = `${slug}-${timestamp}`;

  return slug;
}

/**
 * File an answer back to the wiki
 */
export async function fileAnswer(
  question: string,
  answer: string,
  citations: Citation[],
  wikiDir: string,
  options: FileAnswerOptions = {}
): Promise<FileAnswerResult> {
  // Generate title and slug
  const title = options.title || generateTitle(question);
  const slug = generateSlug(question);

  // Build page content
  let content = `# ${title}\n\n`;
  content += `**Question:** ${question}\n\n`;
  content += `## Answer\n\n${answer}\n\n`;

  // Add citations section
  if (options.includeCitations !== false && citations.length > 0) {
    content += `## Sources\n\n`;
    for (const citation of citations) {
      content += `- [[${citation.slug}|${citation.title}]]: ${citation.snippet}\n`;
    }
    content += '\n';
  }

  // Add footer
  content += `---\n`;
  content += `*This answer was generated from wiki content on ${new Date().toISOString().split('T')[0]}*\n`;

  // Build frontmatter
  const frontmatter: PageMeta = {
    tags: options.tags || ['answer', 'question', 'generated'],
    sources: citations.map(c => c.slug),
    relatedPages: options.relatedPages || citations.map(c => c.slug),
    summary: answer.slice(0, 200) + (answer.length > 200 ? '...' : ''),
  };

  // Create the page
  const result = await createPage({
    wikiDir,
    slug,
    title,
    type: 'synthesis',
    content,
    frontmatter,
  });

  // Update index
  try {
    await addPageToIndex(wikiDir, {
      slug,
      title,
      type: 'synthesis',
      frontmatter,
    });
  } catch {
    // Index update is best-effort
  }

  // Log the operation
  try {
    await appendLog(wikiDir, {
      type: 'query',
      title: `Filed answer: ${title}`,
      details: `Created from question: "${question.slice(0, 100)}"`,
      sources: citations.map(c => c.slug),
    });
  } catch {
    // Log append is best-effort
  }

  return {
    page: result.page!,
    slug,
    title,
  };
}

/**
 * Format answer for display with citations
 */
export function formatAnswerForDisplay(
  answer: string,
  citations: Citation[]
): string {
  let formatted = answer;

  // Add citations as numbered links
  if (citations.length > 0) {
    formatted += '\n\n---\n';
    formatted += '**Sources:**\n';
    for (let i = 0; i < citations.length; i++) {
      const citation = citations[i];
      formatted += `${i + 1}. [[${citation.slug}|${citation.title}]]\n`;
    }
  }

  return formatted;
}

/**
 * Parse a filed answer to extract question and sources
 */
export function parseFiledAnswer(page: WikiPage): {
  question: string | null;
  citations: Citation[];
} {
  // Try to extract question from content
  const questionMatch = page.content.match(/\*\*Question:\*\*\s*(.+?)(?:\n|$)/i);
  const question = questionMatch ? questionMatch[1].trim() : null;

  // Extract citations/sources
  const citations: Citation[] = [];
  const citationRegex = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
  let match;

  while ((match = citationRegex.exec(page.content)) !== null) {
    const slug = match[1];
    const title = match[2];
    citations.push({ slug, title, snippet: '' });
  }

  return { question, citations };
}
