/**
 * Git integration tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';

// Mock execa for all tests - must be at top level
vi.mock('execa', () => {
  return {
    execa: vi.fn().mockResolvedValue({ stdout: '', exitCode: 0 }),
  };
});

describe('Git Integration', () => {
  const testDir = '/tmp/test-wiki-git';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('isGitRepo', () => {
    it('should return true for a git repository', async () => {
      const { execa } = await import('execa');
      const { isGitRepo } = await import('./index.js');
      
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'true', exitCode: 0 } as never);
      
      const result = await isGitRepo(testDir);
      
      expect(result).toBe(true);
      expect(execa).toHaveBeenCalledWith('git', ['rev-parse', '--is-inside-work-tree'], {
        cwd: testDir,
        reject: true,
      });
    });

    it('should return false for a non-git directory', async () => {
      const { execa } = await import('execa');
      const { isGitRepo } = await import('./index.js');
      
      vi.mocked(execa).mockRejectedValueOnce(new Error('Not a git repo') as never);
      
      const result = await isGitRepo('/tmp/not-a-repo');
      
      expect(result).toBe(false);
    });
  });

  describe('getGitStatus', () => {
    it('should return isRepo: false when not a git repo', async () => {
      const { execa } = await import('execa');
      const { getGitStatus } = await import('./index.js');
      
      vi.mocked(execa).mockRejectedValueOnce(new Error('Not a git repo') as never);
      
      const result = await getGitStatus(testDir);
      
      expect(result.isRepo).toBe(false);
      expect(result.hasChanges).toBe(false);
    });

    it('should return status for a git repository', async () => {
      const { execa } = await import('execa');
      const { getGitStatus } = await import('./index.js');
      
      // isGitRepo check - uses rev-parse
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'true', exitCode: 0 } as never);
      // git status --porcelain
      vi.mocked(execa).mockResolvedValueOnce({ stdout: '', exitCode: 0 } as never);
      // git branch --show-current
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'main', exitCode: 0 } as never);
      // git rev-parse HEAD
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'abc123def456', exitCode: 0 } as never);
      // git rev-list for ahead/behind (will fail)
      vi.mocked(execa).mockRejectedValueOnce(new Error('No upstream') as never);
      
      const result = await getGitStatus(testDir);
      
      expect(result.isRepo).toBe(true);
      expect(result.branch).toBe('main');
      expect(result.currentCommit).toBe('abc123de');
    });

    it('should parse staged changes', async () => {
      const { execa } = await import('execa');
      const { getGitStatus } = await import('./index.js');
      
      // isGitRepo check
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'true', exitCode: 0 } as never);
      // git status with staged changes
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'M  wiki/page.md\nA  wiki/new.md', exitCode: 0 } as never);
      // git branch
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'main', exitCode: 0 } as never);
      // git rev-parse HEAD
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'abc123def456', exitCode: 0 } as never);
      // git rev-list (will fail)
      vi.mocked(execa).mockRejectedValueOnce(new Error('No upstream') as never);
      
      const result = await getGitStatus(testDir);
      
      expect(result.isRepo).toBe(true);
      expect(result.staged).toContain('wiki/new.md');
    });

    it('should parse untracked files', async () => {
      const { execa } = await import('execa');
      const { getGitStatus } = await import('./index.js');
      
      // isGitRepo check
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'true', exitCode: 0 } as never);
      // git status with untracked
      vi.mocked(execa).mockResolvedValueOnce({ stdout: '?? wiki/untracked.md', exitCode: 0 } as never);
      // git branch
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'main', exitCode: 0 } as never);
      // git rev-parse HEAD
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'abc123def456', exitCode: 0 } as never);
      // git rev-list (will fail)
      vi.mocked(execa).mockRejectedValueOnce(new Error('No upstream') as never);
      
      const result = await getGitStatus(testDir);
      
      expect(result.isRepo).toBe(true);
      expect(result.untracked).toContain('wiki/untracked.md');
    });
  });

  describe('getGitDiff', () => {
    it('should return empty array when no changes', async () => {
      const { execa } = await import('execa');
      const { getGitDiff } = await import('./index.js');
      
      vi.mocked(execa).mockResolvedValueOnce({ stdout: '', exitCode: 0 } as never);
      
      const result = await getGitDiff(testDir);
      
      expect(result).toEqual([]);
    });

    it('should parse diff output', async () => {
      const { execa } = await import('execa');
      const { getGitDiff } = await import('./index.js');
      
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: 'A\twiki/new.md\nM\twiki/existing.md\nD\twiki/deleted.md',
        exitCode: 0,
      } as never);
      
      const result = await getGitDiff(testDir);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        file: 'wiki/new.md',
        status: 'added',
        hunks: [],
      });
      expect(result[1]).toEqual({
        file: 'wiki/existing.md',
        status: 'modified',
        hunks: [],
      });
      expect(result[2]).toEqual({
        file: 'wiki/deleted.md',
        status: 'deleted',
        hunks: [],
      });
    });
  });

  describe('gitAdd', () => {
    it('should stage files successfully', async () => {
      const { execa } = await import('execa');
      const { gitAdd } = await import('./index.js');
      
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      
      const result = await gitAdd(testDir, ['wiki/page.md']);
      
      expect(result.success).toBe(true);
      expect(result.staged).toContain('wiki/page.md');
    });

    it('should return empty staged array when no files provided', async () => {
      const { gitAdd } = await import('./index.js');
      
      const result = await gitAdd(testDir, []);
      
      expect(result.success).toBe(true);
      expect(result.staged).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const { execa } = await import('execa');
      const { gitAdd } = await import('./index.js');
      
      vi.mocked(execa).mockRejectedValueOnce(new Error('Failed to stage') as never);
      
      const result = await gitAdd(testDir, ['wiki/page.md']);
      
      expect(result.success).toBe(false);
    });
  });

  describe('gitCommit', () => {
    it('should commit successfully', async () => {
      const { execa } = await import('execa');
      const { gitCommit } = await import('./index.js');
      
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'abc123def456', exitCode: 0 } as never);
      
      const result = await gitCommit(testDir, 'Test commit');
      
      expect(result.success).toBe(true);
      expect(result.commitHash).toBe('abc123def456');
    });

    it('should handle "nothing to commit" gracefully', async () => {
      const { execa } = await import('execa');
      const { gitCommit } = await import('./index.js');
      
      vi.mocked(execa).mockRejectedValueOnce(new Error('nothing to commit') as never);
      
      const result = await gitCommit(testDir, 'Test commit');
      
      expect(result.success).toBe(true);
    });
  });

  describe('gitStageAndCommit', () => {
    it('should stage and commit files', async () => {
      const { execa } = await import('execa');
      const { gitStageAndCommit } = await import('./index.js');
      
      // Mock git add
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      // isGitRepo for getGitStatus check
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'true', exitCode: 0 } as never);
      // git status (has staged changes)
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'M  wiki/page.md', exitCode: 0 } as never);
      // git branch
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'main', exitCode: 0 } as never);
      // git rev-parse HEAD
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'abc123def456', exitCode: 0 } as never);
      // git rev-list (will fail)
      vi.mocked(execa).mockRejectedValueOnce(new Error('No upstream') as never);
      // git commit
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      // git rev-parse HEAD (after commit)
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'def456abc789', exitCode: 0 } as never);
      
      const result = await gitStageAndCommit(testDir, 'Updated page');
      
      expect(result.success).toBe(true);
    });

    it('should handle nothing to commit', async () => {
      const { execa } = await import('execa');
      const { gitStageAndCommit } = await import('./index.js');
      
      // Mock git add
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      // isGitRepo for getGitStatus check
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'true', exitCode: 0 } as never);
      // git status (no staged changes)
      vi.mocked(execa).mockResolvedValueOnce({ stdout: '', exitCode: 0 } as never);
      // git branch
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'main', exitCode: 0 } as never);
      // git rev-parse HEAD
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'abc123def456', exitCode: 0 } as never);
      // git rev-list (will fail)
      vi.mocked(execa).mockRejectedValueOnce(new Error('No upstream') as never);
      
      const result = await gitStageAndCommit(testDir, 'Updated page');
      
      expect(result.success).toBe(true);
    });
  });

  describe('getGitLog', () => {
    it('should return git log entries', async () => {
      const { execa } = await import('execa');
      const { getGitLog } = await import('./index.js');
      
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: `abc123def456
John Doe
john@example.com
2024-01-01T00:00:00Z
Test commit message

def456abc789
Jane Doe
jane@example.com
2024-01-02T00:00:00Z
Another commit`,
        exitCode: 0,
      } as never);
      
      const result = await getGitLog(testDir, 10);
      
      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe('abc123def456');
      expect(result[0].author).toBe('John Doe');
    });

    it('should return empty array on error', async () => {
      const { execa } = await import('execa');
      const { getGitLog } = await import('./index.js');
      
      vi.mocked(execa).mockRejectedValueOnce(new Error('No commits') as never);
      
      const result = await getGitLog(testDir);
      
      expect(result).toEqual([]);
    });
  });

  describe('gitRevert', () => {
    it('should revert file to HEAD', async () => {
      const { execa } = await import('execa');
      const { gitRevert } = await import('./index.js');
      
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      
      const result = await gitRevert(testDir, 'wiki/page.md');
      
      expect(result.success).toBe(true);
    });

    it('should revert file to specific commit', async () => {
      const { execa } = await import('execa');
      const { gitRevert } = await import('./index.js');
      
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      
      const result = await gitRevert(testDir, 'wiki/page.md', 'abc123');
      
      expect(result.success).toBe(true);
    });

    it('should return error on failure', async () => {
      const { execa } = await import('execa');
      const { gitRevert } = await import('./index.js');
      
      vi.mocked(execa).mockRejectedValueOnce(new Error('File not found') as never);
      
      const result = await gitRevert(testDir, 'wiki/missing.md');
      
      expect(result.success).toBe(false);
    });
  });

  describe('gitShow', () => {
    it('should return file content at HEAD', async () => {
      const { execa } = await import('execa');
      const { gitShow } = await import('./index.js');
      
      vi.mocked(execa).mockResolvedValueOnce({
        exitCode: 0,
        stdout: '# Page Content\n\nSome text here.',
      } as never);
      
      const result = await gitShow(testDir, 'wiki/page.md');
      
      expect(result).toContain('# Page Content');
    });

    it('should return null when file not found', async () => {
      const { execa } = await import('execa');
      const { gitShow } = await import('./index.js');
      
      vi.mocked(execa).mockRejectedValueOnce(new Error('Path does not exist') as never);
      
      const result = await gitShow(testDir, 'wiki/missing.md');
      
      expect(result).toBeNull();
    });
  });

  describe('initGitRepo', () => {
    it('should initialize a new git repository', async () => {
      const { execa } = await import('execa');
      const { initGitRepo } = await import('./index.js');
      
      // isGitRepo check (will fail)
      vi.mocked(execa).mockRejectedValueOnce(new Error('Not a repo') as never);
      // git init
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      
      const result = await initGitRepo(testDir);
      
      expect(result.success).toBe(true);
    });

    it('should return success if already a repo', async () => {
      const { execa } = await import('execa');
      const { initGitRepo } = await import('./index.js');
      
      // isGitRepo check (will succeed)
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'true', exitCode: 0 } as never);
      
      const result = await initGitRepo(testDir);
      
      expect(result.success).toBe(true);
    });

    it('should create initial commit if requested', async () => {
      const { execa } = await import('execa');
      const { initGitRepo } = await import('./index.js');
      
      // isGitRepo check (will fail)
      vi.mocked(execa).mockRejectedValueOnce(new Error('Not a repo') as never);
      // git init
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      // git add
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      // git commit
      vi.mocked(execa).mockResolvedValueOnce({ exitCode: 0, stdout: '' } as never);
      
      const result = await initGitRepo(testDir, true);
      
      expect(result.success).toBe(true);
    });
  });
});
