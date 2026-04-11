/**
 * File watcher tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketManager } from './manager.js';
import { WikiFileWatcher, initializeFileWatcher, getFileWatcher, stopFileWatcher } from './file-watcher.js';

// Mock chokidar
vi.mock('chokidar', () => {
  const mockWatcher = {
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return {
    watch: vi.fn(() => mockWatcher),
  };
});

describe('WikiFileWatcher', () => {
  const wikiDir = '/tmp/test-wiki';
  let wsManager: WebSocketManager;
  let broadcastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock WebSocket manager
    wsManager = {
      broadcast: vi.fn(),
    } as unknown as WebSocketManager;
    
    broadcastSpy = vi.spyOn(wsManager, 'broadcast');
  });

  afterEach(async () => {
    // Stop any running watchers
    await stopFileWatcher();
  });

  describe('WikiFileWatcher class', () => {
    it('should create a watcher instance', () => {
      const watcher = new WikiFileWatcher({
        wikiDir,
        wsManager,
        debounceMs: 100,
      });

      expect(watcher).toBeDefined();
      expect(watcher.getIsWatching()).toBe(false);
    });

    it('should have proper isWatching state', () => {
      const watcher = new WikiFileWatcher({
        wikiDir,
        wsManager,
      });

      // Initially not watching
      expect(watcher.getIsWatching()).toBe(false);
    });

    it('should handle stop when not started', async () => {
      const watcher = new WikiFileWatcher({
        wikiDir,
        wsManager,
      });

      // Stop should not throw even when not started
      await expect(watcher.stop()).resolves.not.toThrow();
    });
  });

  describe('initializeFileWatcher', () => {
    it('should initialize a global file watcher', () => {
      const watcher = initializeFileWatcher(wikiDir, wsManager);

      expect(watcher).toBeDefined();
      expect(getFileWatcher()).toBe(watcher);
    });

    it('should replace existing watcher when re-initializing', () => {
      const watcher1 = initializeFileWatcher(wikiDir, wsManager);
      const watcher2 = initializeFileWatcher('/tmp/other-wiki', wsManager);

      expect(getFileWatcher()).toBe(watcher2);
      expect(watcher2).not.toBe(watcher1);
    });
  });

  describe('stopFileWatcher', () => {
    it('should stop the global file watcher', async () => {
      const watcher = initializeFileWatcher(wikiDir, wsManager);
      
      // Stop should work without starting
      await stopFileWatcher();

      expect(getFileWatcher()).toBeNull();
    });

    it('should handle stopping when no watcher exists', async () => {
      // Should not throw
      await expect(stopFileWatcher()).resolves.not.toThrow();
    });

    it('should return null after stopping', async () => {
      initializeFileWatcher(wikiDir, wsManager);
      await stopFileWatcher();

      expect(getFileWatcher()).toBeNull();
    });
  });

  describe('getFileWatcher', () => {
    it('should return null initially', () => {
      // Ensure we start fresh
      vi.useFakeTimers();
      
      // Get watcher when none exists
      const watcher = getFileWatcher();
      expect(watcher).toBeNull();
      
      vi.useRealTimers();
    });

    it('should return initialized watcher', () => {
      const watcher = initializeFileWatcher(wikiDir, wsManager);
      expect(getFileWatcher()).toBe(watcher);
    });
  });
});
