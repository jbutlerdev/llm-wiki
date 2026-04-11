/**
 * Pages API routes
 */

import { Hono } from 'hono';
import { getWikiDir } from '../index.js';
import type { WikiPage, PageType, PageFilters, CreatePageRequest, UpdatePageRequest } from '@llm-wiki/core';

// Valid page types
const VALID_PAGE_TYPES: PageType[] = ['summary', 'entity', 'source', 'comparison', 'synthesis'];

function createSuccessResponse<T>(data: T) {
  return { success: true, data };
}

function createErrorResponse(error: string, message: string, statusCode: number) {
  return {
    success: false,
    error: { error, message, statusCode },
  };
}

export function registerPagesRoutes(app: Hono) {
  // GET /api/pages - List all pages
  app.get('/api/pages', async (c) => {
    const wikiDir = getWikiDir();

    // Parse query params
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '20', 10);
    const type = c.req.query('type') as PageType | undefined;
    const search = c.req.query('search');

    // Validate pagination
    if (page < 1) {
      return c.json(createErrorResponse('Bad Request', 'Page must be >= 1', 400), 400);
    }
    if (pageSize < 1 || pageSize > 100) {
      return c.json(createErrorResponse('Bad Request', 'PageSize must be between 1 and 100', 400), 400);
    }

    // Validate type filter
    if (type && !VALID_PAGE_TYPES.includes(type)) {
      return c.json(
        createErrorResponse(
          'Bad Request',
          `Invalid type. Must be one of: ${VALID_PAGE_TYPES.join(', ')}`,
          400
        ),
        400
      );
    }

    try {
      // Use core functions to list pages
      const { listPages } = await import('@llm-wiki/core/wiki');
      const allPages = await listPages(wikiDir);

      // Apply filters
      let filteredPages = allPages;
      if (type) {
        filteredPages = filteredPages.filter((p) => p.type === type);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filteredPages = filteredPages.filter(
          (p) =>
            p.title.toLowerCase().includes(searchLower)
        );
      }

      // Paginate
      const total = filteredPages.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedPages = filteredPages.slice(startIndex, startIndex + pageSize);

      // Build filters object
      const filters: PageFilters = {};
      if (type) filters.type = type;
      if (search) filters.search = search;

      return c.json(
        createSuccessResponse({
          pages: paginatedPages,
          total,
          page,
          pageSize,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        })
      );
    } catch (error) {
      console.error('Error listing pages:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to list pages', 500),
        500
      );
    }
  });

  // GET /api/pages/:slug - Get a single page
  app.get('/api/pages/:slug', async (c) => {
    const wikiDir = getWikiDir();
    const slug = c.req.param('slug');

    try {
      const { loadPage } = await import('@llm-wiki/core/wiki');
      const { getBacklinks } = await import('@llm-wiki/core/wiki');

      const page = await loadPage(wikiDir, slug);
      if (!page) {
        return c.json(
          createErrorResponse('Not Found', `Page '${slug}' not found`, 404),
          404
        );
      }

      const backlinks = await getBacklinks(wikiDir, slug);

      return c.json(createSuccessResponse({ page, backlinks }));
    } catch (error) {
      console.error('Error loading page:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to load page', 500),
        500
      );
    }
  });

  // POST /api/pages - Create a new page
  app.post('/api/pages', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const body = (await c.req.json()) as CreatePageRequest;

      // Validate required fields
      if (!body.slug || !body.title || !body.type) {
        return c.json(
          createErrorResponse('Bad Request', 'slug, title, and type are required', 400),
          400
        );
      }

      // Validate type
      if (!VALID_PAGE_TYPES.includes(body.type)) {
        return c.json(
          createErrorResponse(
            'Bad Request',
            `Invalid type. Must be one of: ${VALID_PAGE_TYPES.join(', ')}`,
            400
          ),
          400
        );
      }

      const { createPage } = await import('@llm-wiki/core/wiki');

      const result = await createPage({
        wikiDir,
        slug: body.slug,
        title: body.title,
        type: body.type,
        content: body.content || '',
        frontmatter: {
          tags: body.frontmatter?.tags || [],
          sources: body.frontmatter?.sources || [],
          relatedPages: body.frontmatter?.relatedPages || [],
          ...body.frontmatter,
        },
      });

      if (!result.success) {
        return c.json(
          createErrorResponse('Bad Request', result.error || 'Failed to create page', 400),
          400
        );
      }

      return c.json(createSuccessResponse({ page: result.page }), 201);
    } catch (error: unknown) {
      console.error('Error creating page:', error);
      const message = error instanceof Error ? error.message : 'Failed to create page';
      return c.json(createErrorResponse('Internal Server Error', message, 500), 500);
    }
  });

  // PUT /api/pages/:slug - Update a page
  app.put('/api/pages/:slug', async (c) => {
    const wikiDir = getWikiDir();
    const slug = c.req.param('slug');

    try {
      const body = (await c.req.json()) as UpdatePageRequest;

      const { loadPage, updatePage } = await import('@llm-wiki/core/wiki');

      // Check if page exists
      const existing = await loadPage(wikiDir, slug);
      if (!existing) {
        return c.json(
          createErrorResponse('Not Found', `Page '${slug}' not found`, 404),
          404
        );
      }

      const page = await updatePage(wikiDir, slug, {
        title: body.title,
        content: body.content,
        frontmatter: body.frontmatter,
      });

      return c.json(createSuccessResponse({ page }));
    } catch (error: unknown) {
      console.error('Error updating page:', error);
      const message = error instanceof Error ? error.message : 'Failed to update page';
      return c.json(createErrorResponse('Internal Server Error', message, 500), 500);
    }
  });

  // DELETE /api/pages/:slug - Delete a page
  app.delete('/api/pages/:slug', async (c) => {
    const wikiDir = getWikiDir();
    const slug = c.req.param('slug');

    try {
      const { loadPage, deletePage } = await import('@llm-wiki/core/wiki');

      // Check if page exists
      const existing = await loadPage(wikiDir, slug);
      if (!existing) {
        return c.json(
          createErrorResponse('Not Found', `Page '${slug}' not found`, 404),
          404
        );
      }

      await deletePage(wikiDir, slug);

      return c.json(createSuccessResponse({ deleted: slug }));
    } catch (error: unknown) {
      console.error('Error deleting page:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete page';
      return c.json(createErrorResponse('Internal Server Error', message, 500), 500);
    }
  });
}
