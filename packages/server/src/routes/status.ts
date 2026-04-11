/**
 * Status API routes
 */

import { Hono } from 'hono';
import { getWikiDir } from '../index.js';

function createSuccessResponse<T>(data: T) {
  return { success: true, data };
}

function createErrorResponse(error: string, message: string, statusCode: number) {
  return {
    success: false,
    error: { error, message, statusCode },
  };
}

export function registerStatusRoutes(app: Hono) {
  // GET /api/status - Get wiki status
  app.get('/api/status', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const { listPages } = await import('@llm-wiki/core/wiki');
      const { listSources } = await import('@llm-wiki/core/wiki');
      const { loadIndex } = await import('@llm-wiki/core/wiki');

      const [pages, sources] = await Promise.all([
        listPages(wikiDir),
        listSources(wikiDir),
      ]);

      // Get last modified from index
      let lastModified = new Date();
      try {
        const index = await loadIndex(wikiDir);
        if (index.lastModified) {
          lastModified = new Date(index.lastModified);
        }
      } catch {
        // Index might not exist
      }

      const wiki = {
        name: 'LLM Wiki',
        pageCount: pages.length,
        sourceCount: sources.length,
        lastModified,
      };

      // QMD stats (placeholder - would need actual QMD integration)
      const qmd = {
        indexedDocuments: pages.length,
        indexSize: 0, // Would come from QMD store
        lastIndexed: lastModified,
      };

      return c.json(createSuccessResponse({ wiki, qmd }));
    } catch (error) {
      console.error('Error getting status:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to get status', 500),
        500
      );
    }
  });
}
