import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  TTLCache,
  LRUCache,
  debounce,
  debounceLeading,
  throttle,
  batch,
  LazyValue,
  AsyncLazyValue,
  memoize,
  chunk,
  dedupe,
  dedupeBy,
  fastSlugify,
  interpolate,
} from './optimizations.js';

describe('TTLCache', () => {
  let cache: TTLCache<string, string>;

  beforeEach(() => {
    cache = new TTLCache<string, string>(100); // 100ms TTL
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should expire values after TTL', async () => {
    cache.set('key1', 'value1');

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(cache.get('key1')).toBeUndefined();
  });

  it('should support custom TTL', async () => {
    cache.set('key1', 'value1', 50); // 50ms TTL

    await new Promise((resolve) => setTimeout(resolve, 75));

    expect(cache.get('key1')).toBeUndefined();
  });

  it('should check existence with has()', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should delete values', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should clear all values', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('should get or compute value if not cached', () => {
    const compute = vi.fn(() => 'computed');
    expect(cache.getOrSet('key1', compute)).toBe('computed');
    expect(compute).toHaveBeenCalledTimes(1);

    // Second call should use cache
    expect(cache.getOrSet('key1', compute)).toBe('computed');
    expect(compute).toHaveBeenCalledTimes(1);
  });
});

describe('LRUCache', () => {
  let cache: LRUCache<string, string>;

  beforeEach(() => {
    cache = new LRUCache<string, string>(3); // Max 3 items
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should evict least recently used when at capacity', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4'); // Should evict key1

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should update existing key position', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.get('key1'); // Access key1
    cache.set('key3', 'value3');
    cache.set('key4', 'value4'); // Should evict key2

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBeUndefined();
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('debounceLeading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute on first call immediately', () => {
    const fn = vi.fn();
    const debounced = debounceLeading(fn, 100);

    debounced();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should execute trailing call after silence', () => {
    const fn = vi.fn();
    const debounced = debounceLeading(fn, 100);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute first call immediately', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should ignore subsequent calls within limit', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('batch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should batch multiple calls', async () => {
    const fn = vi.fn(async (items: number[]) => items.map((i) => i * 2));
    const batched = batch<number, number>(fn, 100);

    const p1 = batched(1);
    const p2 = batched(2);
    const p3 = batched(3);

    vi.advanceTimersByTime(100);

    const results = await Promise.all([p1, p2, p3]);
    expect(results).toEqual([2, 4, 6]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith([1, 2, 3]);
  });
});

describe('LazyValue', () => {
  it('should compute value on first access', () => {
    const compute = vi.fn(() => 'computed');
    const lazy = new LazyValue(compute);

    expect(lazy.isInitialized).toBe(false);
    expect(lazy.value).toBe('computed');
    expect(lazy.isInitialized).toBe(true);
    expect(compute).toHaveBeenCalledTimes(1);

    // Second access should use cached value
    expect(lazy.value).toBe('computed');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('should reset and recompute', () => {
    const compute = vi.fn(() => 'computed');
    const lazy = new LazyValue(compute);

    expect(lazy.value).toBe('computed');
    lazy.reset();
    expect(lazy.isInitialized).toBe(false);
    expect(lazy.value).toBe('computed');
    expect(compute).toHaveBeenCalledTimes(2);
  });
});

describe('AsyncLazyValue', () => {
  it('should start computation on first access', async () => {
    const compute = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'computed';
    });
    const lazy = new AsyncLazyValue(compute);

    const promise1 = lazy.promise;
    const promise2 = lazy.promise;

    expect(promise1).toBe(promise2); // Same promise
    expect(compute).toHaveBeenCalledTimes(1);

    const result = await promise1;
    expect(result).toBe('computed');
  });
});

describe('memoize', () => {
  it('should cache function results', () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const memoized = memoize<(a: number, b: number) => number>(fn);

    expect(memoized(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(memoized(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1); // Still 1, cached

    expect(memoized(2, 3)).toBe(5);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('chunk', () => {
  it('should split array into chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
    expect(chunk([1, 2, 3], 4)).toEqual([[1, 2, 3]]);
    expect(chunk([], 2)).toEqual([]);
  });
});

describe('dedupe', () => {
  it('should remove duplicate primitives', () => {
    expect(dedupe([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    expect(dedupe(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });
});

describe('dedupeBy', () => {
  it('should remove duplicates by key', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 1, name: 'c' },
    ];
    expect(dedupeBy(items, (i) => i.id)).toEqual([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
  });
});

describe('fastSlugify', () => {
  it('should convert text to slug', () => {
    expect(fastSlugify('Hello World')).toBe('hello-world');
    expect(fastSlugify('My API V2')).toBe('my-api-v2');
    expect(fastSlugify('Test  Multiple   Spaces')).toBe('test-multiple-spaces');
  });

  it('should handle unicode', () => {
    expect(fastSlugify('Café')).toBe('cafe');
    expect(fastSlugify('Über')).toBe('uber');
  });
});

describe('interpolate', () => {
  it('should replace placeholders with values', () => {
    expect(interpolate('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
    expect(interpolate('{{greeting}}, {{name}}!', { greeting: 'Hi', name: 'there' })).toBe('Hi, there!');
  });

  it('should keep unreplaced placeholders', () => {
    expect(interpolate('Hello {{name}}!', {})).toBe('Hello {{name}}!');
  });
});
