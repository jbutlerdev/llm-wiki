import { watch, type FSWatcher } from 'chokidar';
import type { QMDStoreWrapper } from './store.js';

/**
 * Wiki watcher options
 */
export interface WikiWatcherOptions {
  /** Auto-start watching on creation */
  autoStart?: boolean;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Batch size for updates */
  batchSize?: number;
  /** Callback for file changes */
  onChange?: (event: WatchEvent) => void;
  /** Callback for batch updates */
  onBatch?: (events: WatchEvent[]) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Glob patterns to ignore */
  ignorePatterns?: string[];
}

/**
 * Watch event for a single file change
 */
export interface WatchEvent {
  /** Event type */
  type: 'add' | 'change' | 'unlink';
  /** File path relative to wiki root */
  path: string;
  /** Absolute file path */
  absolutePath: string;
  /** Timestamp of event */
  timestamp: Date;
}

/**
 * Wiki watcher for auto-indexing
 */
export interface WikiWatcher {
  /** Start watching for file changes */
  start(): Promise<void>;
  /** Stop watching */
  stop(): Promise<void>;
  /** Check if currently watching */
  isWatching(): boolean;
  /** Force a re-index of all files */
  reindex(): Promise<void>;
  /** Get recent events */
  getRecentEvents(limit?: number): WatchEvent[];
}

/**
 * Default ignore patterns for wiki files
 */
const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.llm-wiki/**',
  '**/*.tmp',
  '**/*.swp',
  '**/.DS_Store',
];

/**
 * Create a wiki watcher for auto-indexing
 */
export function createWikiWatcher(
  wrapper: QMDStoreWrapper,
  options: WikiWatcherOptions = {}
): WikiWatcher {
  const {
    autoStart = false,
    debounceMs = 500,
    batchSize = 10,
    onChange,
    onBatch,
    onError,
    ignorePatterns = [],
  } = options;

  const { wikiDir, getStore } = wrapper;
  let watcher: FSWatcher | null = null;
  let watching = false;
  
  // Event queue for batching
  const eventQueue: WatchEvent[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Recent events for getRecentEvents
  const recentEvents: WatchEvent[] = [];
  const MAX_RECENT_EVENTS = 100;

  const processEventQueue = async () => {
    if (eventQueue.length === 0) return;

    // Get batch of events
    const batch = eventQueue.splice(0, batchSize);
    
    // Update QMD index
    try {
      const store = getStore();
      await store.update({
        collections: [wrapper.getWikiCollection()],
      });

      // Call batch callback
      if (onBatch) {
        onBatch(batch);
      }
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  const scheduleProcess = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(processEventQueue, debounceMs);
  };

  const handleEvent = (type: 'add' | 'change' | 'unlink', absolutePath: string) => {
    // Only process markdown files in wiki directories
    const relativePath = wrapper.toRelativePath(absolutePath);
    if (!relativePath || !relativePath.endsWith('.md')) {
      return;
    }

    const event: WatchEvent = {
      type,
      path: relativePath,
      absolutePath,
      timestamp: new Date(),
    };

    // Track recent events
    recentEvents.push(event);
    if (recentEvents.length > MAX_RECENT_EVENTS) {
      recentEvents.shift();
    }

    // Add to queue and schedule processing
    eventQueue.push(event);
    scheduleProcess();

    // Call individual change callback
    if (onChange) {
      onChange(event);
    }
  };

  const start = async () => {
    if (watching) return;

    const ignore = [...DEFAULT_IGNORE_PATTERNS, ...ignorePatterns];

    watcher = watch(wikiDir, {
      persistent: true,
      ignoreInitial: true,
      ignored: ignore,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    watcher.on('add', (filePath) => handleEvent('add', filePath));
    watcher.on('change', (filePath) => handleEvent('change', filePath));
    watcher.on('unlink', (filePath) => handleEvent('unlink', filePath));
    watcher.on('error', (error: unknown) => {
      if (onError && error instanceof Error) {
        onError(error);
      }
    });

    watching = true;

    // Do initial index scan
    try {
      const store = getStore();
      await store.update({
        collections: [wrapper.getWikiCollection()],
      });
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  const stop = async () => {
    if (!watching || !watcher) return;

    // Clear pending timers
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    // Process any remaining events
    await processEventQueue();

    // Close watcher
    await watcher.close();
    watcher = null;
    watching = false;
  };

  const isWatching = () => watching;

  const reindex = async () => {
    const store = getStore();
    await store.update({
      collections: [wrapper.getWikiCollection()],
    });
  };

  const getRecentEvents = (limit?: number): WatchEvent[] => {
    const events = limit ? recentEvents.slice(-limit) : [...recentEvents];
    return events;
  };

  // Auto-start if requested
  if (autoStart) {
    start().catch((error) => {
      if (onError) {
        onError(error);
      }
    });
  }

  return {
    start,
    stop,
    isWatching,
    reindex,
    getRecentEvents,
  };
}
