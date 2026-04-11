/**
 * File watcher for wiki hot-reload
 * 
 * Watches wiki directory for changes and broadcasts events via WebSocket.
 */

import { watch, type FSWatcher } from 'chokidar';
import { WebSocketManager } from './manager.js';

// Event types for file changes
export type FileEventType = 'page:created' | 'page:updated' | 'page:deleted' | 'source:added';

/**
 * File watcher options
 */
export interface FileWatcherOptions {
  /** Wiki directory to watch */
  wikiDir: string;
  /** WebSocket manager for broadcasting */
  wsManager: WebSocketManager;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Whether to watch subdirectories */
  watchSubdirs?: boolean;
}

/**
 * File event payload
 */
export interface FileEventPayload {
  path: string;
  type: FileEventType;
  timestamp: string;
}

/**
 * File watcher for wiki hot-reload
 */
export class WikiFileWatcher {
  private watcher: FSWatcher | null = null;
  private wikiDir: string;
  private wsManager: WebSocketManager;
  private debounceMs: number;
  private pendingEvents: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isWatching = false;

  constructor(options: FileWatcherOptions) {
    this.wikiDir = options.wikiDir;
    this.wsManager = options.wsManager;
    this.debounceMs = options.debounceMs ?? 300;
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      console.log('File watcher already running');
      return;
    }

    // Watch wiki directory for markdown files
    this.watcher = watch(this.wikiDir, {
      persistent: true,
      ignoreInitial: true,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.llm-wiki/**',
        '**/*.tmp',
        '**/*.swp',
        '**/.DS_Store',
        '**/raw/**', // Don't watch raw sources for hot-reload
      ],
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    this.watcher.on('add', (filePath) => this.handleFileEvent('add', filePath));
    this.watcher.on('change', (filePath) => this.handleFileEvent('change', filePath));
    this.watcher.on('unlink', (filePath) => this.handleFileEvent('unlink', filePath));

    this.watcher.on('error', (error: unknown) => {
      console.error('File watcher error:', error);
    });

    this.watcher.on('ready', () => {
      console.log('File watcher started for:', this.wikiDir);
      this.isWatching = true;
    });
  }

  /**
   * Stop watching for file changes
   */
  async stop(): Promise<void> {
    if (!this.watcher) return;

    // Clear all pending events
    for (const timeout of this.pendingEvents.values()) {
      clearTimeout(timeout);
    }
    this.pendingEvents.clear();

    await this.watcher.close();
    this.watcher = null;
    this.isWatching = false;
    console.log('File watcher stopped');
  }

  /**
   * Check if watcher is running
   */
  getIsWatching(): boolean {
    return this.isWatching;
  }

  /**
   * Handle file event with debouncing
   */
  private handleFileEvent(event: 'add' | 'change' | 'unlink', filePath: string): void {
    // Only process markdown files
    if (!filePath.endsWith('.md')) return;

    // Get relative path from wiki root
    const relativePath = filePath.replace(this.wikiDir + '/', '').replace(this.wikiDir + '\\', '');

    // Debounce events for the same file
    const existingTimeout = this.pendingEvents.get(relativePath);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.pendingEvents.delete(relativePath);
      this.broadcastEvent(relativePath, event);
    }, this.debounceMs);

    this.pendingEvents.set(relativePath, timeout);
  }

  /**
   * Broadcast event to WebSocket clients
   */
  private broadcastEvent(relativePath: string, event: 'add' | 'change' | 'unlink'): void {
    // Determine event type based on path and operation
    let eventType: FileEventType;
    let payload: FileEventPayload;

    const isSource = relativePath.startsWith('source/');
    const isPage = relativePath.includes('/') && !isSource;

    switch (event) {
      case 'add':
        if (isSource) {
          eventType = 'source:added';
        } else if (isPage) {
          eventType = 'page:created';
        } else {
          eventType = 'page:created';
        }
        break;
      case 'change':
        eventType = isSource ? 'source:added' : 'page:updated';
        break;
      case 'unlink':
        eventType = 'page:deleted';
        break;
    }

    payload = {
      path: relativePath,
      type: eventType,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to WebSocket clients
    this.wsManager.broadcast({
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    console.log(`Wiki change: ${eventType} - ${relativePath}`);
  }
}

/**
 * Global file watcher instance
 */
let globalFileWatcher: WikiFileWatcher | null = null;

/**
 * Initialize the file watcher with the WebSocket manager
 */
export function initializeFileWatcher(
  wikiDir: string,
  wsManager: WebSocketManager,
  options?: { debounceMs?: number }
): WikiFileWatcher {
  if (globalFileWatcher) {
    console.log('File watcher already initialized, stopping existing...');
    globalFileWatcher.stop().catch(console.error);
  }

  globalFileWatcher = new WikiFileWatcher({
    wikiDir,
    wsManager,
    debounceMs: options?.debounceMs,
  });

  return globalFileWatcher;
}

/**
 * Get the global file watcher instance
 */
export function getFileWatcher(): WikiFileWatcher | null {
  return globalFileWatcher;
}

/**
 * Stop the global file watcher
 */
export async function stopFileWatcher(): Promise<void> {
  if (globalFileWatcher) {
    await globalFileWatcher.stop();
    globalFileWatcher = null;
  }
}
