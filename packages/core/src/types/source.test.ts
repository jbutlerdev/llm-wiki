/**
 * Tests for SourceDocument type - Phase 1
 */
import { describe, it, expect } from 'vitest';
import type { SourceDocument, SourceType } from './index.js';

describe('SourceDocument type', () => {
  it('should include all required fields', () => {
    const source: SourceDocument = {
      path: 'raw/test-document.md',
      type: 'markdown',
      title: 'Test Document',
      ingestedAt: new Date(),
      checksum: 'abc123def456',
    };

    expect(source.path).toBe('raw/test-document.md');
    expect(source.type).toBe('markdown');
    expect(source.title).toBe('Test Document');
    expect(source.ingestedAt).toBeInstanceOf(Date);
    expect(source.checksum).toBe('abc123def456');
  });

  it('should validate source type enum values', () => {
    const sourceTypes: SourceType[] = ['markdown', 'url', 'text'];

    sourceTypes.forEach((type) => {
      const source: SourceDocument = {
        path: `test.${type === 'url' ? 'com' : type}`,
        type,
        title: `Test ${type}`,
        ingestedAt: new Date(),
        checksum: 'checksum',
      };
      expect(source.type).toBe(type);
    });
  });

  it('should include optional url for URL sources', () => {
    const source: SourceDocument = {
      path: 'raw/https---example-com-page',
      type: 'url',
      title: 'Example Page',
      ingestedAt: new Date(),
      checksum: 'checksum',
      url: 'https://example.com/page',
    };

    expect(source.url).toBe('https://example.com/page');
  });
});
