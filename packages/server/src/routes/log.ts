/**
 * Log API routes
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

export function registerLogRoutes(app: Hono) {
  // GET /api/log - Get log entries
  app.get('/api/log', async (c) => {
    const wikiDir = getWikiDir();
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const type = c.req.query('type');

    try {
      const { loadLog } = await import('@llm-wiki/core/wiki');

      const log = await loadLog(wikiDir);

      // Filter by type if specified
      let entries = log.entries;
      if (type) {
        entries = entries.filter((e) => e.type === type);
      }

      // Apply limit
      entries = entries.slice(-limit);

      return c.json(
        createSuccessResponse({
          entries,
          total: log.entries.length,
        })
      );
    } catch (error) {
      console.error('Error loading log:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to load log', 500),
        500
      );
    }
  });

  // POST /api/log - Append a log entry (internal use)
  app.post('/api/log', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const body = await c.req.json();

      const { appendLog } = await import('@llm-wiki/core/wiki');

      await appendLog(wikiDir, {
        type: body.type || 'update',
        title: body.title,
        details: body.details,
        sources: body.sources,
      });

      return c.json(createSuccessResponse({ logged: true }), 201);
    } catch (error) {
      console.error('Error appending log:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to append log', 500),
        500
      );
    }
  });
}
