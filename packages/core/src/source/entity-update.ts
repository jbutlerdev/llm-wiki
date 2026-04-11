/**
 * Entity update functionality for source ingestion - Phase 4
 * @module @llm-wiki/core/source/entity-update
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import type { WikiPage, PageType, PageMeta } from '../types/index.js';
import type { IngestContext } from './ingest.js';

/**
 * Entity suggestion for new pages
 */
export interface EntitySuggestion {
  name: string;
  type: 'person' | 'organization' | 'location' | 'concept' | 'unknown';
  context: string;
}

/**
 * Result of updateRelatedEntities operation
 */
export interface UpdateEntitiesResult {
  entitiesFound: number;
  updatedPages: string[];
  suggestedEntities: EntitySuggestion[];
  errors: string[];
}

/**
 * Common words to exclude from entity extraction
 */
const COMMON_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
  'said', 'like', 'new', 'one', 'two', 'first', 'last', 'many', 'much',
  'some', 'any', 'other', 'every', 'another', 'such', 'well', 'even',
  'get', 'got', 'being', 'over', 'still', 'also', 'back', 'after',
  'use', 'two', 'way', 'well', 'made', 'find', 'year', 'take', 'know',
  'come', 'made', 'day', 'look', 'want', 'give', 'think', 'time',
]);

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
 * Get all page slugs from entity directory
 */
async function getEntitySlugs(wikiDir: string): Promise<string[]> {
  const entityDir = join(wikiDir, 'wiki', 'entity');
  if (!existsSync(entityDir)) {
    return [];
  }

  const files = await readdir(entityDir);
  return files
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}

/**
 * Load entity page by slug
 */
async function loadEntityPage(wikiDir: string, slug: string): Promise<WikiPage | null> {
  const entityPath = join(wikiDir, 'wiki', 'entity', `${slug}.md`);
  if (!existsSync(entityPath)) {
    return null;
  }

  const content = await readFile(entityPath, 'utf-8');
  const { data, content: body } = matter(content);

  return {
    slug,
    title: data.title ?? slug,
    type: data.type ?? 'entity',
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
 * Update entity page with new source reference
 */
async function updateEntitySources(
  wikiDir: string,
  slug: string,
  newSourceChecksum: string
): Promise<boolean> {
  const page = await loadEntityPage(wikiDir, slug);
  if (!page) {
    return false;
  }

  // Add source if not already present
  if (!page.frontmatter.sources.includes(newSourceChecksum)) {
    page.frontmatter.sources.push(newSourceChecksum);
  }

  // Write updated page
  const entityPath = join(wikiDir, 'wiki', 'entity', `${slug}.md`);
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
  await writeFile(entityPath, fileContent);

  return true;
}

/**
 * Convert entity name to kebab-case slug
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Extract potential entity mentions from content
 */
function extractPotentialEntities(content: string): string[] {
  const entities: Set<string> = new Set();

  // Pattern 1: Capitalized phrases that might be entities
  // Matches: "John Smith", "Apple Inc", "San Francisco", "Machine Learning"
  const capitalizedPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  let match;

  while ((match = capitalizedPattern.exec(content)) !== null) {
    const name = match[1].trim();
    
    // Skip short names and common words
    if (name.length < 3 || COMMON_WORDS.has(name.toLowerCase())) {
      continue;
    }

    // Skip if it's just a sentence start (first word after period or newline)
    const index = match.index;
    if (index > 0) {
      const prevChar = content[index - 1];
      if (prevChar === '.' || prevChar === '\n') {
        continue;
      }
    }

    // Skip markdown headers
    const beforeMatch = content.slice(Math.max(0, index - 2), index);
    if (beforeMatch.endsWith('#')) {
      continue;
    }

    entities.add(name);
  }

  // Pattern 2: CamelCase and PascalCase terms (like LangChain, GPT4, BERT)
  // Matches: "LangChain", "GPT4", "BERTModel", "OpenAIAssistant"
  const camelCasePattern = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+|\d+[A-Z][a-z]+|OpenAI|GPT-\d|API\s*Gateway)\b/g;
  while ((match = camelCasePattern.exec(content)) !== null) {
    const name = match[1].trim();
    if (name.length >= 4 && !COMMON_WORDS.has(name.toLowerCase())) {
      entities.add(name);
    }
  }

  // Pattern 3: Hyphenated lowercase terms that might be concepts
  const conceptPattern = /\b([a-z]+-[a-z]+(?:-[a-z]+)*)\b/g;
  while ((match = conceptPattern.exec(content)) !== null) {
    const term = match[1];
    if (term.length > 5 && !COMMON_WORDS.has(term.split('-')[0])) {
      entities.add(term);
    }
  }

  // Pattern 4: Standalone capital letters followed by numbers (like GPT-4)
  const acronymPattern = /\b([A-Z]{2,}(?:-?\d+)?)\b/g;
  while ((match = acronymPattern.exec(content)) !== null) {
    const term = match[1];
    if (term.length >= 2 && term.length <= 10) {
      entities.add(term);
    }
  }

  return Array.from(entities);
}

/**
 * Classify entity type based on context
 */
function classifyEntityType(name: string, content: string): 'person' | 'organization' | 'location' | 'concept' | 'unknown' {
  const lowerContent = content.toLowerCase();
  const lowerName = name.toLowerCase();

  // Check for organization indicators
  if (
    lowerContent.includes(`${lowerName} inc`) ||
    lowerContent.includes(`${lowerName} corp`) ||
    lowerContent.includes(`${lowerName} llc`) ||
    lowerContent.includes(`${lowerName} ltd`) ||
    lowerName.endsWith(' inc') ||
    lowerName.endsWith(' corp') ||
    lowerName.endsWith(' llc') ||
    lowerName.endsWith(' ltd') ||
    lowerName.includes('company') ||
    lowerName.includes('technologies') ||
    lowerName.includes(' labs')
  ) {
    return 'organization';
  }

  // Check for location indicators
  if (
    lowerContent.includes(`in ${lowerName}`) ||
    lowerContent.includes(`at ${lowerName}`) ||
    lowerContent.includes(`from ${lowerName}`) ||
    /city|town|country|state|county|region|island|river|mountain|ocean|sea|continent/i.test(name)
  ) {
    return 'location';
  }

  // Check for person indicators
  const personIndicators = ['mr', 'mrs', 'ms', 'dr', 'prof'];
  const contentBefore = content.slice(0, content.indexOf(name)).slice(-20);
  if (personIndicators.some(indicator => contentBefore.toLowerCase().includes(indicator))) {
    return 'person';
  }

  // Check if it looks like a concept/technology (hyphenated or known tech terms)
  if (name.includes('-') || /learning|network|system|framework|model|algorithm|api|cloud/i.test(name)) {
    return 'concept';
  }

  return 'unknown';
}

/**
 * Get context around entity mention
 */
function getEntityContext(content: string, entityName: string): string {
  const index = content.indexOf(entityName);
  if (index === -1) {
    return '';
  }

  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + entityName.length + 50);
  let context = content.slice(start, end);

  // Clean up context
  context = context.replace(/\n/g, ' ').trim();
  if (start > 0) context = '...' + context;
  if (end < content.length) context = context + '...';

  return context;
}

