/**
 * Git integration for LLM Wiki
 * 
 * Provides git operations for version control of wiki changes.
 */

import { execa } from 'execa';
import { existsSync } from 'fs';
import { join, relative } from 'path';

export interface GitStatus {
  isRepo: boolean;
  hasChanges: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
  branch: string;
  currentCommit: string;
}

export interface GitDiff {
  file: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  hunks: string[];
}

export interface GitCommitResult {
  success: boolean;
  commitHash?: string;
  message?: string;
  error?: string;
}

export interface GitLogEntry {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
}

/**
 * Check if a directory is a git repository
 */
export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: dir,
      reject: true,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the git status of the wiki
 */
export async function getGitStatus(wikiDir: string): Promise<GitStatus> {
  const isRepo = await isGitRepo(wikiDir);
  
  if (!isRepo) {
    return {
      isRepo: false,
      hasChanges: false,
      staged: [],
      unstaged: [],
      untracked: [],
      ahead: 0,
      behind: 0,
      branch: '',
      currentCommit: '',
    };
  }

  try {
    // Get porcelain status
    const statusResult = await execa('git', ['status', '--porcelain'], {
      cwd: wikiDir,
      reject: true,
    });

    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    const lines = statusResult.stdout.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const file = line.slice(3);

      if (indexStatus === '?' && workTreeStatus === '?') {
        untracked.push(file);
      } else if (indexStatus !== ' ' && indexStatus !== '?') {
        staged.push(file);
      }
      if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
        unstaged.push(file);
      }
    }

    // Get branch name
    const branchResult = await execa('git', ['branch', '--show-current'], {
      cwd: wikiDir,
      reject: true,
    });
    const branch = branchResult.stdout.trim();

    // Get current commit hash
    const commitResult = await execa('git', ['rev-parse', 'HEAD'], {
      cwd: wikiDir,
      reject: true,
    });
    const currentCommit = commitResult.stdout.trim().slice(0, 8);

    // Get ahead/behind count
    let ahead = 0;
    let behind = 0;
    try {
      const revListResult = await execa('git', ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'], {
        cwd: wikiDir,
        reject: true,
      });
      const [a, b] = revListResult.stdout.trim().split('\t').map(Number);
      ahead = a || 0;
      behind = b || 0;
    } catch {
      // No upstream configured
    }

    return {
      isRepo: true,
      hasChanges: staged.length > 0 || unstaged.length > 0 || untracked.length > 0,
      staged,
      unstaged,
      untracked,
      ahead,
      behind,
      branch,
      currentCommit,
    };
  } catch (error) {
    console.error('Error getting git status:', error);
    return {
      isRepo: true,
      hasChanges: false,
      staged: [],
      unstaged: [],
      untracked: [],
      ahead: 0,
      behind: 0,
      branch: 'unknown',
      currentCommit: 'unknown',
    };
  }
}

/**
 * Get the diff for changed files
 */
export async function getGitDiff(wikiDir: string, file?: string): Promise<GitDiff[]> {
  try {
    const args = ['diff', '--name-status', '--no-color'];
    if (file) {
      args.push('--', file);
    }

    const result = await execa('git', args, {
      cwd: wikiDir,
      reject: true,
    });

    const diffs: GitDiff[] = [];
    const lines = result.stdout.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const [statusChar, ...pathParts] = line.split('\t');
      const filePath = pathParts.join('\t');

      let status: GitDiff['status'];
      switch (statusChar) {
        case 'A':
          status = 'added';
          break;
        case 'M':
          status = 'modified';
          break;
        case 'D':
          status = 'deleted';
          break;
        case 'R':
          status = 'renamed';
          break;
        case 'C':
          status = 'copied';
          break;
        default:
          status = 'modified';
      }

      diffs.push({
        file: filePath,
        status,
        hunks: [],
      });
    }

    return diffs;
  } catch {
    return [];
  }
}

/**
 * Stage files for commit
 */
export async function gitAdd(wikiDir: string, files: string[]): Promise<{ success: boolean; staged: string[] }> {
  if (files.length === 0) {
    return { success: true, staged: [] };
  }

  try {
    await execa('git', ['add', ...files], {
      cwd: wikiDir,
      reject: true,
    });
    return { success: true, staged: files };
  } catch (error) {
    console.error('Error staging files:', error);
    return { success: false, staged: [] };
  }
}

