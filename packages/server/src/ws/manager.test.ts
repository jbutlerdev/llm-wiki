/**
 * Tests for WebSocket manager
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketManager } from './manager.js';

describe('WebSocketManager', () => {
  let manager: WebSocketManager;
  let testPort: number;

  beforeEach(() => {
    manager = new WebSocketManager();
    testPort = 9876 + Math.floor(Math.random() * 100);
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('initialization', () => {
    it('should initialize WebSocket server', () => {
      manager.initialize(testPort, 'localhost');
      expect(manager.getClientCount()).toBe(0);
    });

    it('should track connected clients', () => {
      manager.initialize(testPort, 'localhost');
      expect(manager.getClientCount()).toBe(0);
    });
  });

  describe('getClients', () => {
    it('should return empty array when no clients connected', () => {
      manager.initialize(testPort, 'localhost');
      const clients = manager.getClients();
      expect(clients).toEqual([]);
    });
  });

  describe('broadcast', () => {
    it('should broadcast event to all clients', () => {
      manager.initialize(testPort, 'localhost');
      
      // Broadcast should not throw even with no clients
      manager.broadcast({
        type: 'page:created',
        payload: { pageSlug: 'test', pageType: 'entity', title: 'Test' },
        timestamp: new Date().toISOString(),
      });
    });
  });

  describe('page event broadcasting', () => {
    it('should broadcast page created event', () => {
      manager.initialize(testPort, 'localhost');
      
      expect(() => {
        manager.broadcastPageEvent('page:created', {
          pageSlug: 'test-page',
          pageType: 'entity',
          title: 'Test Page',
        });
      }).not.toThrow();
    });

    it('should broadcast page updated event', () => {
      manager.initialize(testPort, 'localhost');
      
      expect(() => {
        manager.broadcastPageEvent('page:updated', {
          pageSlug: 'test-page',
          pageType: 'entity',
          title: 'Test Page',
        });
      }).not.toThrow();
    });

    it('should broadcast page deleted event', () => {
      manager.initialize(testPort, 'localhost');
      
      expect(() => {
        manager.broadcastPageEvent('page:deleted', {
          pageSlug: 'test-page',
          pageType: 'entity',
          title: 'Test Page',
        });
      }).not.toThrow();
    });
  });

  describe('source event broadcasting', () => {
    it('should broadcast source ingested event', () => {
      manager.initialize(testPort, 'localhost');
      
      expect(() => {
        manager.broadcastSourceEvent('source:ingested', {
          sourceId: 'source-123',
          sourceType: 'markdown',
          title: 'Test Source',
        });
      }).not.toThrow();
    });
  });

  describe('agent event broadcasting', () => {
    it('should broadcast agent started event', () => {
      manager.initialize(testPort, 'localhost');
      
      expect(() => {
        manager.broadcastAgentEvent('agent:started', {
          mode: 'autonomous',
          message: 'Agent started',
        });
      }).not.toThrow();
    });

    it('should broadcast agent stopped event', () => {
      manager.initialize(testPort, 'localhost');
      
      expect(() => {
        manager.broadcastAgentEvent('agent:stopped', {
          message: 'Agent stopped',
        });
      }).not.toThrow();
    });

    it('should broadcast agent mode changed event', () => {
      manager.initialize(testPort, 'localhost');
      
      expect(() => {
        manager.broadcastAgentEvent('agent:mode_changed', {
          mode: 'semi-autonomous',
        });
      }).not.toThrow();
    });

    it('should broadcast agent task completed event', () => {
      manager.initialize(testPort, 'localhost');
      
      expect(() => {
        manager.broadcastAgentEvent('agent:task_completed', {
          task: 'Ingesting document',
          message: 'Completed successfully',
        });
      }).not.toThrow();
    });
  });

  describe('lint event broadcasting', () => {
    it('should broadcast lint completed event', () => {
      manager.initialize(testPort, 'localhost');
      
      expect(() => {
        manager.broadcastLintEvent('lint:completed', {
          issuesCount: 5,
          errors: 1,
          warnings: 4,
        });
      }).not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', () => {
      manager.initialize(testPort, 'localhost');
      manager.shutdown();
      expect(manager.getClientCount()).toBe(0);
    });

    it('should handle multiple shutdowns', () => {
      manager.initialize(testPort, 'localhost');
      manager.shutdown();
      manager.shutdown(); // Should not throw
    });
  });
});
