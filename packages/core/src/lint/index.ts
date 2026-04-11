/**
 * Lint operations barrel export
 * @module @llm-wiki/core/lint
 */

export { detectWikiContradictions } from './contradiction.js';
export { checkStaleness } from './staleness.js';
export { analyzeCoverage } from './coverage.js';
export { runLint, runLintChecks } from './runner.js';
export type { LintRunnerOptions, LintCheckResult } from './runner.js';
