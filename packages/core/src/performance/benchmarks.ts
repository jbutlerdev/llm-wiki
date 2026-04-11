/**
 * Performance benchmarks for wiki operations
 * @module @llm-wiki/core/performance/benchmarks
 */

import type { WikiPage } from '../types/index.js';

// ============================================================================
// Benchmark Result Types
// ============================================================================

/**
 * Result of a single benchmark run
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSecond: number;
}

/**
 * Performance benchmark suite results
 */
export interface BenchmarkSuite {
  name: string;
  timestamp: Date;
  results: BenchmarkResult[];
  summary: {
    totalTimeMs: number;
    passed: boolean;
    failures: string[];
  };
}

// ============================================================================
// Benchmark Utilities
// ============================================================================

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

/**
 * Run a function multiple times and collect timing data
 */
export function runBenchmark<T>(
  name: string,
  fn: () => T | Promise<T>,
  iterations: number = 100,
  warmup: number = 10
): BenchmarkResult {
  const times: number[] = [];

  // Warmup runs
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  // Benchmark runs
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  // Sort times for percentile calculations
  const sortedTimes = [...times].sort((a, b) => a - b);

  const totalMs = sortedTimes.reduce((a, b) => a + b, 0);

  return {
    name,
    iterations,
    totalMs,
    avgMs: totalMs / iterations,
    minMs: sortedTimes[0],
    maxMs: sortedTimes[sortedTimes.length - 1],
    p50Ms: percentile(sortedTimes, 50),
    p95Ms: percentile(sortedTimes, 95),
    p99Ms: percentile(sortedTimes, 99),
    opsPerSecond: (1000 * iterations) / totalMs,
  };
}

// ============================================================================
// Performance Benchmarks
// ============================================================================

/**
 * Target performance thresholds based on spec requirements
 */
export const PERFORMANCE_TARGETS = {
  // Search latency: <500ms for hybrid query on 1,000-page wiki
  searchLatency: {
    p50: 100,
    p95: 250,
    p99: 500,
    unit: 'ms',
  },
  // Web page load: <1s initial load, <100ms navigation
  pageLoad: {
    initial: 1000,
    navigation: 100,
    unit: 'ms',
  },
  // Ingest throughput: Process 10 sources/minute
  ingestThroughput: {
    sourcesPerMinute: 10,
    avgMsPerSource: 6000,
    unit: 'ms',
  },
  // Memory footprint: <500MB baseline
  memoryFootprint: {
    baseline: 500 * 1024 * 1024,
    underLoad: 2 * 1024 * 1024 * 1024,
    unit: 'bytes',
  },
  // Startup time: <2 seconds for CLI commands, <3 seconds for server
  startupTime: {
    cli: 2000,
    server: 3000,
    unit: 'ms',
  },
} as const;

/**
 * Check if a benchmark result meets performance targets
 */
export function meetsTarget(
  result: BenchmarkResult,
  target: typeof PERFORMANCE_TARGETS.searchLatency
): boolean {
  return result.p99Ms <= target.p99;
}

// ============================================================================
// Page Operation Benchmarks
// ============================================================================

/**
 * Benchmark page parsing (simulating loadPage)
 */
export function benchmarkPageParsing(
  pages: WikiPage[],
  iterations: number = 100
): BenchmarkResult {
  // Create sample markdown content
  const samplePage = pages[0];
  const content = samplePage
    ? `---\ntitle: ${samplePage.title}\ntype: ${samplePage.type}\ntags: [${samplePage.frontmatter.tags.join(', ')}]\n---\n\n${samplePage.content}`
    : '';

  let parseCount = 0;

  return runBenchmark('page_parsing', () => {
    // Simulate parsing frontmatter and content
    const frontmatterEnd = content.indexOf('---', 3);
    if (frontmatterEnd > 0) {
      const frontmatter = content.substring(0, frontmatterEnd);
      const body = content.substring(frontmatterEnd + 3);
      parseCount++;
      return { frontmatter, body, length: content.length };
    }
    parseCount++;
    return { frontmatter: '', body: content, length: content.length };
  }, iterations);
}

/**
 * Benchmark page serialization (simulating createPage)
 */
export function benchmarkPageSerialization(
  pages: WikiPage[],
  iterations: number = 100
): BenchmarkResult {
  const samplePage = pages[0];

  return runBenchmark('page_serialization', () => {
    if (!samplePage) return '';
    // Simulate frontmatter + content serialization
    const frontmatter = [
      '---',
      `title: ${samplePage.title}`,
      `type: ${samplePage.type}`,
      `tags: [${samplePage.frontmatter.tags.join(', ')}]`,
      `createdAt: ${samplePage.createdAt.toISOString()}`,
      `lastModified: ${samplePage.lastModified.toISOString()}`,
      '---',
      '',
    ].join('\n');
    return frontmatter + '\n' + samplePage.content;
  }, iterations);
}

