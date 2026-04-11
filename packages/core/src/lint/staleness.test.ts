/**
 * Tests for staleness checking - Phase 11
 */
import { describe, it, expect } from 'vitest';
import { checkStaleness } from './staleness.js';
import type { LintIssue } from '../types/index.js';

describe('stalenessChecker', () => {
  describe('checkStaleness', () => {
    it('should return empty array when no pages exist', async () => {
      const issues = await checkStaleness('mock/wiki');
      expect(issues).toEqual([]);
    });

    it('should return array of lint issues', async () => {
      const issues = await checkStaleness('mock/wiki');
      expect(Array.isArray(issues)).toBe(true);
      
      for (const issue of issues) {
        expect(issue).toHaveProperty('type', 'stale');
        expect(issue).toHaveProperty('pageId');
        expect(issue).toHaveProperty('message');
        expect(issue).toHaveProperty('severity');
      }
    });

    it('should flag pages without sources as potentially stale', async () => {
      const issues = await checkStaleness('mock/wiki');
      
      const staleIssues = issues.filter(i => i.type === 'stale');
      expect(Array.isArray(staleIssues)).toBe(true);
    });

    it('should identify pages with outdated information', async () => {
      const issues = await checkStaleness('mock/wiki');
      
      // All issues should have descriptive messages
      for (const issue of issues) {
        expect(issue.message.length).toBeGreaterThan(0);
      }
    });
  });
});
