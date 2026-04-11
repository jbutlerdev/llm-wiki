import { Type } from '@sinclair/typebox';
import { listPages } from '@llm-wiki/core';
import type { WikiDirProvider } from '../session/agent-session.js';
import type { PageListFilter } from '@llm-wiki/core';

/**
 * Wiki list tool parameters
 */
export const wikiListParams = Type.Object({
  type: Type.Optional(Type.Union([
    Type.Literal('summary'),
    Type.Literal('entity'),
    Type.Literal('source'),
    Type.Literal('comparison'),
    Type.Literal('synthesis'),
  ], {
    description: 'Filter by page type',
  })),
  tags: Type.Optional(Type.Array(Type.String(), {
    description: 'Filter by tags (pages must have all specified tags)',
  })),
  limit: Type.Optional(Type.Number({
    description: 'Maximum number of pages to return',
    default: 50,
  })),
  offset: Type.Optional(Type.Number({
    description: 'Number of pages to skip',
    default: 0,
  })),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('lastModified'),
    Type.Literal('title'),
    Type.Literal('createdAt'),
  ], {
    description: 'Field to sort by',
    default: 'lastModified',
  })),
  sortOrder: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc'),
  ], {
    description: 'Sort order',
    default: 'desc',
  })),
});

export type WikiListParams = {
  type?: 'summary' | 'entity' | 'source' | 'comparison' | 'synthesis';
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'lastModified' | 'title' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

/**
 * Execute wiki list
 */
export async function executeWikiList(
  wikiDirProvider: WikiDirProvider,
  params: WikiListParams
): Promise<{ content: { type: 'text'; text: string }[]; details: Record<string, unknown>; isError?: boolean }> {
  const { type, tags, limit = 50, offset = 0, sortBy = 'lastModified', sortOrder = 'desc' } = params;
  const wikiDir = wikiDirProvider.getWikiDir();

  try {
    // Build filter options
    const filter: PageListFilter = {
      sortBy,
      sortOrder,
    };

    if (type) {
      filter.type = type;
    }

    if (tags && tags.length > 0) {
      filter.tags = tags;
    }

    // Get pages
    const allPages = await listPages(wikiDir, filter);

    // Apply offset and limit
    const pages = allPages.slice(offset, offset + limit);

    if (pages.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No pages found matching the criteria.',
        }],
        details: {
          total: allPages.length,
          pages: [],
          filter,
        },
      };
    }

    // Format output
    const parts: string[] = [];

    const totalText = allPages.length > limit
      ? `${pages.length} of ${allPages.length} pages`
      : `${pages.length} page${pages.length !== 1 ? 's' : ''}`;
    
    const filterDesc = buildFilterDescription(filter);
    parts.push(`## Wiki Pages (${totalText}${filterDesc ? ` - ${filterDesc}` : ''})`);

    // Group by type
    const byType = groupByType(pages);

    for (const [typeName, typePages] of Object.entries(byType)) {
      if (typePages.length === 0) continue;

      parts.push('');
      parts.push(`### ${typeName} (${typePages.length})`);
      
      for (const page of typePages) {
        const pageTags = page.frontmatter?.tags || [];
        const tagsStr = pageTags.length > 0
          ? ` [${pageTags.slice(0, 3).join(', ')}]`
          : '';
        
        const dateStr = page.lastModified?.toISOString().split('T')[0] || 'unknown';
        
        parts.push(`- **${page.title}**${tagsStr}`);
        parts.push(`  \`${page.slug}\` (${dateStr})`);
      }
    }

    // Add summary
    if (offset > 0 || allPages.length > limit) {
      parts.push('');
      parts.push(`_Showing ${offset + 1}-${offset + pages.length} of ${allPages.length} pages_`);
    }

    return {
      content: [{
        type: 'text',
        text: parts.join('\n'),
      }],
      details: {
        total: allPages.length,
        pages: pages.map(p => ({
          slug: p.slug,
          title: p.title,
          type: p.type,
          tags: p.frontmatter?.tags || [],
          lastModified: p.lastModified?.toISOString(),
        })),
        filter,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Error listing pages: ${errorMessage}`,
      }],
      details: { error: errorMessage },
      isError: true,
    };
  }
}

/**
 * Build a human-readable filter description
 */
function buildFilterDescription(filter: PageListFilter): string {
  const parts: string[] = [];

  if (filter.type) {
    parts.push(`type=${filter.type}`);
  }

  if (filter.tags && filter.tags.length > 0) {
    parts.push(`tags=[${filter.tags.join(', ')}]`);
  }

  if (filter.sortBy) {
    parts.push(`sort=${filter.sortBy}`);
  }

  return parts.join(', ');
}

/**
 * Group pages by type
 */
function groupByType(pages: any[]): Record<string, any[]> {
  const result: Record<string, any[]> = {
    summary: [],
    entity: [],
    source: [],
    comparison: [],
    synthesis: [],
  };

  for (const page of pages) {
    const type = page.type || 'unknown';
    if (result[type]) {
      result[type].push(page);
    } else {
      result[type] = [page];
    }
  }

  return result;
}