/**
 * Benchmark link extraction
 */
export function benchmarkLinkExtraction(
  pages: WikiPage[],
  iterations: number = 100
): BenchmarkResult {
  const sampleContent = pages
    .map((p) => p.content)
    .join('\n\n');

  const linkPattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

  return runBenchmark('link_extraction', () => {
    const links: string[] = [];
    let match;
    while ((match = linkPattern.exec(sampleContent)) !== null) {
      links.push(match[1]);
    }
    linkPattern.lastIndex = 0;
    return links;
  }, iterations);
}

/**
 * Benchmark tag extraction
 */
export function benchmarkTagExtraction(
  pages: WikiPage[],
  iterations: number = 100
): BenchmarkResult {
  return runBenchmark('tag_extraction', () => {
    const allTags = new Set<string>();
    for (const page of pages) {
      for (const tag of page.frontmatter.tags) {
        allTags.add(tag);
      }
    }
    return Array.from(allTags);
  }, iterations);
}

// ============================================================================
// Search Benchmarks
// ============================================================================

/**
 * Benchmark search result ranking
 */
export function benchmarkResultRanking(
  iterations: number = 100
): BenchmarkResult {
  // Generate fake search results
  const fakeResults = Array.from({ length: 50 }, (_, i) => ({
    id: `doc_${i}`,
    score: Math.random(),
    snippet: `Sample result ${i} with some content`,
  }));

  return runBenchmark('result_ranking', () => {
    return [...fakeResults].sort((a, b) => b.score - a.score);
  }, iterations);
}

/**
 * Benchmark query expansion
 */
export function benchmarkQueryExpansion(
  iterations: number = 100
): BenchmarkResult {
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
  ]);

  const queries = [
    'what is machine learning',
    'how to use the api',
    'difference between python and javascript',
    'best practices for testing',
  ];

  let queryIndex = 0;

  return runBenchmark('query_expansion', () => {
    const query = queries[queryIndex % queries.length];
    queryIndex++;
    const words = query.split(/\s+/);
    const expanded = words.filter((w) => !stopWords.has(w.toLowerCase()));
    return expanded.join(' ');
  }, iterations);
}

// ============================================================================
// Memory Benchmarks
// ============================================================================

/**
 * Get current memory usage (Node.js)
 */
export function getMemoryUsage(): {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
} {
  const mem = process.memoryUsage();
  return {
    rss: mem.rss,
    heapTotal: mem.heapTotal,
    heapUsed: mem.heapUsed,
    external: mem.external,
  };
}

/**
 * Benchmark memory footprint for page operations
 */
export function benchmarkMemoryFootprint(
  pages: WikiPage[],
  iterations: number = 10
): BenchmarkResult {
  const pageCopies: WikiPage[][] = [];

  return runBenchmark('memory_footprint', () => {
    // Clear previous copies
    pageCopies.length = 0;
    // Create deep copies of pages
    for (let i = 0; i < iterations; i++) {
      pageCopies.push(
        pages.map((p) => ({
          ...p,
          frontmatter: { ...p.frontmatter },
        }))
      );
    }
    const mem = getMemoryUsage();
    return mem.heapUsed;
  }, 5, 2);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format benchmark result for display
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  return [
    `${result.name}:`,
    `  Iterations: ${result.iterations}`,
    `  Total: ${result.totalMs.toFixed(2)}ms`,
    `  Avg: ${result.avgMs.toFixed(2)}ms`,
    `  Min: ${result.minMs.toFixed(2)}ms`,
    `  Max: ${result.maxMs.toFixed(2)}ms`,
    `  P50: ${result.p50Ms.toFixed(2)}ms`,
    `  P95: ${result.p95Ms.toFixed(2)}ms`,
    `  P99: ${result.p99Ms.toFixed(2)}ms`,
    `  Ops/sec: ${result.opsPerSecond.toFixed(2)}`,
  ].join('\n');
}

/**
 * Run a suite of benchmarks
 */
export async function runBenchmarkSuite(
  name: string,
  benchmarks: Array<() => BenchmarkResult | Promise<BenchmarkResult>>,
  pages: WikiPage[] = []
): Promise<BenchmarkSuite> {
  const results: BenchmarkResult[] = [];
  const failures: string[] = [];
  const startTime = Date.now();

  for (const benchmark of benchmarks) {
    try {
      const result = await benchmark();
      results.push(result);
      console.log(formatBenchmarkResult(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      console.error(`Benchmark failed: ${message}`);
    }
  }

  const totalTimeMs = Date.now() - startTime;

  return {
    name,
    timestamp: new Date(),
    results,
    summary: {
      totalTimeMs,
      passed: failures.length === 0,
      failures,
    },
  };
}
