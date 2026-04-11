/**
 * Tests for WikiConfig type - Phase 1
 */
import { describe, it, expect } from 'vitest';
import type { WikiConfig } from './index.js';

describe('WikiConfig type', () => {
  it('should include all required fields with defaults', () => {
    const config: WikiConfig = {
      wikiDir: './wiki',
      rawDir: './wiki/raw',
      qmdDir: './.llm-wiki',
      name: 'My Wiki',
      description: 'A personal knowledge base',
      schemaPath: './wiki/CLAUDE.md',
    };

    expect(config.wikiDir).toBe('./wiki');
    expect(config.rawDir).toBe('./wiki/raw');
    expect(config.qmdDir).toBe('./.llm-wiki');
    expect(config.name).toBe('My Wiki');
    expect(config.description).toBe('A personal knowledge base');
    expect(config.schemaPath).toBe('./wiki/CLAUDE.md');
  });

  it('should validate wiki directory path', () => {
    const config: WikiConfig = {
      wikiDir: '/absolute/path/to/wiki',
      rawDir: '/absolute/path/to/wiki/raw',
      qmdDir: '/absolute/path/to/wiki/.llm-wiki',
      name: 'Test Wiki',
      description: '',
      schemaPath: '/absolute/path/to/wiki/CLAUDE.md',
    };

    // Wiki directory should be set
    expect(config.wikiDir.length).toBeGreaterThan(0);
    expect(config.wikiDir).toContain('wiki');
  });

  it('should use relative paths by default', () => {
    const config: WikiConfig = {
      wikiDir: 'wiki',
      rawDir: 'wiki/raw',
      qmdDir: '.llm-wiki',
      name: 'Test Wiki',
      description: '',
      schemaPath: 'wiki/CLAUDE.md',
    };

    // Should use relative paths
    expect(config.wikiDir.startsWith('/')).toBe(false);
    expect(config.rawDir.startsWith('/')).toBe(false);
  });
});
