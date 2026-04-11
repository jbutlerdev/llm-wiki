/**
 * Git routes for wiki version control
 */

import { Hono } from 'hono';
import { getWikiDir } from '../index.js';
import {
  isGitRepo,
  getGitStatus,
  getGitDiff,
  gitStageAndCommit,
  getGitLog,
  gitRevert,
  gitShow,
  initGitRepo,
} from '@llm-wiki/core';

function createSuccessResponse<T>(data: T) {
  return { success: true, data };
}

function createErrorResponse(error: string, message: string, statusCode: number) {
  return {
    success: false,
    error: { error, message, statusCode },
  };
}

export function registerGitRoutes(app: Hono) {
  // GET /api/git/status - Get git status
  app.get('/api/git/status', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const status = await getGitStatus(wikiDir);
      return c.json(createSuccessResponse(status));
    } catch (error) {
      console.error('Error getting git status:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to get git status', 500),
        500
      );
    }
  });

  // GET /api/git/diff - Get changes
  app.get('/api/git/diff', async (c) => {
    const wikiDir = getWikiDir();
    const file = c.req.query('file');

    try {
      const diffs = await getGitDiff(wikiDir, file || undefined);
      return c.json(createSuccessResponse(diffs));
    } catch (error) {
      console.error('Error getting git diff:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to get diff', 500),
        500
      );
    }
  });

  // POST /api/git/commit - Commit changes
  app.post('/api/git/commit', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const body = await c.req.json();
      const message = body.message as string;

      if (!message) {
        return c.json(
          createErrorResponse('Bad Request', 'Commit message is required', 400),
          400
        );
      }

      const files = body.files as string[] | undefined;
      const result = await gitStageAndCommit(wikiDir, message, files);

      if (result.success) {
        return c.json(createSuccessResponse(result));
      } else {
        return c.json(
          createErrorResponse('Git Error', result.error || 'Failed to commit', 400),
          400
        );
      }
    } catch (error) {
      console.error('Error committing:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to commit', 500),
        500
      );
    }
  });

  // GET /api/git/log - Get commit history
  app.get('/api/git/log', async (c) => {
    const wikiDir = getWikiDir();
    const limit = parseInt(c.req.query('limit') || '20', 10);

    try {
      const log = await getGitLog(wikiDir, limit);
      return c.json(createSuccessResponse(log));
    } catch (error) {
      console.error('Error getting git log:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to get log', 500),
        500
      );
    }
  });

  // POST /api/git/revert - Revert a file
  app.post('/api/git/revert', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const body = await c.req.json();
      const filePath = body.file as string;
      const commitHash = body.commit as string | undefined;

      if (!filePath) {
        return c.json(
          createErrorResponse('Bad Request', 'File path is required', 400),
          400
        );
      }

      const result = await gitRevert(wikiDir, filePath, commitHash);

      if (result.success) {
        return c.json(createSuccessResponse({ reverted: filePath }));
      } else {
        return c.json(
          createErrorResponse('Git Error', result.error || 'Failed to revert', 400),
          400
        );
      }
    } catch (error) {
      console.error('Error reverting:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to revert', 500),
        500
      );
    }
  });

  // GET /api/git/show - Get file at a commit
  app.get('/api/git/show', async (c) => {
    const wikiDir = getWikiDir();
    const file = c.req.query('file');
    const commit = c.req.query('commit');

    if (!file) {
      return c.json(
        createErrorResponse('Bad Request', 'File path is required', 400),
        400
      );
    }

    try {
      const content = await gitShow(wikiDir, file, commit || undefined);

      if (content !== null) {
        return c.json(createSuccessResponse({ file, content }));
      } else {
        return c.json(
          createErrorResponse('Not Found', 'File not found at specified commit', 404),
          404
        );
      }
    } catch (error) {
      console.error('Error showing file:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to show file', 500),
        500
      );
    }
  });

  // POST /api/git/init - Initialize git repository
  app.post('/api/git/init', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const body = await c.req.json().catch(() => ({}));
      const initialCommit = body.initialCommit as boolean ?? false;

      const result = await initGitRepo(wikiDir, initialCommit);

      if (result.success) {
        return c.json(createSuccessResponse({ initialized: true }));
      } else {
        return c.json(
          createErrorResponse('Git Error', result.error || 'Failed to init', 400),
          400
        );
      }
    } catch (error) {
      console.error('Error initializing git:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to initialize git', 500),
        500
      );
    }
  });
}
