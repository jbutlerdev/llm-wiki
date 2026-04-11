/**
 * Tests for LintReport type - Phase 1
 */
import { describe, it, expect } from 'vitest';
import type { LintReport, LintIssue, LintIssueType, LintSeverity, CoverageGap } from './index.js';

describe('LintReport type', () => {
  it('should include all required fields', () => {
    const report: LintReport = {
      timestamp: new Date(),
      issues: [],
      summary: {
        contradictions: 0,
        orphans: 0,
        stale: 0,
        coverage: [],
      },
    };

    expect(report.timestamp).toBeInstanceOf(Date);
    expect(report.issues).toEqual([]);
    expect(report.summary.contradictions).toBe(0);
    expect(report.summary.orphans).toBe(0);
    expect(report.summary.stale).toBe(0);
    expect(report.summary.coverage).toEqual([]);
  });

  it('should validate lint issue types', () => {
    const issueTypes: LintIssueType[] = ['contradiction', 'orphan', 'stale', 'coverage'];

    issueTypes.forEach((type) => {
      const issue: LintIssue = {
        type,
        pageId: 'test-page',
        message: `Test ${type} issue`,
        severity: 'warning',
      };
      expect(issue.type).toBe(type);
    });
  });

  it('should validate lint severity levels', () => {
    const severities: LintSeverity[] = ['error', 'warning', 'info'];

    severities.forEach((severity) => {
      const issue: LintIssue = {
        type: 'orphan',
        pageId: 'test-page',
        message: 'Test issue',
        severity,
      };
      expect(issue.severity).toBe(severity);
    });
  });

  it('should include coverage gaps', () => {
    const gap: CoverageGap = {
      concept: 'Machine Learning',
      description: 'No pages covering neural networks',
      suggestedPages: ['entity/neural-networks', 'summary/ml-overview'],
    };

    expect(gap.concept).toBe('Machine Learning');
    expect(gap.suggestedPages).toHaveLength(2);
  });
});