/**
 * Find matching entity pages for extracted entities
 */
async function findMatchingEntities(
  entities: string[],
  wikiDir: string
): Promise<{ matched: string[]; unmatched: string[] }> {
  const entitySlugs = await getEntitySlugs(wikiDir);
  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const entityName of entities) {
    const slug = nameToSlug(entityName);
    
    // Check if entity page exists (exact match)
    if (entitySlugs.includes(slug)) {
      matched.push(slug);
    } else {
      // Check for partial match
      const partialMatch = entitySlugs.find(
        existingSlug =>
          existingSlug.includes(slug) ||
          slug.includes(existingSlug)
      );
      
      if (partialMatch) {
        matched.push(partialMatch);
      } else {
        unmatched.push(entityName);
      }
    }
  }

  return { matched, unmatched };
}

/**
 * Update related entity pages when a source is ingested
 * 
 * This function:
 * 1. Extracts entity mentions from the source content
 * 2. Finds existing entity pages that match
 * 3. Updates those pages to reference the new source
 * 4. Suggests new entity pages for unmatched entities
 */
export async function updateRelatedEntities(
  context: IngestContext,
  sourceContent: string,
  sourceChecksum?: string
): Promise<UpdateEntitiesResult> {
  const result: UpdateEntitiesResult = {
    entitiesFound: 0,
    updatedPages: [],
    suggestedEntities: [],
    errors: [],
  };

  try {
    // Extract potential entities from content
    const extractedEntities = extractPotentialEntities(sourceContent);
    
    if (extractedEntities.length === 0) {
      return result;
    }

    result.entitiesFound = extractedEntities.length;

    // Find matching entity pages
    const { matched, unmatched } = await findMatchingEntities(
      extractedEntities,
      context.wikiDir
    );

    // Update matched entity pages
    for (const slug of matched) {
      try {
        if (sourceChecksum) {
          const updated = await updateEntitySources(context.wikiDir, slug, sourceChecksum);
          if (updated) {
            result.updatedPages.push(slug);
          }
        }
      } catch (error) {
        result.errors.push(`Failed to update ${slug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Suggest new entities for unmatched
    for (const entityName of unmatched) {
      result.suggestedEntities.push({
        name: entityName,
        type: classifyEntityType(entityName, sourceContent),
        context: getEntityContext(sourceContent, entityName),
      });
    }

    // Limit suggestions to avoid overwhelming
    result.suggestedEntities = result.suggestedEntities.slice(0, 10);

  } catch (error) {
    result.errors.push(`Entity update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Create a new wiki page for entity (helper function)
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
 * Create a new entity wiki page
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
