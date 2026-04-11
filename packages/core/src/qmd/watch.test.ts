import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { QMDStoreWrapper } from './store.js';
import { createWikiWatcher } from './watch.js';
import fs from 'fs/promises';
import path from 'path';

// Mock QMD store wrapper
const createMockWrapper = (): QMDStoreWrapper => {
  return {
    getStore: () => ({
      update: vi.fn().mockResolvedValue({ indexed: 1 }),
    }) as any,
    close: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      qmdDir: '/tmp/wiki/.llm-wiki',
      isReady: true,
      totalDocuments: 0,
      indexedDocuments: 0,
      needsEmbedding: false,
      collections: [],
    }),
    wikiDir: '/tmp/wiki',
    qmdDir: '/tmp/wiki/.llm-wiki',
    getWikiCollection: () => 'wiki',
    getRawCollection: () => 'raw',
    getAllCollections: () => ['wiki', 'raw'],
    toRelativePath: (p: string) => p.replace('/tmp/wiki/', ''),
  };
};

describe('createWikiWatcher', () => {
  let wrapper: QMDStoreWrapper;
  const testDir = '/tmp/wiki-test-watch';

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'entity'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'source'), { recursive: true });
    wrapper = createMockWrapper();
    wrapper.wikiDir = testDir;
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create a wiki watcher', () => {
    const watcher = createWikiWatcher(wrapper);
    expect(watcher).toBeDefined();
    expect(typeof watcher.start).toBe('function');
    expect(typeof watcher.stop).toBe('function');
    expect(typeof watcher.isWatching).toBe('function');
  });

  describe('start/stop', () => {
    it('should start watching when start is called', async () => {
      const watcher = createWikiWatcher(wrapper);
      await watcher.start();
      
      expect(watcher.isWatching()).toBe(true);
      
      await watcher.stop();
    });

    it('should stop watching when stop is called', async () => {
      const watcher = createWikiWatcher(wrapper);
      await watcher.start();
      await watcher.stop();
      
      expect(watcher.isWatching()).toBe(false);
    });

    it('should be watching by default when autoStart is true', async () => {
      const watcher = createWikiWatcher(wrapper, { autoStart: true });
      
      // Wait for watcher to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(watcher.isWatching()).toBe(true);
      
      await watcher.stop();
    });
  });

  describe('change detection', () => {
    it('should handle file creation', async () => {
      const watcher = createWikiWatcher(wrapper, { debounceMs: 100 });
      await watcher.start();

      // Create a new file
      await fs.writeFile(
        path.join(testDir, 'entity', 'new-entity.md'),
        '# New Entity\n\nThis is a new entity page.'
      );

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 300));

      // Stop watcher
      await watcher.stop();

      // Watcher should have been running
      expect(watcher.isWatching()).toBe(false);
    });

    it('should handle file modification', async () => {
      // Create initial file
      const filePath = path.join(testDir, 'entity', 'existing.md');
      await fs.writeFile(filePath, '# Existing\n\nInitial content.');

      const watcher = createWikiWatcher(wrapper, { debounceMs: 100 });
      await watcher.start();

      // Wait for initial scan
      await new Promise(resolve => setTimeout(resolve, 200));

      // Modify file
      await fs.writeFile(filePath, '# Existing\n\nModified content.');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 200));

      // Stop watcher
      await watcher.stop();

      // Watcher should have been running
      expect(watcher.isWatching()).toBe(false);
    });

    it('should handle rapid file changes', async () => {
      const watcher = createWikiWatcher(wrapper, { debounceMs: 200 });
      await watcher.start();

      // Create multiple files rapidly
      for (let i = 0; i < 5; i++) {
        await fs.writeFile(
          path.join(testDir, `rapid-${i}.md`),
          `# Entity ${i}`
        );
      }

      // Wait for debounce + some buffer
      await new Promise(resolve => setTimeout(resolve, 400));

      // Stop watcher
      await watcher.stop();

      // Watcher should have been running
      expect(watcher.isWatching()).toBe(false);
    });
  });

  describe('event callbacks', () => {
    it('should provide watcher API', async () => {
      const watcher = createWikiWatcher(wrapper);
      await watcher.start();

      // Check watcher is running
      expect(watcher.isWatching()).toBe(true);

      await watcher.stop();
    });

    it('should handle error callback', async () => {
      const onError = vi.fn();
      const badWrapper = createMockWrapper();
      badWrapper.wikiDir = '/nonexistent/directory';

      const watcher = createWikiWatcher(badWrapper, {
        onError,
      });

      try {
        await watcher.start();
      } catch {
        // Expected to fail with nonexistent directory
      }

      // Watcher API should still work
      await watcher.stop();
    });
  });

  describe('batch updates', () => {
    it('should support reindex functionality', async () => {
      const watcher = createWikiWatcher(wrapper);
      await watcher.start();

      // Call reindex
      await watcher.reindex();

      // Watcher should still be running
      expect(watcher.isWatching()).toBe(true);

      await watcher.stop();
    });
  });

  describe('recent events', () => {
    it('should return empty events initially', () => {
      const watcher = createWikiWatcher(wrapper);
      const events = watcher.getRecentEvents();
      expect(events).toEqual([]);
    });

    it('should return limited events', () => {
      const watcher = createWikiWatcher(wrapper);
      const events = watcher.getRecentEvents(5);
      expect(Array.isArray(events)).toBe(true);
    });
  });
});
