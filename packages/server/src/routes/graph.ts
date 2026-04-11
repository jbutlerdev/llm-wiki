/**
 * Graph API routes
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

export function registerGraphRoutes(app: Hono) {
  // GET /api/graph - Get full graph data for visualization
  app.get('/api/graph', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const { listPages } = await import('@llm-wiki/core/wiki');
      const { getBacklinks } = await import('@llm-wiki/core/wiki');

      const pages = await listPages(wikiDir);

      // Build nodes
      const nodes = pages.map((page) => ({
        id: page.slug,
        title: page.title,
        slug: page.slug,
        type: page.type as PageType,
        linkCount: 0,
        tags: page.frontmatter?.tags || [],
      }));

      // Build edges from backlinks
      const edges: Array<{ source: string; target: string }> = [];
      const linkCounts = new Map<string, number>();

      for (const page of pages) {
        const backlinks = await getBacklinks(wikiDir, page.slug);
        for (const sourceSlug of backlinks) {
          edges.push({ source: sourceSlug, target: page.slug });
          linkCounts.set(page.slug, (linkCounts.get(page.slug) || 0) + 1);
        }
      }

      // Update link counts in nodes
      for (const node of nodes) {
        node.linkCount = linkCounts.get(node.id) || 0;
      }

      // Calculate stats
      const stats = {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        nodesByType: nodes.reduce(
          (acc, n) => {
            acc[n.type] = (acc[n.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        avgConnections: nodes.length > 0
          ? edges.length * 2 / nodes.length
          : 0,
      };

      return c.json(
        createSuccessResponse({
          nodes,
          edges,
          stats,
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

  // GET /api/graph/node/:id - Get details for a specific node
  app.get('/api/graph/node/:id', async (c) => {
    const wikiDir = getWikiDir();
    const id = c.req.param('id');

    try {
      const { loadPage } = await import('@llm-wiki/core/wiki');
      const { getBacklinks } = await import('@llm-wiki/core/wiki');

      const page = await loadPage(wikiDir, id);
      if (!page) {
        return c.json(
          createErrorResponse('Not Found', `Node '${id}' not found`, 404),
          404
        );
      }

      // Get backlinks (incoming links)
      const backlinks = await getBacklinks(wikiDir, id);

      // Get outgoing links from content
      const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
      const outgoingLinks: string[] = [];
      let match;
      while ((match = wikiLinkRegex.exec(page.content || '')) !== null) {
        const linkedSlug = match[1].toLowerCase().replace(/\s+/g, '-');
        if (!outgoingLinks.includes(linkedSlug)) {
          outgoingLinks.push(linkedSlug);
        }
      }

      return c.json(
        createSuccessResponse({
          node: {
            id: page.slug,
            title: page.title,
            type: page.type,
            tags: page.frontmatter.tags || [],
            createdAt: page.createdAt,
            lastModified: page.lastModified,
          },
          incoming: backlinks,
          outgoing: outgoingLinks,
          totalConnections: backlinks.length + outgoingLinks.length,
        })
      );
    } catch (error) {
      console.error('Error getting node details:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to get node details', 500),
        500
      );
    }
  });
}
