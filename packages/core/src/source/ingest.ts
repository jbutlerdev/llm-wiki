/**
 * Source ingestion orchestration
 * @module @llm-wiki/core/source/ingest
 */

import { mkdir, writeFile, readFile, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';
import type { SourceDocument, LogEntry, WikiPage } from '../types/index.js';
import { SourceLoader } from './loader.js';
import { SourceSummarizer } from './summarizer.js';
import { updateRelatedEntities } from './entity-update.js';
import { updateSummaryPages } from './summary-update.js';

export interface IngestContext {
  wikiDir: string;
  rawDir: string;
}

/**
 * Result of an ingest operation
 */
export interface IngestOperationResult {
  success: boolean;
  source?: SourceDocument;
  pagesCreated: string[];
  pagesUpdated: string[];
  logEntry?: LogEntry;
  error?: string;
  entityUpdate?: {
    entitiesFound: number;
    updatedPages: string[];
    suggestedEntities: Array<{ name: string; type: string; context: string }>;
  };
  summaryUpdate?: {
    summaryFound: boolean;
    synthesisUpdated: boolean;
    updatedSummaries: string[];
    contradictions: Array<{ type: string; existingClaim: string; newClaim: string; reason: string }>;
    keyThemes: string[];
    suggestedLinks: string[];
  };
}

/**
 * Main ingest function - orchestrates all ingestion steps
 */
export async function ingest(
  source: string,
  context: IngestContext,
  options: { title?: string; tags?: string[] } = {}
): Promise<IngestOperationResult> {
  const loader = new SourceLoader(context.rawDir);
  const summarizer = new SourceSummarizer();

  try {
    // Step 1: Load source document
    let sourceDoc: SourceDocument;
    try {
      sourceDoc = await loader.loadSource(source);
    } catch (error) {
      return {
        success: false,
        pagesCreated: [],
        pagesUpdated: [],
        error: `Failed to load source: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Override title if provided
    if (options.title) {
      sourceDoc.title = options.title;
    }

    // Step 2: Copy source to raw directory
    const rawPath = await saveToRaw(loader, sourceDoc, context.rawDir);

    // Step 3: Generate summary
    const summary = await summarizer.summarize(sourceDoc);

    // Step 4: Create source page
    const sourcePageSlug = sourceDoc.checksum;
    const sourcePage = await createSourcePage(
      context.wikiDir,
      sourcePageSlug,
      sourceDoc,
      summary,
      options.tags
    );

    if (!sourcePage.success) {
      return {
        success: false,
        pagesCreated: [],
        pagesUpdated: [],
        error: `Failed to create source page: ${sourcePage.error}`,
      };
    }

    // Step 5: Update index.md
    await updateIndex(context.wikiDir, sourcePage.page!);

    // Step 6: Update related entity pages
    const entityUpdateResult = await updateRelatedEntities(
      context,
      sourceDoc.content,
      sourceDoc.checksum
    );

    // Step 7: Update summary pages (and detect contradictions)
    const summaryUpdateResult = await updateSummaryPages(
      context,
      sourceDoc.content,
      sourceDoc.checksum
    );

    // Step 8: Log the ingest operation
    const logEntry = await logIngest(context.wikiDir, sourceDoc, [sourcePageSlug]);

    // Compile pages updated (entity + summary updates)
    const pagesUpdated = [
      ...entityUpdateResult.updatedPages,
      ...summaryUpdateResult.updatedSummaries,
    ];

    return {
      success: true,
      source: sourceDoc,
      pagesCreated: [sourcePageSlug],
      pagesUpdated,
      logEntry,
      entityUpdate: {
        entitiesFound: entityUpdateResult.entitiesFound,
        updatedPages: entityUpdateResult.updatedPages,
        suggestedEntities: entityUpdateResult.suggestedEntities,
      },
      summaryUpdate: {
        summaryFound: summaryUpdateResult.summaryFound,
        synthesisUpdated: summaryUpdateResult.synthesisUpdated,
        updatedSummaries: summaryUpdateResult.updatedSummaries,
        contradictions: summaryUpdateResult.contradictions,
        keyThemes: summaryUpdateResult.keyThemes,
        suggestedLinks: summaryUpdateResult.suggestedLinks,
      },
    };
  } catch (error) {
    return {
      success: false,
      pagesCreated: [],
      pagesUpdated: [],
      error: error instanceof Error ? error.message : 'Unknown error during ingestion',
    };
  }
}

/**
 * Save source document to raw directory
 */
async function saveToRaw(
  loader: SourceLoader,
  source: SourceDocument,
  rawDir: string
): Promise<string> {
  await mkdir(rawDir, { recursive: true });

  const filename = loader.generateStorageFilename(source);
  const rawPath = join(rawDir, filename);

  // For markdown files, copy the actual file
  if (source.type === 'markdown' && source.path) {
    await copyFile(source.path, rawPath);
  } else {
    // For text/url sources, create a new file
    await writeFile(rawPath, source.content);
  }

  return rawPath;
}

/**
 * Create a source page in the wiki
 */
async function createSourcePage(
  wikiDir: string,
  slug: string,
  source: SourceDocument,
  summary: { summary: string; entities: any[]; keyPoints: string[]; topics: string[]; tags: string[] },
  additionalTags?: string[]
): Promise<{ success: boolean; page?: WikiPage; error?: string }> {
  const sourceDir = join(wikiDir, 'wiki', 'source');
  await mkdir(sourceDir, { recursive: true });

  const now = new Date();
  const pagePath = join(sourceDir, `${slug}.md`);

  // Check if page already exists (idempotency)
  if (existsSync(pagePath)) {
    // Load existing page and update
    const existingContent = await readFile(pagePath, 'utf-8');
    const existing = matter(existingContent);
    
    interface PageFrontmatter {
      tags?: string[];
      sources?: string[];
      relatedPages?: string[];
      summary?: string;
      createdAt?: string;
      lastModified?: string;
    }
    const existingData = existing.data as PageFrontmatter;

    const updated: PageFrontmatter = {
      ...existingData,
      lastModified: now.toISOString(),
    };

    const updatedContent = matter.stringify(existing.content, updated);
    await writeFile(pagePath, updatedContent);

    return {
      success: true,
      page: {
        slug,
        title: source.title,
        type: 'source',
        content: existing.content,
        frontmatter: {
          tags: updated.tags || [],
          sources: updated.sources || [],
          relatedPages: updated.relatedPages || [],
          summary: updated.summary,
        },
        lastModified: now,
        createdAt: existingData.createdAt ? new Date(existingData.createdAt) : now,
      },
    };
  }

  // Create new source page
  const allTags = [...new Set([...(additionalTags || []), ...summary.tags, 'source'])];
  const meta = {
    title: source.title,
    type: 'source' as const,
    tags: allTags,
    sources: [source.path || 'text-input'],
    relatedPages: [] as string[],
    summary: summary.summary || undefined,
    ingestedAt: source.ingestedAt.toISOString(),
    lastModified: now.toISOString(),
    createdAt: now.toISOString(),
  };

  // Generate content with summary
  let content = `# ${source.title}\n\n`;
  
  if (summary.summary) {
    content += `${summary.summary}\n\n`;
  }

  if (summary.keyPoints.length > 0) {
    content += `## Key Points\n\n`;
    for (const point of summary.keyPoints) {
      content += `- ${point}\n`;
    }
    content += '\n';
  }

  if (source.type === 'url' && source.url) {
    content += `**Source:** ${source.url}\n\n`;
  }

  content += `---\n*Ingested from ${source.type}: ${source.path || 'text input'}*\n`;

  const fileContent = matter.stringify(content, meta);
  await writeFile(pagePath, fileContent);

  return {
    success: true,
    page: {
      slug,
      title: source.title,
      type: 'source',
      content,
      frontmatter: {
        tags: allTags,
        sources: meta.sources,
        relatedPages: [],
        summary: meta.summary,
      },
      lastModified: now,
      createdAt: now,
    },
  };
}

/**
 * Update the wiki index.md with new page reference
 */
async function updateIndex(wikiDir: string, page: WikiPage): Promise<void> {
  const indexPath = join(wikiDir, 'wiki', 'index.md');
  
  let indexContent = '';
  if (existsSync(indexPath)) {
    indexContent = await readFile(indexPath, 'utf-8');
  } else {
    indexContent = '# Index\n\nThis index catalogs all pages in the wiki.\n\n## Pages\n\n';
  }

  // Extract existing pages section
  const pagesSectionMatch = indexContent.match(/(## Pages\n\n)([\s\S]*?)(?=\n## |\n#|$)/);
  let pagesList = pagesSectionMatch ? pagesSectionMatch[2] : '';

  // Create new entry
  const entrySlug = page.type === 'source' ? page.slug : page.slug;
  const entryType = page.type;
  const entryTitle = page.title;
  const entrySummary = page.frontmatter.summary || '';
  const newEntry = `- [[${entrySlug}]] (${entryType}): ${entrySummary || entryTitle}\n`;

  // Check if entry already exists
  if (pagesList.includes(`[[${entrySlug}]]`)) {
    // Update existing entry - replace the line
    const existingPattern = new RegExp(`- \\[\\[${entrySlug}\\]\\].*?\n`, 'g');
    pagesList = pagesList.replace(existingPattern, newEntry);
  } else {
    // Add new entry (alphabetically if possible, or at end)
    pagesList += newEntry;
  }

  // Reconstruct index
  const newIndex = indexContent.replace(
    /(## Pages\n\n)([\s\S]*?)(?=\n## |\n#|$)/,
    `$1${pagesList}`
  );

  await writeFile(indexPath, newIndex);
}

/**
 * Log an ingest operation to log.md
 */
async function logIngest(
  wikiDir: string,
  source: SourceDocument,
  pagesCreated: string[]
): Promise<LogEntry> {
  const logPath = join(wikiDir, 'wiki', 'log.md');
  
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toISOString().slice(11, 19); // HH:MM:SS

  const entry: LogEntry = {
    timestamp: now,
    type: 'ingest',
    title: source.title,
    details: `Ingested ${source.type}${source.url ? ` from ${source.url}` : ''}. Created ${pagesCreated.length} page(s).`,
    sources: [source.path || 'text-input'],
  };

  // Create log entry line
  const logLine = `## [${dateStr}] ${entry.type} | ${entry.title}\n\n`;
  const logDetails = `**Time:** ${timeStr}\n`;
  const logSources = entry.sources ? `**Sources:** ${entry.sources.join(', ')}\n` : '';
  const logDesc = entry.details ? `${entry.details}\n` : '';
  const logEntryStr = logLine + logDetails + logSources + logDesc + '\n';

  // Append to log
  if (existsSync(logPath)) {
    const existingLog = await readFile(logPath, 'utf-8');
    await writeFile(logPath, existingLog + logEntryStr);
  } else {
    await writeFile(logPath, `# Log\n\nThis log tracks all wiki operations.\n\n${logEntryStr}`);
  }

  return entry;
}
