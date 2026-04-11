/**
 * Tests for LogEntry type - Phase 1
 */
import { describe, it, expect } from 'vitest';
import type { LogEntry, LogType } from './index.js';

describe('LogEntry type', () => {
  it('should include all required fields', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      type: 'ingest',
      title: 'Ingested test document',
    };

    expect(entry.timestamp).toBeInstanceOf(Date);
    expect(entry.type).toBe('ingest');
    expect(entry.title).toBe('Ingested test document');
  });

  it('should validate log type enum values', () => {
    const logTypes: LogType[] = ['ingest', 'query', 'lint', 'update'];

    logTypes.forEach((type) => {
      const entry: LogEntry = {
        timestamp: new Date(),
        type,
        title: `Test ${type} entry`,
      };
      expect(entry.type).toBe(type);
    });
  });

  it('should support optional details and sources', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      type: 'ingest',
      title: 'Ingested test document',
      details: 'Created 3 pages, updated 5 pages',
      sources: ['raw/test.md'],
    };

    expect(entry.details).toBe('Created 3 pages, updated 5 pages');
    expect(entry.sources).toContain('raw/test.md');
  });

  it('should format log entry for log.md', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const entry: LogEntry = {
      timestamp: date,
      type: 'ingest',
      title: 'Test document',
      sources: ['raw/test.md'],
    };

    // Format should be: ## [YYYY-MM-DD] type | Title
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const expectedFormat = `## [${year}-${month}-${day}] ingest | Test document`;

    expect(expectedFormat).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
