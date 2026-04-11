/**
 * Lint API routes
 */

import { Hono } from 'hono';
import { getWikiDir } from '../index.js';
import type { LintIssue } from '@llm-wiki/core';

function createSuccessResponse<T>(data: T) {
  return { success: true, data };
}

function createErrorResponse(error: string, message: string, statusCode: number) {
  return {
    success: false,
    error: { error, message, statusCode },
  };
}

export function registerLintRoutes(app: Hono) {
  // GET /api/lint - Run lint checks
  app.get('/api/lint', async (c) => {
    const wikiDir = getWikiDir();
    const fix = c.req.query('fix') === 'true';

    try {
      const { listPages, getOrphanPages } = await import('@llm-wiki/core/wiki');
      const { loadIndex } = await import('@llm-wiki/core/wiki');
      const { appendLog } = await import('@llm-wiki/core/wiki');

      const issues: LintIssue[] = [];
      let fixed = 0;

      // 1. Orphan detection
      const orphans = await getOrphanPages(wikiDir);
      for (const orphan of orphans) {
        issues.push({
          type: 'orphan',
          pageId: orphan.slug,
          message: `Page "${orphan.title}" has no incoming links`,
          severity: 'warning',
        });
      }

      // 2. Check index.md coverage
      try {
        const index = await loadIndex(wikiDir);
        const pages = await listPages(wikiDir);
        const indexSlugs = new Set(index.pages.map(p => p.slug));

        for (const page of pages) {
          if (!indexSlugs.has(page.slug)) {
            issues.push({
              type: 'coverage',
              pageId: 'index.md',
              message: `Index is missing entry for "${page.title}"`,
              severity: 'info',
            });
          }
        }
      } catch {
        // Index might not exist yet
      }

      // Build report
      const report = {
        timestamp: new Date(),
        issues,
        summary: {
          contradictions: issues.filter((i) => i.type === 'contradiction').length,
          orphans: issues.filter((i) => i.type === 'orphan').length,
          stale: issues.filter((i) => i.type === 'stale').length,
          coverage: issues
            .filter((i) => i.type === 'coverage')
            .map((i) => ({
              concept: i.pageId,
              description: i.message,
              suggestedPages: [],
            })),
        },
      };

      // Log the lint run
      try {
        await appendLog(wikiDir, {
          type: 'lint',
          title: `Lint run - ${issues.length} issues found`,
          details: `${fixed} issues fixed`,
        });
      } catch {
        // Log write failed, non-critical
      }

      return c.json(createSuccessResponse({ report, fixed }));
    } catch (error) {
      console.error('Error running lint:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Lint failed', 500),
        500
      );
    }
  });

  // GET /api/lint/history - Get lint history
  app.get('/api/lint/history', async (c) => {
    const wikiDir = getWikiDir();
    const limit = parseInt(c.req.query('limit') || '10', 10);

    try {
      const { loadLog } = await import('@llm-wiki/core/wiki');

      const log = await loadLog(wikiDir);
      const lintEntries = log.entries
        .filter((e) => e.type === 'lint')
        .slice(-limit)
        .reverse();

      const history = lintEntries.map((entry) => ({
        timestamp: entry.timestamp,
        issueCount: parseInt(entry.details?.match(/(\d+) issues/)?.[1] || '0', 10),
        fixedCount: parseInt(entry.details?.match(/(\d+) fixed/)?.[1] || '0', 10),
      }));

      return c.json(createSuccessResponse({ history }));
    } catch (error) {
      console.error('Error getting lint history:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to get lint history', 500),
        500
      );
    }
  });
}
