/**
 * Performance optimizations for wiki operations
 * @module @llm-wiki/core/performance/optimizations
 */

// ============================================================================
// Caching Utilities
// ============================================================================

/**
 * Simple in-memory cache with TTL support
 */
export class TTLCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  private readonly defaultTTL: number;

  constructor(defaultTTLMs: number = 60000) {
    this.defaultTTL = defaultTTLMs;
  }

  set(key: K, value: V, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get or compute value if not cached
   */
  getOrSet(key: K, compute: () => V, ttlMs?: number): V {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const value = compute();
    this.set(key, value, ttlMs);
    return value;
  }
}

/**
 * LRU (Least Recently Used) cache with maximum size
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value === undefined) return undefined;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // Delete if exists to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  /**
   * Get or compute value if not cached
   */
  getOrSet(key: K, compute: () => V): V {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const value = compute();
    this.set(key, value);
    return value;
  }
}

// ============================================================================
// Debouncing & Throttling
// ============================================================================

/**
 * Debounce a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = undefined;
    }, delayMs);
  };
}

/**
 * Debounce with leading edge
 */
export function debounceLeading<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;

  return (...args: Parameters<T>) => {
    lastArgs = args;

    if (timeoutId === undefined) {
      fn(...args);
    }

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      if (lastArgs && timeoutId === undefined) {
        fn(...lastArgs);
      }
    }, delayMs);
  };
}

/**
 * Throttle a function call
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun >= limitMs) {
      lastRun = now;
      fn(...args);
    }
  };
}

/**
 * Batch multiple calls into a single operation
 */
export function batch<T, R>(
  fn: (items: T[]) => Promise<R[]>,
  delayMs: number = 100
): (item: T) => Promise<R> {
  let pending: { item: T; resolve: (r: R) => void }[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const process = async () => {
    if (pending.length === 0) return;

    const current = pending;
    pending = [];
    timeoutId = undefined;

    const results = await fn(current.map((p) => p.item));
    current.forEach((p, i) => p.resolve(results[i]));
  };

  return (item: T): Promise<R> => {
    return new Promise((resolve) => {
      pending.push({ item, resolve });

      if (timeoutId === undefined) {
        timeoutId = setTimeout(process, delayMs);
      }
    });
  };
}

// ============================================================================
// Lazy Loading
// ============================================================================

/**
 * Lazy initialization for expensive computations
 */
export class LazyValue<T> {
  private _value: T | undefined;
  private _initialized = false;
  private readonly init: () => T;

  constructor(init: () => T) {
    this.init = init;
  }

  get value(): T {
    if (!this._initialized) {
      this._value = this.init();
      this._initialized = true;
    }
    return this._value!;
  }

  get isInitialized(): boolean {
    return this._initialized;
  }

  reset(): void {
    this._value = undefined;
    this._initialized = false;
  }
}

/**
 * Async lazy initialization
 */
export class AsyncLazyValue<T> {
  private _promise: Promise<T> | undefined;
  private readonly init: () => Promise<T>;

  constructor(init: () => Promise<T>) {
    this.init = init;
  }

  get promise(): Promise<T> {
    if (!this._promise) {
      this._promise = this.init();
    }
    return this._promise;
  }

  reset(): void {
    this._promise = undefined;
  }
}

// ============================================================================
// Memoization
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

/**
 * Memoize a function with LRU cache
 */
export function memoize<T extends AnyFunction>(
  fn: T,
  maxSize: number = 100,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new LRUCache<string, ReturnType<T>>(maxSize);
  const defaultKeyFn = (...args: Parameters<T>) => JSON.stringify(args);

  return ((...args: Parameters<T>) => {
    const key = (keyFn ?? defaultKeyFn)(...args);
    return cache.getOrSet(key, () => fn(...args)) as ReturnType<T>;
  }) as T;
}

// ============================================================================
// Array Optimizations
// ============================================================================

/**
 * Efficient chunking of arrays
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Efficient deduplication for primitives
 */
export function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Efficient deduplication for objects using a key function
 */
export function dedupeBy<T, K>(
  arr: T[],
  keyFn: (item: T) => K
): T[] {
  const seen = new Set<K>();
  const result: T[] = [];

  for (const item of arr) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

// ============================================================================
// String Optimizations
// ============================================================================

/**
 * Fast slug generation
 */
export function fastSlugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Efficient string interpolation
 */
export function interpolate(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    String(values[key] ?? `{{${key}}}`)
  );
}

/**
 * Pool of reusable regex patterns
 */
export const REGEX_POOL = {
  wikiLink: /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g,
  markdownLink: /\[([^\]]+)\]\(([^)]+)\)/g,
  heading: /^#{1,6}\s+(.+)$/gm,
  codeBlock: /```[\s\S]*?```/g,
  frontmatter: /^---\n([\s\S]*?)\n---\n/,
  tag: /\btag[s]?:\s*\[([^\]]+)\]/,
  yamlKeyValue: /^(\w+):\s*(.+)$/gm,
} as const;

// ============================================================================
// Export barrel
// ============================================================================

export * from './benchmarks.js';