/**
 * Commit staged changes
 */
export async function gitCommit(
  wikiDir: string,
  message: string,
  options?: { allowEmpty?: boolean }
): Promise<GitCommitResult> {
  try {
    const args = ['commit', '-m', message];
    if (options?.allowEmpty) {
      args.push('--allow-empty');
    }

    const result = await execa('git', args, {
      cwd: wikiDir,
      reject: true,
    });

    // Get the commit hash
    const hashResult = await execa('git', ['rev-parse', 'HEAD'], {
      cwd: wikiDir,
      reject: true,
    });

    return {
      success: true,
      commitHash: hashResult.stdout.trim(),
      message,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for specific errors
    if (errorMessage.includes('nothing to commit')) {
      return { success: true, message: 'Nothing to commit' };
    }

    console.error('Error committing:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Stage all changes and commit
 */
export async function gitStageAndCommit(
  wikiDir: string,
  message: string,
  files?: string[]
): Promise<GitCommitResult> {
  // Stage all changes if no specific files provided
  const filesToStage = files ?? ['.'];
  const addResult = await gitAdd(wikiDir, filesToStage);
  
  if (!addResult.success) {
    return { success: false, error: 'Failed to stage files' };
  }

  // Commit if there are staged changes
  const status = await getGitStatus(wikiDir);
  if (status.staged.length === 0) {
    return { success: true, message: 'Nothing to commit' };
  }

  return gitCommit(wikiDir, message);
}

/**
 * Get the git log
 */
export async function getGitLog(
  wikiDir: string,
  limit: number = 20
): Promise<GitLogEntry[]> {
  try {
    const result = await execa(
      'git',
      ['log', `--max-count=${limit}`, '--pretty=format:%H%n%an%n%ae%n%aI%n%s'],
      {
        cwd: wikiDir,
        reject: true,
      }
    );

    const entries: GitLogEntry[] = [];
    const lines = result.stdout.trim().split('\n');

    for (let i = 0; i < lines.length; i += 5) {
      if (i + 4 < lines.length) {
        entries.push({
          hash: lines[i],
          author: lines[i + 1],
          email: lines[i + 2],
          date: lines[i + 3],
          message: lines[i + 4],
        });
      }
    }

    return entries;
  } catch {
    return [];
  }
}

/**
 * Revert a file to its state at a specific commit
 */
export async function gitRevert(
  wikiDir: string,
  filePath: string,
  commitHash?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (commitHash) {
      await execa('git', ['checkout', commitHash, '--', filePath], {
        cwd: wikiDir,
        reject: true,
      });
    } else {
      await execa('git', ['checkout', 'HEAD', '--', filePath], {
        cwd: wikiDir,
        reject: true,
      });
    }
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Show a file at a specific commit
 */
export async function gitShow(
  wikiDir: string,
  filePath: string,
  commitHash?: string
): Promise<string | null> {
  try {
    const ref = commitHash || 'HEAD';
    const result = await execa('git', ['show', `${ref}:${filePath}`], {
      cwd: wikiDir,
      reject: true,
    });
    return result.stdout;
  } catch {
    return null;
  }
}

/**
 * Get the diff for a specific file between commits
 */
export async function gitDiffCommits(
  wikiDir: string,
  fromCommit: string,
  toCommit: string,
  filePath?: string
): Promise<string> {
  try {
    const args = ['diff', fromCommit, toCommit];
    if (filePath) {
      args.push('--', filePath);
    }

    const result = await execa('git', args, {
      cwd: wikiDir,
      reject: true,
    });
    return result.stdout;
  } catch {
    return '';
  }
}

/**
 * Initialize a git repository in the wiki directory
 */
export async function initGitRepo(
  wikiDir: string,
  initialCommit?: boolean
): Promise<{ success: boolean; error?: string }> {
  // Check if already a repo
  if (await isGitRepo(wikiDir)) {
    return { success: true };
  }

  try {
    // Initialize repo
    await execa('git', ['init'], {
      cwd: wikiDir,
      reject: true,
    });

    // Create initial commit if requested
    if (initialCommit) {
      await execa('git', ['add', '.'], {
        cwd: wikiDir,
        reject: true,
      });
      await execa('git', ['commit', '-m', 'Initial wiki setup'], {
        cwd: wikiDir,
        reject: true,
      });
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
