/**
 * Summary page update functionality for source ingestion - Phase 4
 * @module @llm-wiki/core/source/summary-update
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import type { WikiPage, PageType, PageMeta, LintSeverity } from '../types/index.js';
import type { IngestContext } from './ingest.js';

/**
 * Detected contradiction
 */
export interface Contradiction {
  type: 'contradiction';
  existingClaim: string;
  newClaim: string;
  severity: LintSeverity;
  reason: string;
}

/**
 * Result of updateSummaryPages operation
 */
export interface UpdateSummaryResult {
  summaryFound: boolean;
  synthesisUpdated: boolean;
  updatedSummaries: string[];
  contradictions: Contradiction[];
  keyThemes: string[];
  suggestedLinks: string[];
  errors: string[];
}

/**
 * Type directories mapping
 */
const TYPE_DIRS: Record<PageType, string> = {
  entity: 'entity',
  source: 'source',
  summary: 'summary',
  comparison: 'comparison',
  synthesis: 'synthesis',
};

/**
 * Words that indicate contradiction patterns
 */
const NEGATION_WORDS = [
  'not', "n't", 'never', 'no', 'none', 'nothing', 'nobody', 'nowhere',
  'neither', 'cannot', 'impossible', 'failed', 'failure', 'false',
  'wrong', 'incorrect', 'denied', 'rejected', 'canceled', 'cancelled',
];

/**
 * Quantitative indicators for comparison
 */
const QUANTITATIVE_PATTERNS = [
  /\d+(?:\.\d+)?\s*(?:million|billion|trillion|percent|%|dollars?|years?|days?|hours?|minutes?)/gi,
  /increased|decreased| grew | shrank | expanded | contracted | doubled | tripled | halved/gi,
];

/**
 * Get all summary page slugs
 */
async function getSummarySlugs(wikiDir: string): Promise<string[]> {
  const summaryDir = join(wikiDir, 'wiki', 'summary');
  if (!existsSync(summaryDir)) {
    return [];
  }

  const files = await readdir(summaryDir);
  return files
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}

/**
 * Load summary page by slug
 */
async function loadSummaryPage(wikiDir: string, slug: string): Promise<WikiPage | null> {
  const summaryPath = join(wikiDir, 'wiki', 'summary', `${slug}.md`);
  if (!existsSync(summaryPath)) {
    return null;
  }

  const content = await readFile(summaryPath, 'utf-8');
  const { data, content: body } = matter(content);

  return {
    slug,
    title: data.title ?? slug,
    type: data.type ?? 'summary',
    content: body,
    frontmatter: {
      tags: data.tags ?? [],
      sources: data.sources ?? [],
      relatedPages: data.relatedPages ?? [],
      summary: data.summary,
    },
    docId: data.docId,
    lastModified: data.lastModified ? new Date(data.lastModified) : new Date(),
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
  };
}

/**
 * Update summary page with new source
 */
async function updateSummaryPage(
  wikiDir: string,
  slug: string,
  sourceChecksum: string,
  additionalContent?: string
): Promise<boolean> {
  const page = await loadSummaryPage(wikiDir, slug);
  if (!page) {
    return false;
  }

  // Add source if not already present
  if (!page.frontmatter.sources.includes(sourceChecksum)) {
    page.frontmatter.sources.push(sourceChecksum);
  }

  // If there's additional content to merge, append it to the content
  if (additionalContent) {
    // Extract key points from new content
    const keyPoints = extractKeyPoints(additionalContent);
    
    if (keyPoints.length > 0) {
      // Append new key points section
      page.content += '\n\n## New Information\n\n';
      for (const point of keyPoints) {
        page.content += `- ${point}\n`;
      }
    }
  }

  // Write updated page
  const summaryPath = join(wikiDir, 'wiki', 'summary', `${slug}.md`);
  const meta = {
    title: page.title,
    type: page.type,
    tags: page.frontmatter.tags,
    sources: page.frontmatter.sources,
    relatedPages: page.frontmatter.relatedPages,
    ...(page.frontmatter.summary && { summary: page.frontmatter.summary }),
    lastModified: new Date().toISOString(),
    createdAt: page.createdAt instanceof Date ? page.createdAt.toISOString() : page.createdAt,
  };

  const fileContent = matter.stringify(page.content, meta);
  await writeFile(summaryPath, fileContent);

  return true;
}

