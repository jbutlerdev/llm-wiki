/**
 * Tests for CLI commands
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { rm } from 'fs/promises';

const execAsync = promisify(exec);

// Get the project root directory
const projectRoot = join(process.cwd(), '..', '..');

// Helper to run CLI command
async function runCli(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const cliPath = join(projectRoot, 'packages', 'cli', 'dist', 'index.js');
    const workingDir = cwd || projectRoot;
    const result = await execAsync(`node "${cliPath}" ${args.join(' ')}`, {
      cwd: workingDir,
      timeout: 30000,
    });
    return { stdout: result.stdout, stderr: result.stderr, code: 0 };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string; code?: number };
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || '',
      code: err.code || 1,
    };
  }
}

describe('CLI Commands', () => {
  const testWikiDir = join(projectRoot, 'test-wiki-temp');

  beforeEach(async () => {
    // Clean up any existing test wiki
    if (existsSync(testWikiDir)) {
      await rm(testWikiDir, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    // Clean up test wiki
    if (existsSync(testWikiDir)) {
      await rm(testWikiDir, { recursive: true, force: true });
    }
  });

  describe('init command', () => {
    it('should initialize a new wiki', async () => {
      const result = await runCli(['init', testWikiDir]);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('initialized successfully');
      
      // Verify wiki structure
      expect(existsSync(join(testWikiDir, 'wiki'))).toBe(true);
      expect(existsSync(join(testWikiDir, 'wiki', 'index.md'))).toBe(true);
      expect(existsSync(join(testWikiDir, 'wiki', 'log.md'))).toBe(true);
      expect(existsSync(join(testWikiDir, 'wiki', 'CLAUDE.md'))).toBe(true);
      expect(existsSync(join(testWikiDir, 'wiki', 'raw'))).toBe(true);
    });

    it('should fail if wiki already exists', async () => {
      // Initialize first
      await runCli(['init', testWikiDir]);
      
      // Try to init again
      const result = await runCli(['init', testWikiDir]);
      
      expect(result.code).toBe(1);
      // Error message is in stdout or stderr
      const output = result.stdout + result.stderr;
      expect(output).toContain('already initialized');
    });

    it('should overwrite with --force flag', async () => {
      // Initialize first
      await runCli(['init', testWikiDir]);
      
      // Init again with force
      const result = await runCli(['init', testWikiDir, '--force']);
      
      expect(result.code).toBe(0);
    });
  });

  describe('status command', () => {
    it('should show status for initialized wiki', async () => {
      // Initialize first
      await runCli(['init', testWikiDir]);
      
      const result = await runCli(['-w', testWikiDir, 'status']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Wiki Status');
      expect(result.stdout).toContain('Pages:');
    });

    it('should error on non-wiki directory', async () => {
      const result = await runCli(['-w', '/tmp', 'status']);
      
      expect(result.code).toBe(1);
      expect(result.stdout).toContain('Not a wiki');
    });

    it('should output JSON with --json flag', async () => {
      await runCli(['init', testWikiDir]);
      
      const result = await runCli(['-w', testWikiDir, 'status', '--json']);
      
      expect(result.code).toBe(0);
      // Extract JSON from output (may have text before it)
      const output = result.stdout;
      const jsonMatch = output.match(/\{.*\}/s);
      expect(jsonMatch).not.toBeNull();
      const json = JSON.parse(jsonMatch![0]);
      expect(json.initialized).toBe(true);
      expect(json.stats).toBeDefined();
    });
  });

  describe('lint command', () => {
    it('should run lint checks', async () => {
      await runCli(['init', testWikiDir]);
      
      const result = await runCli(['-w', testWikiDir, 'lint']);
      
      expect(result.code).toBe(0);
      // Should either show no issues or show found issues
      expect(
        result.stdout.includes('No issues found') || 
        result.stdout.includes('issue(s)')
      ).toBe(true);
    });

    it('should output JSON with --json flag', async () => {
      await runCli(['init', testWikiDir]);
      
      const result = await runCli(['-w', testWikiDir, 'lint', '--json']);
      
      expect(result.code).toBe(0);
      // Extract JSON from output (may have text before it)
      const output = result.stdout;
      const jsonMatch = output.match(/\{.*\}/s);
      expect(jsonMatch).not.toBeNull();
      const json = JSON.parse(jsonMatch![0]);
      expect(json.timestamp).toBeDefined();
      expect(json.issues).toBeInstanceOf(Array);
    });
  });

  describe('--help', () => {
    it('should show help for main command', async () => {
      const result = await runCli(['--help']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage');
      expect(result.stdout).toContain('Commands');
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('ingest');
      expect(result.stdout).toContain('search');
      expect(result.stdout).toContain('lint');
      expect(result.stdout).toContain('status');
    });

    it('should show help for init command', async () => {
      const result = await runCli(['init', '--help']);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('Initialize');
    });
  });

  describe('--version', () => {
    it('should show version', async () => {
      const result = await runCli(['--version']);
      
      expect(result.code).toBe(0);
      // Version should be in format x.y.z
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});

describe('CLI Import Tests', () => {
  it('should export version', async () => {
    // Version is exported from the module
    // We test this by checking the package.json version
    const packageJsonPath = join(dirname(new URL(import.meta.url).pathname), '..', 'package.json');
    const { readFileSync } = await import('fs');
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    expect(pkg.version).toBeDefined();
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
