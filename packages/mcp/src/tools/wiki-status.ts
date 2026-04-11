/**
 * Wiki Status Tool for MCP
 * 
 * Returns wiki health and statistics.
 */

import { listPages } from '@llm-wiki/core';
import type { WikiDirProvider } from '../types/index.js';

/**
 * Execute wiki status tool
 */

/**
 * Execute wiki status tool
 */
export async function executeWikiStatusTool(
  wikiDirProvider: WikiDirProvider
): Promise<{ content: Array<{ type: 'text'; text: string }>; details?: Record<string, unknown> }> {
  const wikiDir = wikiDirProvider.getWikiDir();

  try {
    const pages = await listPages(wikiDir);

    // Count pages by type
    const pagesByType: Record<string, number> = {};
    for (const page of pages) {
      const type = page.type || 'unknown';
      pagesByType[type] = (pagesByType[type] || 0) + 1;
    }

    // Count tags
    const allTags = new Set<string>();
    for (const page of pages) {
      if (page.frontmatter?.tags) {
        for (const tag of page.frontmatter.tags) {
          allTags.add(tag);
        }
      }
    }

    // Find recent pages
    const recentPages = [...pages]
      .sort((a, b) => {
        const dateA = a.lastModified?.getTime() || 0;
        const dateB = b.lastModified?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 5);

    const parts: string[] = [];

    parts.push(`# Wiki Status`);
    parts.push('');
    parts.push(`**Total Pages:** ${pages.length}`);
    parts.push('');
    parts.push('## Pages by Type');
    for (const [type, count] of Object.entries(pagesByType)) {
      parts.push(`  - ${type}: ${count}`);
    }

    parts.push('');
    parts.push(`**Total Tags:** ${allTags.size}`);

    if (recentPages.length > 0) {
      parts.push('');
      parts.push('## Recent Pages');
      for (const page of recentPages) {
        const date = page.lastModified 
          ? page.lastModified.toISOString().split('T')[0]
          : 'Unknown';
        parts.push(`  - [[${page.slug}]] (${date})`);
      }
    }

    // Add basic health info
    const orphanCount = pages.filter(p => 
      !p.frontmatter?.relatedPages || p.frontmatter.relatedPages.length === 0
    ).length;

    parts.push('');
    parts.push('## Health');
    parts.push(`  - Pages without links: ${orphanCount}`);
    parts.push(`  - Pages without tags: ${pages.filter(p => 
      !p.frontmatter?.tags || p.frontmatter.tags.length === 0
    ).length}`);

    return {
      content: [{
        type: 'text',
        text: parts.join('\n'),
      }],
      details: {
        totalPages: pages.length,
        pagesByType,
        totalTags: allTags.size,
        recentPages: recentPages.map(p => ({
          slug: p.slug,
          title: p.title,
          type: p.type,
          lastModified: p.lastModified?.toISOString(),
        })),
        orphanCount,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Status error: ${errorMessage}`,
      }],
      details: { error: errorMessage },
    };
  }
}
