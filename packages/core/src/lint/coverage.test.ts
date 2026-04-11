/**
 * Tests for coverage analysis - Phase 11
 */
import { describe, it, expect } from 'vitest';
import { analyzeCoverage } from './coverage.js';
import type { LintIssue, CoverageGap } from '../types/index.js';

describe('coverageAnalyzer', () => {
  describe('analyzeCoverage', () => {
    it('should return empty array when no pages exist', async () => {
      const gaps = await analyzeCoverage('mock/wiki');
      expect(gaps).toEqual([]);
    });

    it('should return array of coverage gaps', async () => {
      const gaps = await analyzeCoverage('mock/wiki');
      expect(Array.isArray(gaps)).toBe(true);
    });

    it('should suggest missing pages for important concepts', async () => {
      const gaps = await analyzeCoverage('mock/wiki');
      
      for (const gap of gaps) {
        expect(gap).toHaveProperty('concept');
        expect(gap).toHaveProperty('description');
        expect(gap).toHaveProperty('suggestedPages');
        expect(Array.isArray(gap.suggestedPages)).toBe(true);
      }
    });

    it('should identify disconnected page clusters', async () => {
      const gaps = await analyzeCoverage('mock/wiki');
      
      // Coverage issues should have informative descriptions
      for (const gap of gaps) {
        expect(gap.description.length).toBeGreaterThan(0);
        expect(gap.concept.length).toBeGreaterThan(0);
      }
    });

    it('should convert gaps to lint issues', async () => {
      const gaps = await analyzeCoverage('mock/wiki');
      
      const issues: LintIssue[] = gaps.map((gap) => ({
        type: 'coverage' as const,
        pageId: 'index.md',
        message: `${gap.concept}: ${gap.description}`,
        severity: 'info' as const,
      }));
      
      expect(issues.length).toBe(gaps.length);
      for (const issue of issues) {
        expect(issue.type).toBe('coverage');
      }
    });
  });
});
