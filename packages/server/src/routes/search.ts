/**
 * Search API routes
 */

import { Hono } from 'hono';
import { getWikiDir } from '../index.js';
import type { PageType } from '@llm-wiki/core';

function createSuccessResponse<T>(data: T) {
  return { success: true, data };
}

function createErrorResponse(error: string, message: string, statusCode: number) {
  return {
    success: false,
    error: { error, message, statusCode },
  };
}

export function registerSearchRoutes(app: Hono) {
  // GET /api/search - Search the wiki
  app.get('/api/search', async (c) => {
    const wikiDir = getWikiDir();
    const query = c.req.query('q');

    // Validate query
    if (!query) {
      return c.json(
        createErrorResponse('Bad Request', 'q (query) parameter is required', 400),
        400
      );
    }

    // Parse optional filters
    const pageType = c.req.query('pageType') as PageType | undefined;
    const tags = c.req.query('tags')?.split(',').filter(Boolean);
    const limit = parseInt(c.req.query('limit') || '20', 10);

    const startTime = Date.now();

    try {
      // For now, use simple filtering on listPages
      // Full QMD integration will be added later
      const { listPages } = await import('@llm-wiki/core/wiki');

      const pages = await listPages(wikiDir);
      
      // Simple text search
      const queryLower = query.toLowerCase();
      const results = pages
        .filter(p => 
          p.title.toLowerCase().includes(queryLower)
        )
        .slice(0, limit)
        .map(p => ({
          docId: p.slug,
          score: 1,
          content: p.frontmatter.summary || p.title,
          title: p.title,
          slug: p.slug,
          pageType: p.type,
        }));

      const took = Date.now() - startTime;

      return c.json(
        createSuccessResponse({
          query,
          results,
          total: results.length,
          took,
          filters: {
            pageType: pageType || undefined,
            tags: tags || undefined,
          },
        })
      );
    } catch (error) {
      console.error('Error searching:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Search failed', 500),
        500
      );
    }
  });

  // GET /api/search/graph - Get graph data
  app.get('/api/search/graph', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const { listPages } = await import('@llm-wiki/core/wiki');
      const { getBacklinks } = await import('@llm-wiki/core/wiki');

      const pages = await listPages(wikiDir);
      const nodes = pages.map((page) => ({
        id: page.slug,
        title: page.title,
        slug: page.slug,
        type: page.type,
        linkCount: 0,
      }));

      const edges: Array<{ source: string; target: string }> = [];

      // Build edge list from backlinks
      for (const page of pages) {
        const backlinks = await getBacklinks(wikiDir, page.slug);
        for (const sourceSlug of backlinks) {
          edges.push({ source: sourceSlug, target: page.slug });
        }
      }

      // Calculate link counts
      const linkCounts = new Map<string, number>();
      for (const edge of edges) {
        linkCounts.set(edge.target, (linkCounts.get(edge.target) || 0) + 1);
      }
      for (const node of nodes) {
        node.linkCount = linkCounts.get(node.id) || 0;
      }

      return c.json(
        createSuccessResponse({
          nodes,
          edges,
        })
      );
    } catch (error) {
      console.error('Error getting graph data:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to get graph data', 500),
        500
      );
    }
  });
}
