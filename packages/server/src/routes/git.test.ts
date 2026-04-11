/**
 * Git routes tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { registerGitRoutes } from './git.js';
import * as gitModule from '@llm-wiki/core';

// Type for response body
interface SuccessBody<T = unknown> {
  success: true;
  data: T;
}

interface ErrorBody {
  success: false;
  error: {
    error: string;
    message: string;
    statusCode: number;
  };
}

// Mock the git module
vi.mock('@llm-wiki/core', async () => {
  const actual = await vi.importActual('@llm-wiki/core');
  return {
    ...actual as object,
    isGitRepo: vi.fn(),
    getGitStatus: vi.fn(),
    getGitDiff: vi.fn(),
    gitStageAndCommit: vi.fn(),
    getGitLog: vi.fn(),
    gitRevert: vi.fn(),
    gitShow: vi.fn(),
    initGitRepo: vi.fn(),
  };
});

// Mock getWikiDir
vi.mock('../index.js', () => ({
  getWikiDir: () => '/tmp/test-wiki',
}));

describe('Git Routes', () => {
  let app: Hono;
  const mockGit = gitModule as unknown as {
    isGitRepo: ReturnType<typeof vi.fn>;
    getGitStatus: ReturnType<typeof vi.fn>;
    getGitDiff: ReturnType<typeof vi.fn>;
    gitStageAndCommit: ReturnType<typeof vi.fn>;
    getGitLog: ReturnType<typeof vi.fn>;
    gitRevert: ReturnType<typeof vi.fn>;
    gitShow: ReturnType<typeof vi.fn>;
    initGitRepo: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    registerGitRoutes(app);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/git/status', () => {
    it('should return git status', async () => {
      const mockStatus = {
        isRepo: true,
        hasChanges: true,
        staged: ['wiki/page.md'],
        unstaged: [],
        untracked: [],
        ahead: 0,
        behind: 0,
        branch: 'main',
        currentCommit: 'abc123',
      };

      mockGit.getGitStatus.mockResolvedValue(mockStatus);

      const response = await app.request('/api/git/status');
      const body = (await response.json()) as SuccessBody<typeof mockStatus>;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockStatus);
    });

    it('should handle errors gracefully', async () => {
      mockGit.getGitStatus.mockRejectedValue(new Error('Git error'));

      const response = await app.request('/api/git/status');
      const body = await response.json() as ErrorBody;

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/git/diff', () => {
    it('should return git diff', async () => {
      const mockDiffs = [
        { file: 'wiki/page.md', status: 'modified' as const, hunks: [] },
      ];

      mockGit.getGitDiff.mockResolvedValue(mockDiffs);

      const response = await app.request('/api/git/diff');
      const body = (await response.json()) as SuccessBody<typeof mockDiffs>;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockDiffs);
    });

    it('should filter by file', async () => {
      mockGit.getGitDiff.mockResolvedValue([]);

      const response = await app.request('/api/git/diff?file=wiki/page.md');
      await response.json();

      expect(mockGit.getGitDiff).toHaveBeenCalledWith('/tmp/test-wiki', 'wiki/page.md');
    });
  });

  describe('POST /api/git/commit', () => {
    it('should commit changes', async () => {
      mockGit.gitStageAndCommit.mockResolvedValue({
        success: true,
        commitHash: 'abc123',
        message: 'Test commit',
      });

      const response = await app.request('/api/git/commit', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test commit' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const body = (await response.json()) as SuccessBody<{ commitHash: string; message: string }>;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.commitHash).toBe('abc123');
    });

    it('should return error for missing message', async () => {
      const response = await app.request('/api/git/commit', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await response.json() as ErrorBody;

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should handle commit errors', async () => {
      mockGit.gitStageAndCommit.mockResolvedValue({
        success: false,
        error: 'Nothing to commit',
      });

      const response = await app.request('/api/git/commit', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await response.json() as ErrorBody;

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/git/log', () => {
    it('should return git log', async () => {
      const mockLog = [
        {
          hash: 'abc123',
          author: 'John Doe',
          email: 'john@example.com',
          date: '2024-01-01T00:00:00Z',
          message: 'Test commit',
        },
      ];

      mockGit.getGitLog.mockResolvedValue(mockLog);

      const response = await app.request('/api/git/log');
      const body = (await response.json()) as SuccessBody<typeof mockLog>;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockLog);
    });

    it('should respect limit parameter', async () => {
      mockGit.getGitLog.mockResolvedValue([]);

      const response = await app.request('/api/git/log?limit=10');
      await response.json();

      expect(mockGit.getGitLog).toHaveBeenCalledWith('/tmp/test-wiki', 10);
    });
  });

  describe('POST /api/git/revert', () => {
    it('should revert a file', async () => {
      mockGit.gitRevert.mockResolvedValue({ success: true });

      const response = await app.request('/api/git/revert', {
        method: 'POST',
        body: JSON.stringify({ file: 'wiki/page.md' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await response.json() as SuccessBody<{ reverted: string }>;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('should return error for missing file', async () => {
      const response = await app.request('/api/git/revert', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await response.json() as ErrorBody;

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should revert to specific commit', async () => {
      mockGit.gitRevert.mockResolvedValue({ success: true });

      const response = await app.request('/api/git/revert', {
        method: 'POST',
        body: JSON.stringify({ file: 'wiki/page.md', commit: 'abc123' }),
        headers: { 'Content-Type': 'application/json' },
      });
      await response.json();

      expect(mockGit.gitRevert).toHaveBeenCalledWith('/tmp/test-wiki', 'wiki/page.md', 'abc123');
    });
  });

  describe('GET /api/git/show', () => {
    it('should return file at HEAD', async () => {
      mockGit.gitShow.mockResolvedValue('# Page Content');

      const response = await app.request('/api/git/show?file=wiki/page.md');
      const body = (await response.json()) as SuccessBody<{ file: string; content: string }>;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('# Page Content');
    });

    it('should return file at specific commit', async () => {
      mockGit.gitShow.mockResolvedValue('# Old Content');

      const response = await app.request('/api/git/show?file=wiki/page.md&commit=abc123');
      await response.json();

      expect(mockGit.gitShow).toHaveBeenCalledWith('/tmp/test-wiki', 'wiki/page.md', 'abc123');
    });

    it('should return 404 for missing file', async () => {
      mockGit.gitShow.mockResolvedValue(null);

      const response = await app.request('/api/git/show?file=wiki/missing.md');
      const body = await response.json() as ErrorBody;

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });

    it('should return error for missing file parameter', async () => {
      const response = await app.request('/api/git/show');
      const body = await response.json() as ErrorBody;

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/git/init', () => {
    it('should initialize git repo', async () => {
      mockGit.initGitRepo.mockResolvedValue({ success: true });

      const response = await app.request('/api/git/init', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await response.json() as SuccessBody<{ initialized: boolean }>;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('should create initial commit if requested', async () => {
      mockGit.initGitRepo.mockResolvedValue({ success: true });

      const response = await app.request('/api/git/init', {
        method: 'POST',
        body: JSON.stringify({ initialCommit: true }),
        headers: { 'Content-Type': 'application/json' },
      });
      await response.json();

      expect(mockGit.initGitRepo).toHaveBeenCalledWith('/tmp/test-wiki', true);
    });
  });
});
