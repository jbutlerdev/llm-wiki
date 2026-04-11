/**
 * Sources API routes
 */

import { Hono } from 'hono';
import { getWikiDir } from '../index.js';
import type { IngestSourceRequest } from '@llm-wiki/core';

function createSuccessResponse<T>(data: T) {
  return { success: true, data };
}

function createErrorResponse(error: string, message: string, statusCode: number) {
  return {
    success: false,
    error: { error, message, statusCode },
  };
}

export function registerSourcesRoutes(app: Hono) {
  // GET /api/sources - List all sources
  app.get('/api/sources', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const { listSources } = await import('@llm-wiki/core/wiki');
      const sources = await listSources(wikiDir);

      return c.json(
        createSuccessResponse({
          sources,
          total: sources.length,
        })
      );
    } catch (error) {
      console.error('Error listing sources:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to list sources', 500),
        500
      );
    }
  });

  // GET /api/sources/:id - Get a single source
  app.get('/api/sources/:id', async (c) => {
    const wikiDir = getWikiDir();
    const id = c.req.param('id');

    try {
      const { loadSource } = await import('@llm-wiki/core/wiki');
      const source = await loadSource(wikiDir, id);

      if (!source) {
        return c.json(
          createErrorResponse('Not Found', `Source '${id}' not found`, 404),
          404
        );
      }

      return c.json(createSuccessResponse({ source }));
    } catch (error) {
      console.error('Error loading source:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to load source', 500),
        500
      );
    }
  });

  // POST /api/sources/ingest - Ingest a new source
  app.post('/api/sources/ingest', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const body = (await c.req.json()) as IngestSourceRequest;

      // Validate type
      if (!body.type || !['file', 'url', 'text'].includes(body.type)) {
        return c.json(
          createErrorResponse('Bad Request', 'type must be "file", "url", or "text"', 400),
          400
        );
      }

      // Validate based on type
      if (body.type === 'file' && !body.path) {
        return c.json(
          createErrorResponse('Bad Request', 'path is required for type "file"', 400),
          400
        );
      }
      if (body.type === 'url' && !body.url) {
        return c.json(
          createErrorResponse('Bad Request', 'url is required for type "url"', 400),
          400
        );
      }
      if (body.type === 'text' && !body.content) {
        return c.json(
          createErrorResponse('Bad Request', 'content is required for type "text"', 400),
          400
        );
      }

      const { ingest } = await import('@llm-wiki/core/source');

      let result;
      const context = { wikiDir, rawDir: `${wikiDir}/wiki/raw` };
      const options = { title: body.title, tags: body.tags };
      
      if (body.type === 'file' && body.path) {
        result = await ingest(body.path, context, options);
      } else if (body.type === 'url' && body.url) {
        result = await ingest(body.url, context, options);
      } else if (body.type === 'text' && body.content) {
        result = await ingest(body.content, context, options);
      } else {
        return c.json(
          createErrorResponse('Bad Request', 'Invalid ingest request', 400),
          400
        );
      }

      return c.json(createSuccessResponse({ result }), 201);
    } catch (error: unknown) {
      console.error('Error ingesting source:', error);
      const message = error instanceof Error ? error.message : 'Failed to ingest source';
      return c.json(createErrorResponse('Internal Server Error', message, 500), 500);
    }
  });
}
