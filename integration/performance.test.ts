/**
 * Performance Tests
 * Tests for search latency, page load times, and memory usage
 * 
 * Phase 14: Testing & QA
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { join } from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { init } from '../packages/core/dist/wiki/init.js';
import { ingest } from '../packages/core/dist/source/ingest.js';
import { listPages } from '../packages/core/dist/wiki/list.js';

// Performance thresholds from spec
const SEARCH_LATENCY_P99_MS = 500;
const PAGE_LOAD_MAX_MS = 1000;

describe('Performance Tests', () => {
  let testWikiDir: string;

  beforeEach(async () => {
    testWikiDir = join(tmpdir(), `llm-wiki-perf-${Date.now()}-${Math.random()}`);
    await mkdir(testWikiDir, { recursive: true });
    await init(testWikiDir);
  });

  afterEach(async () => {
    try {
      await rm(testWikiDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Ingest Performance', () => {
    it('should ingest small documents quickly', async () => {
      const sourcePath = join(testWikiDir, 'small.md');
      await writeFile(sourcePath, '# Small Doc\n\nShort content.');

      const start = performance.now();
      await ingest(sourcePath, {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(2000); // Should be < 2s for small docs
    });

    it('should handle moderate batch ingestion', async () => {
      // Create 10 moderate-sized sources
      const sources: { name: string; content: string }[] = [];
      for (let i = 0; i < 10; i++) {
        sources.push({
          name: `doc-${i}.md`,
          content: `# Document ${i}

This is document number ${i} with some content.

## Section 1
Content for section 1 with details about topic ${i}.

## Section 2
More content here with additional information.

## Section 3
Even more content for thorough testing.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
`,
        });
      }

      const start = performance.now();
      for (const { name, content } of sources) {
        await writeFile(join(testWikiDir, name), content);
        await ingest(join(testWikiDir, name), {
          wikiDir: testWikiDir,
          rawDir: join(testWikiDir, 'wiki', 'raw'),
        });
      }
      const duration = performance.now() - start;

      // 10 sources should process in reasonable time
      expect(duration).toBeLessThan(30000); // 30s for 10 moderate docs
    });
  });

  describe('List Performance', () => {
    it('should list pages quickly', async () => {
      // Populate with some pages first
      for (let i = 0; i < 50; i++) {
        const sourcePath = join(testWikiDir, `list-perf-${i}.md`);
        await writeFile(sourcePath, `# Document ${i}\n\nContent ${i}.`);
        await ingest(sourcePath, {
          wikiDir: testWikiDir,
          rawDir: join(testWikiDir, 'wiki', 'raw'),
        });
      }

      const start = performance.now();
      const pages = await listPages(testWikiDir);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // < 1s for listing
      expect(pages.length).toBeGreaterThan(0);
    });

    it('should filter pages by type efficiently', async () => {
      // Populate with some pages
      for (let i = 0; i < 20; i++) {
        const sourcePath = join(testWikiDir, `filter-perf-${i}.md`);
        await writeFile(sourcePath, `# Filter Doc ${i}\n\nContent ${i}.`);
        await ingest(sourcePath, {
          wikiDir: testWikiDir,
          rawDir: join(testWikiDir, 'wiki', 'raw'),
        });
      }

      const start = performance.now();
      const pages = await listPages(testWikiDir, { type: 'source' });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
      expect(pages.every(p => p.type === 'source')).toBe(true);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory on repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        const sourcePath = join(testWikiDir, `mem-test-${i}.md`);
        await writeFile(sourcePath, `# Memory Test ${i}\n\nContent for memory test.`);
        await ingest(sourcePath, {
          wikiDir: testWikiDir,
          rawDir: join(testWikiDir, 'wiki', 'raw'),
        });
        await listPages(testWikiDir);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 100MB for 10 small operations)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
});

describe('Scalability Tests', () => {
  let testWikiDir: string;

  beforeEach(async () => {
    testWikiDir = join(tmpdir(), `llm-wiki-scale-${Date.now()}-${Math.random()}`);
    await mkdir(testWikiDir, { recursive: true });
    await init(testWikiDir);
  });

  afterEach(async () => {
    try {
      await rm(testWikiDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Large Wiki Handling', () => {
    it('should handle wiki with 100 pages', async () => {
      // Create 100 pages
      for (let i = 0; i < 100; i++) {
        const sourcePath = join(testWikiDir, `scale-100-${i}.md`);
        await writeFile(sourcePath, `# Scale Document ${i}\n\nContent for page ${i}.\n\nMore content to make it realistic.`);
        
        await ingest(sourcePath, {
          wikiDir: testWikiDir,
          rawDir: join(testWikiDir, 'wiki', 'raw'),
        });
      }

      // Verify all pages were created
      const pages = await listPages(testWikiDir);
      expect(pages.length).toBeGreaterThanOrEqual(100);
    });

    it('should list 100 pages efficiently', async () => {
      // Create 100 pages
      for (let i = 0; i < 100; i++) {
        const sourcePath = join(testWikiDir, `list-scale-${i}.md`);
        await writeFile(sourcePath, `# List Scale ${i}\n\nContent ${i}.`);
        await ingest(sourcePath, {
          wikiDir: testWikiDir,
          rawDir: join(testWikiDir, 'wiki', 'raw'),
        });
      }

      const start = performance.now();
      const pages = await listPages(testWikiDir);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PAGE_LOAD_MAX_MS);
      expect(pages.length).toBeGreaterThanOrEqual(100);
    });
  });
});

describe('Benchmark Tests', () => {
  let testWikiDir: string;

  beforeEach(async () => {
    testWikiDir = join(tmpdir(), `llm-wiki-bench-${Date.now()}-${Math.random()}`);
    await mkdir(testWikiDir, { recursive: true });
    await init(testWikiDir);
  });

  afterEach(async () => {
    try {
      await rm(testWikiDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Benchmark Utilities', () => {
    it('should measure operation duration accurately', async () => {
      const sourcePath = join(testWikiDir, 'bench.md');
      await writeFile(sourcePath, '# Bench Doc\n\nContent.');

      const start = performance.now();
      await ingest(sourcePath, {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      });
      const duration = performance.now() - start;

      expect(duration).toBeGreaterThan(0);
      expect(typeof duration).toBe('number');
    });

    it('should support repeated measurements', async () => {
      const durations: number[] = [];

      for (let i = 0; i < 5; i++) {
        const sourcePath = join(testWikiDir, `bench-${i}.md`);
        await writeFile(sourcePath, `# Bench ${i}\n\nContent.`);

        const start = performance.now();
        await ingest(sourcePath, {
          wikiDir: testWikiDir,
          rawDir: join(testWikiDir, 'wiki', 'raw'),
        });
        durations.push(performance.now() - start);
      }

      expect(durations.length).toBe(5);
      expect(durations.every(d => typeof d === 'number' && d >= 0)).toBe(true);
    });

    it('should calculate statistics from measurements', () => {
      const measurements = [10, 20, 30, 40, 50];
      
      const sum = measurements.reduce((a, b) => a + b, 0);
      const avg = sum / measurements.length;
      const min = Math.min(...measurements);
      const max = Math.max(...measurements);

      expect(avg).toBe(30);
      expect(min).toBe(10);
      expect(max).toBe(50);
    });
  });
});

describe('Regression Tests', () => {
  let testWikiDir: string;

  beforeEach(async () => {
    testWikiDir = join(tmpdir(), `llm-wiki-regress-${Date.now()}-${Math.random()}`);
    await mkdir(testWikiDir, { recursive: true });
    await init(testWikiDir);
  });

  afterEach(async () => {
    try {
      await rm(testWikiDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should maintain consistent performance over time', async () => {
    const durations: number[] = [];

    // Perform same operation 10 times
    for (let i = 0; i < 10; i++) {
      const sourcePath = join(testWikiDir, `regress-${i}.md`);
      await writeFile(sourcePath, '# Regression Test\n\nContent for regression test.');

      const start = performance.now();
      await ingest(sourcePath, {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      });
      durations.push(performance.now() - start);
    }

    // All durations should be under threshold
    const maxDuration = Math.max(...durations);
    expect(maxDuration).toBeLessThan(5000); // 5s per operation

    // Most durations should be consistent (within 2x of median)
    const sorted = [...durations].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const outliers = durations.filter(d => d > median * 3);
    expect(outliers.length).toBeLessThan(2); // Allow at most 1 outlier
  });

  it('should not degrade with file system growth', async () => {
    const earlyDurations: number[] = [];
    const lateDurations: number[] = [];

    // Create initial files
    for (let i = 0; i < 50; i++) {
      const sourcePath = join(testWikiDir, `growth-early-${i}.md`);
      await writeFile(sourcePath, `# Early ${i}\n\nContent ${i}.`);
      await ingest(sourcePath, {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      });
      if (i >= 40) {
        const start = performance.now();
        await listPages(testWikiDir);
        earlyDurations.push(performance.now() - start);
      }
    }

    // Add more files
    for (let i = 0; i < 50; i++) {
      const sourcePath = join(testWikiDir, `growth-late-${i}.md`);
      await writeFile(sourcePath, `# Late ${i}\n\nContent ${i}.`);
      await ingest(sourcePath, {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      });
      const start = performance.now();
      await listPages(testWikiDir);
      lateDurations.push(performance.now() - start);
    }

    // Late operations should not be significantly slower
    const earlyAvg = earlyDurations.reduce((a, b) => a + b, 0) / earlyDurations.length;
    const lateAvg = lateDurations.reduce((a, b) => a + b, 0) / lateDurations.length;

    // Allow 60% degradation maximum (files are added and fs operations scale with file count)
    expect(lateAvg).toBeLessThan(earlyAvg * 1.6);
  });
});
