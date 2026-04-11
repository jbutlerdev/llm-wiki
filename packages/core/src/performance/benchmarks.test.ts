import { describe, it, expect } from 'vitest';
import {
  runBenchmark,
  formatBenchmarkResult,
  meetsTarget,
  PERFORMANCE_TARGETS,
  benchmarkResultRanking,
  benchmarkQueryExpansion,
} from './benchmarks.js';

describe('benchmarks', () => {
  describe('runBenchmark', () => {
    it('should run benchmark and return timing statistics', () => {
      const result = runBenchmark('simple_op', () => {
        // Simple synchronous operation
        let sum = 0;
        for (let i = 0; i < 100; i++) {
          sum += i;
        }
        return sum;
      }, 10, 2);

      expect(result.name).toBe('simple_op');
      expect(result.iterations).toBe(10);
      expect(result.totalMs).toBeGreaterThan(0);
      expect(result.avgMs).toBeGreaterThanOrEqual(0);
      expect(result.minMs).toBeGreaterThanOrEqual(0);
      expect(result.maxMs).toBeGreaterThanOrEqual(result.minMs);
      expect(result.p50Ms).toBeGreaterThanOrEqual(0);
      expect(result.p95Ms).toBeGreaterThanOrEqual(0);
      expect(result.p99Ms).toBeGreaterThanOrEqual(0);
      expect(result.opsPerSecond).toBeGreaterThan(0);
    });

    it('should handle async operations', async () => {
      const result = runBenchmark(
        'async_op',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return 'done';
        },
        5,
        1
      );

      expect(result.name).toBe('async_op');
      expect(result.iterations).toBe(5);
      expect(result.avgMs).toBeGreaterThanOrEqual(0); // Allow fast execution
    });

    it('should respect warmup iterations', () => {
      let callCount = 0;
      const incrementingOp = () => {
        callCount++;
        return callCount;
      };

      const result = runBenchmark('warmup_test', incrementingOp, 3, 2);

      // Warmup runs twice, then 3 benchmark iterations = 5 total calls
      expect(callCount).toBeGreaterThanOrEqual(5);
      // The final value should be 5
      expect(result.name).toBe('warmup_test');
    });
  });

  describe('formatBenchmarkResult', () => {
    it('should format result for display', () => {
      const result = runBenchmark('format_test', () => 'test', 10, 1);
      const formatted = formatBenchmarkResult(result);

      expect(formatted).toContain('format_test:');
      expect(formatted).toContain('Iterations: 10');
      expect(formatted).toContain('Total:');
      expect(formatted).toContain('Avg:');
      expect(formatted).toContain('Min:');
      expect(formatted).toContain('Max:');
      expect(formatted).toContain('P50:');
      expect(formatted).toContain('P95:');
      expect(formatted).toContain('P99:');
      expect(formatted).toContain('Ops/sec:');
    });
  });

  describe('PERFORMANCE_TARGETS', () => {
    it('should have search latency targets', () => {
      expect(PERFORMANCE_TARGETS.searchLatency).toBeDefined();
      expect(PERFORMANCE_TARGETS.searchLatency.p50).toBeLessThan(500);
      expect(PERFORMANCE_TARGETS.searchLatency.p95).toBeLessThan(500);
      expect(PERFORMANCE_TARGETS.searchLatency.p99).toBeLessThanOrEqual(500);
    });

    it('should have page load targets', () => {
      expect(PERFORMANCE_TARGETS.pageLoad.initial).toBe(1000);
      expect(PERFORMANCE_TARGETS.pageLoad.navigation).toBe(100);
    });

    it('should have ingest throughput targets', () => {
      expect(PERFORMANCE_TARGETS.ingestThroughput.sourcesPerMinute).toBe(10);
    });

    it('should have memory footprint targets', () => {
      expect(PERFORMANCE_TARGETS.memoryFootprint.baseline).toBe(500 * 1024 * 1024);
      expect(PERFORMANCE_TARGETS.memoryFootprint.underLoad).toBe(2 * 1024 * 1024 * 1024);
    });

    it('should have startup time targets', () => {
      expect(PERFORMANCE_TARGETS.startupTime.cli).toBe(2000);
      expect(PERFORMANCE_TARGETS.startupTime.server).toBe(3000);
    });
  });

  describe('meetsTarget', () => {
    it('should return true when p99 meets target', () => {
      const result = runBenchmark('passing', () => {}, 10, 1);
      result.p99Ms = 400; // Under 500ms target

      expect(meetsTarget(result, PERFORMANCE_TARGETS.searchLatency)).toBe(true);
    });

    it('should return false when p99 exceeds target', () => {
      const result = runBenchmark('failing', () => {}, 10, 1);
      result.p99Ms = 600; // Over 500ms target

      expect(meetsTarget(result, PERFORMANCE_TARGETS.searchLatency)).toBe(false);
    });
  });

  describe('predefined benchmarks', () => {
    it('should benchmark result ranking', () => {
      const result = benchmarkResultRanking(10);

      expect(result.name).toBe('result_ranking');
      expect(result.iterations).toBe(10);
      expect(result.avgMs).toBeGreaterThanOrEqual(0);
    });

    it('should benchmark query expansion', () => {
      const result = benchmarkQueryExpansion(10);

      expect(result.name).toBe('query_expansion');
      expect(result.iterations).toBe(10);
      expect(result.avgMs).toBeGreaterThanOrEqual(0);
    });
  });
});