/**
 * Extract key points from content
 */
function extractKeyPoints(content: string): string[] {
  const keyPoints: string[] = [];
  
  // Split into sentences
  const sentences = content
    .replace(/^#{1,6}\s+/gm, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200);

  // Take first few significant sentences as key points
  for (const sentence of sentences.slice(0, 5)) {
    // Skip if it's mostly numbers or too short
    if (sentence.split(' ').length < 5) continue;
    keyPoints.push(sentence);
  }

  return keyPoints;
}

/**
 * Extract key themes/topics from content
 */
function extractKeyThemes(content: string): string[] {
  const themes: Set<string> = new Set();

  // Known topic patterns
  const topicPatterns: [RegExp, string][] = [
    [/machine\s*learning|deep\s*learning|neural\s*network|model\s*training/g, 'machine-learning'],
    [/natural\s*language\s*processing|nlp|chatbot|language\s*model/g, 'nlp'],
    [/computer\s*vision|image\s*recognition|object\s*detection/g, 'computer-vision'],
    [/reinforcement\s*learning|reward|policy/g, 'reinforcement-learning'],
    [/data\s*science|analytics|data\s*analysis/g, 'data-science'],
    [/cloud\s*computing|aws|azure|gcp|cloud\s*platform/g, 'cloud-computing'],
    [/web\s*development|frontend|backend|full-stack/g, 'web-development'],
    [/mobile\s*development|ios|android|app/g, 'mobile-development'],
    [/security|cybersecurity|penetration\s*testing|vulnerability/g, 'security'],
    [/blockchain|cryptocurrency|web3|nft/g, 'blockchain'],
    [/robotics|autonomous|drone|sensor/g, 'robotics'],
    [/iot|internet\s*of\s*things|smart\s*device/g, 'iot'],
  ];

  const lowerContent = content.toLowerCase();

  for (const [pattern, theme] of topicPatterns) {
    if (pattern.test(lowerContent)) {
      themes.add(theme);
    }
  }

  // Extract capitalized multi-word concepts
  const conceptPattern = /\b([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)+)\b/g;
  let match;
  while ((match = conceptPattern.exec(content)) !== null) {
    const concept = match[1].trim();
    if (concept.length > 5 && !['The', 'This', 'That', 'These', 'Those'].includes(concept)) {
      themes.add(concept.toLowerCase().replace(/\s+/g, '-'));
    }
  }

  return Array.from(themes).slice(0, 5);
}

/**
 * Detect contradictions between existing and new content
 */
export function detectContradictions(
  existingContent: string,
  newContent: string
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  if (!existingContent || !newContent) {
    return contradictions;
  }

  const lowerExisting = existingContent.toLowerCase();
  const lowerNew = newContent.toLowerCase();

  // Check for negation patterns
  const existingHasNegation = NEGATION_WORDS.some(word => lowerExisting.includes(word));
  const newHasNegation = NEGATION_WORDS.some(word => lowerNew.includes(word));

  // If one is negated and the other is positive about the same subject
  if (existingHasNegation !== newHasNegation) {
    // Extract the main subject from each
    const existingSubject = extractMainSubject(existingContent);
    const newSubject = extractMainSubject(newContent);

    if (existingSubject && newSubject && subjectsOverlap(existingSubject, newSubject)) {
      contradictions.push({
        type: 'contradiction',
        existingClaim: existingContent.slice(0, 100),
        newClaim: newContent.slice(0, 100),
        severity: 'warning',
        reason: 'One statement contains negation while the other does not, indicating potential contradiction',
      });
    }
  }

  // Check for quantitative contradictions
  for (const pattern of QUANTITATIVE_PATTERNS) {
    const existingQuantities = existingContent.match(pattern) || [];
    const newQuantities = newContent.match(pattern) || [];

    if (existingQuantities.length > 0 && newQuantities.length > 0) {
      // Check if they're talking about similar metrics
      const existingFirst = existingQuantities[0]!;
      const newFirst = newQuantities[0]!;
      const existingMetric = extractMetricType(existingFirst);
      const newMetric = extractMetricType(newFirst);

      if (existingMetric === newMetric) {
        // Extract numbers for comparison
        const existingNum = extractNumber(existingFirst);
        const newNum = extractNumber(newFirst);

        if (existingNum !== null && newNum !== null) {
          // Check for direction change
          const existingPositive = /increased|grew|expanded|doubled|positive|growth/i.test(existingContent);
          const newPositive = /increased|grew|expanded|doubled|positive|growth/i.test(newContent);

          if (existingPositive !== newPositive) {
            contradictions.push({
              type: 'contradiction',
              existingClaim: existingContent.slice(0, 100),
              newClaim: newContent.slice(0, 100),
              severity: 'warning',
              reason: `Quantitative trend appears to have changed direction (${existingQuantities[0]} vs ${newQuantities[0]})`,
            });
          }
        }
      }
    }
  }

  // Check for specific known contradictions
  const contradictionPairs: [string, string][] = [
    ['true', 'false'],
    ['success', 'fail'],
    ['possible', 'impossible'],
    ['all', 'none'],
    ['always', 'never'],
  ];

  for (const [term1, term2] of contradictionPairs) {
    if (
      (lowerExisting.includes(term1) && lowerNew.includes(term2)) ||
      (lowerExisting.includes(term2) && lowerNew.includes(term1))
    ) {
      contradictions.push({
        type: 'contradiction',
        existingClaim: existingContent.slice(0, 100),
        newClaim: newContent.slice(0, 100),
        severity: 'warning',
        reason: `Contains contradictory terms: "${term1}" vs "${term2}"`,
      });
      break; // Only report one contradiction per pair
    }
  }

  return contradictions;
}

/**
 * Extract main subject from a sentence
 */
function extractMainSubject(content: string): string | null {
  // Remove common sentence starters
  const cleaned = content
    .replace(/^(the|a|an|this|that|these|those)\s+/i, '')
    .replace(/^(it|he|she|they|we|i)\s+/i, '')
    .trim();

  // Get first significant noun phrase (simplified)
  const words = cleaned.split(/\s+/);
  return words.slice(0, 3).join(' ') || null;
}

/**
 * Check if two subjects likely refer to the same thing
 */
function subjectsOverlap(subject1: string, subject2: string): boolean {
  const words1 = new Set(subject1.toLowerCase().split(/\s+/));
  const words2 = new Set(subject2.toLowerCase().split(/\s+/));

  // Check for common words
  for (const word of words1) {
    if (words2.has(word) && word.length > 3) {
      return true;
    }
  }

  return false;
}

/**
 * Extract the metric type from a quantity string
 */
function extractMetricType(quantity: string): string | null {
  const metricPatterns: [RegExp, string][] = [
    [/\d+\s*(million|billion|trillion)/i, 'population'],
    [/\d+\s*%/i, 'percentage'],
    [/\d+\s*dollars?/i, 'currency'],
    [/\d+\s*years?/i, 'time'],
    [/\d+\s*days?/i, 'time'],
    [/\d+\s*hours?/i, 'time'],
    [/\d+\s*(users?|customers?|people|users)/i, 'count'],
  ];

  for (const [pattern, metric] of metricPatterns) {
    if (pattern.test(quantity)) {
      return metric;
    }
  }

  return null;
}

/**
 * Extract number from a quantity string
 */
function extractNumber(quantity: string): number | null {
  const match = quantity.match(/[\d,]+(?:\.\d+)?/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  return null;
}

/**
 * Suggest links to related pages based on content
 */
async function suggestRelatedLinks(
  wikiDir: string,
  content: string
): Promise<string[]> {
  const suggestions: string[] = [];

  // Get all entity pages
  const entityDir = join(wikiDir, 'wiki', 'entity');
  if (!existsSync(entityDir)) {
    return suggestions;
  }

  const files = await readdir(entityDir);
  const lowerContent = content.toLowerCase();

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const slug = file.replace(/\.md$/, '');
    const pageContent = await readFile(join(entityDir, file), 'utf-8');
    const { data } = matter(pageContent);

    // Check if entity title appears in content
    const title = (data.title ?? slug).toLowerCase();
    if (lowerContent.includes(title) || lowerContent.includes(slug.replace(/-/g, ' '))) {
      suggestions.push(slug);
    }
  }

  return suggestions.slice(0, 5);
}

/**
 * Update summary pages when a source is ingested
 * 
 * This function:
 * 1. Finds existing summary pages
 * 2. Detects contradictions between new content and existing summaries
 * 3. Merges new information into summaries
 * 4. Identifies key themes and suggests related links
 */
export async function updateSummaryPages(
  context: IngestContext,
  sourceContent: string,
  sourceChecksum: string
): Promise<UpdateSummaryResult> {
  const result: UpdateSummaryResult = {
    summaryFound: false,
    synthesisUpdated: false,
    updatedSummaries: [],
    contradictions: [],
    keyThemes: [],
    suggestedLinks: [],
    errors: [],
  };

  try {
    // Find summary pages
    const summarySlugs = await getSummarySlugs(context.wikiDir);

    if (summarySlugs.length === 0) {
      return result;
    }

    result.summaryFound = true;

    // Extract key themes from new content
    result.keyThemes = extractKeyThemes(sourceContent);

    // Check for contradictions with each summary page
    for (const slug of summarySlugs) {
      try {
        const page = await loadSummaryPage(context.wikiDir, slug);
        if (page) {
          // Detect contradictions
          const contradictions = detectContradictions(page.content, sourceContent);
          result.contradictions.push(...contradictions);

          // Update the summary page
          const updated = await updateSummaryPage(
            context.wikiDir,
            slug,
            sourceChecksum,
            sourceContent
          );

          if (updated) {
            result.updatedSummaries.push(slug);
            result.synthesisUpdated = true;
          }

          // Get suggested related links
          const links = await suggestRelatedLinks(context.wikiDir, sourceContent);
          result.suggestedLinks.push(...links);
        }
      } catch (error) {
        result.errors.push(`Failed to update ${slug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Dedupe and limit suggestions
    result.suggestedLinks = [...new Set(result.suggestedLinks)].slice(0, 5);

  } catch (error) {
    result.errors.push(`Summary update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Create a new wiki page for summary (helper function)
 */
export interface CreateEntityPageOptions {
  wikiDir: string;
  slug: string;
  title: string;
  type: PageType;
  content: string;
  frontmatter: Partial<PageMeta>;
  docId?: string;
}

export interface CreateEntityPageResult {
  success: boolean;
  page?: WikiPage;
  pagePath?: string;
  error?: string;
}

/**
 * Create a new summary wiki page
 */
export async function createEntityPage(options: CreateEntityPageOptions): Promise<CreateEntityPageResult> {
  const { wikiDir, slug, title, type, content, frontmatter, docId } = options;

  // Check if page already exists
  const pageDir = join(wikiDir, 'wiki', TYPE_DIRS[type]);
  const pagePath = join(pageDir, `${slug}.md`);

  if (existsSync(pagePath)) {
    return {
      success: false,
      error: `Page '${slug}' already exists`,
    };
  }

  const now = new Date();
  const page: WikiPage = {
    slug,
    title,
    type,
    content,
    frontmatter: {
      tags: frontmatter.tags ?? [],
      sources: frontmatter.sources ?? [],
      relatedPages: frontmatter.relatedPages ?? [],
      summary: frontmatter.summary,
    },
    docId,
    lastModified: now,
    createdAt: now,
  };

  try {
    // Ensure directory exists
    await mkdir(pageDir, { recursive: true });

    // Serialize and write page
    const meta = {
      title,
      type,
      tags: page.frontmatter.tags,
      sources: page.frontmatter.sources,
      relatedPages: page.frontmatter.relatedPages,
      ...(page.frontmatter.summary && { summary: page.frontmatter.summary }),
      ...(docId && { docId }),
      lastModified: now.toISOString(),
      createdAt: now.toISOString(),
    };

    const fileContent = matter.stringify(content, meta);
    await writeFile(pagePath, fileContent);

    return {
      success: true,
      page,
      pagePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
