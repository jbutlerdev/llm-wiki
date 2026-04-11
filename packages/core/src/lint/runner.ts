/**
 * Lint runner - combines all lint checks
 * @module @llm-wiki/core/lint/runner
 */

import type { LintIssue, LintReport, LintOptions } from '../types/index.js';
import { detectWikiContradictions } from './contradiction.js';
import { checkStaleness } from './staleness.js';
import { analyzeCoverage } from './coverage.js';
import { getOrphanPages } from '../wiki/list.js';

/**
 * Options for lint runner
 */
export interface LintRunnerOptions {
  /** Run contradiction detection */
  checkContradictions?: boolean;
  /** Run staleness check */
  checkStaleness?: boolean;
  /** Run orphan detection */
  checkOrphans?: boolean;
  /** Run coverage analysis */
  checkCoverage?: boolean;
  /** Include fixes for issues where possible */
  fix?: boolean;
  /** Specific issue types to check */
  types?: ('contradiction' | 'orphan' | 'stale' | 'coverage')[];
}

/**
 * Result of a single lint check
 */
export interface LintCheckResult {
  name: string;
  issues: LintIssue[];
  duration: number;
  error?: string;
}

/**
 * Run all lint checks and return a combined report
 */
export async function runLintChecks(
  wikiDir: string,
  options: LintRunnerOptions = {}
): Promise<LintCheckResult[]> {
  const results: LintCheckResult[] = [];
  
  const shouldCheck = (check: string) => {
    if (options.types && options.types.length > 0) {
      return options.types.includes(check as any);
    }
    return true;
  };

  // Run contradiction detection
  if (shouldCheck('contradiction') && options.checkContradictions !== false) {
    const start = Date.now();
    try {
      const issues = await detectWikiContradictions(wikiDir);
      results.push({
        name: 'Contradiction Detection',
        issues,
        duration: Date.now() - start,
      });
    } catch (error) {
      results.push({
        name: 'Contradiction Detection',
        issues: [],
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Run staleness check
  if (shouldCheck('stale') && options.checkStaleness !== false) {
    const start = Date.now();
    try {
      const issues = await checkStaleness(wikiDir);
      results.push({
        name: 'Staleness Check',
        issues,
        duration: Date.now() - start,
      });
    } catch (error) {
      results.push({
        name: 'Staleness Check',
        issues: [],
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Run orphan detection
  if (shouldCheck('orphan') && options.checkOrphans !== false) {
    const start = Date.now();
    try {
      const orphans = await getOrphanPages(wikiDir);
      const issues: LintIssue[] = orphans.map(page => ({
        type: 'orphan',
        pageId: `${page.type}/${page.slug}`,
        message: `Page "${page.title}" has no incoming links from other wiki pages`,
        severity: orphans.length > 5 ? 'info' : 'warning',
      }));
      results.push({
        name: 'Orphan Detection',
        issues,
        duration: Date.now() - start,
      });
    } catch (error) {
      results.push({
        name: 'Orphan Detection',
        issues: [],
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Run coverage analysis
  if (shouldCheck('coverage') && options.checkCoverage !== false) {
    const start = Date.now();
    try {
      const gaps = await analyzeCoverage(wikiDir);
      const issues: LintIssue[] = gaps.map(gap => ({
        type: 'coverage',
        pageId: 'index.md',
        message: `${gap.concept}: ${gap.description}`,
        severity: 'info',
      }));
      results.push({
        name: 'Coverage Analysis',
        issues,
        duration: Date.now() - start,
      });
    } catch (error) {
      results.push({
        name: 'Coverage Analysis',
        issues: [],
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Run lint and return a complete LintReport
 */
export async function runLint(
  wikiDir: string,
  options: LintOptions = {}
): Promise<LintReport> {
  const checkResults = await runLintChecks(wikiDir, {
    checkContradictions: true,
    checkStaleness: true,
    checkOrphans: true,
    checkCoverage: true,
    fix: options.fix,
    types: options.types,
  });

  const allIssues: LintIssue[] = [];
  
  for (const result of checkResults) {
    allIssues.push(...result.issues);
  }

  return {
    timestamp: new Date(),
    issues: allIssues,
    summary: {
      contradictions: allIssues.filter(i => i.type === 'contradiction').length,
      orphans: allIssues.filter(i => i.type === 'orphan').length,
      stale: allIssues.filter(i => i.type === 'stale').length,
      coverage: allIssues
        .filter(i => i.type === 'coverage')
        .map(i => ({
          concept: i.pageId,
          description: i.message,
          suggestedPages: [],
        })),
    },
  };
}
