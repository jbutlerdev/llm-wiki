/**
 * Tests for agent loop
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentLoop, type AgentLoopConfig, type MaintenanceTask } from './agent-loop.js';
import type { WikiDirProvider } from '../session/agent-session.js';

// Mock wiki dir provider
const mockWikiDirProvider: WikiDirProvider = {
  getWikiDir: () => '/test/wiki',
  setWikiDir: () => {},
};

describe('AgentLoop', () => {
  let mockSessionManager: any;

  beforeEach(() => {
    mockSessionManager = {
      getWikiDir: () => '/test/wiki',
    };
  });

  describe('constructor', () => {
    it('should create loop in interactive mode without starting', () => {
      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'interactive',
      });

      expect(loop.isActive()).toBe(false);
      expect(loop.getMode()).toBe('interactive');
    });

    it('should create loop with custom cycle interval', () => {
      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'semi-autonomous',
        cycleIntervalMs: 5000,
      });

      const stats = loop.getStats();
      expect(stats.cycleIntervalMs).toBe(5000);
    });
  });

  describe('start/stop', () => {
    it('should throw error when starting in interactive mode', async () => {
      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'interactive',
      });

      await expect(loop.start()).rejects.toThrow('Cannot start loop in interactive mode');
    });

    it('should start loop in autonomous mode', async () => {
      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'autonomous',
        cycleIntervalMs: 0, // Disable automatic cycles
      });

      await loop.start();
      expect(loop.isActive()).toBe(true);

      loop.stop();
      expect(loop.isActive()).toBe(false);
    });

    it('should start loop in semi-autonomous mode', async () => {
      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'semi-autonomous',
        cycleIntervalMs: 0,
      });

      await loop.start();
      expect(loop.isActive()).toBe(true);

      loop.stop();
    });
  });

  describe('mode transitions', () => {
    it('should change mode', async () => {
      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'interactive',
      });

      expect(loop.getMode()).toBe('interactive');

      await loop.setMode('autonomous');
      expect(loop.getMode()).toBe('autonomous');

      await loop.setMode('semi-autonomous');
      expect(loop.getMode()).toBe('semi-autonomous');
    });

    it('should stop loop when switching to interactive', async () => {
      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'autonomous',
        cycleIntervalMs: 0,
      });

      await loop.start();
      expect(loop.isActive()).toBe(true);

      await loop.setMode('interactive');
      expect(loop.isActive()).toBe(false);
    });
  });

  describe('runCycle', () => {
    it('should run cycle manually', async () => {
      const executedTasks: string[] = [];

      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'interactive',
        maintenanceTasks: [
          {
            name: 'test_task',
            execute: async () => {
              executedTasks.push('test_task');
              return { success: true };
            },
          },
        ],
      });

      await loop.runCycle();
      expect(executedTasks).toContain('test_task');
    });

    it('should emit cycle events', async () => {
      const events: any[] = [];

      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'interactive',
        maintenanceTasks: [
          {
            name: 'test_task',
            execute: async () => ({ success: true }),
          },
        ],
        onEvent: (type, data) => events.push({ type, data }),
      });

      await loop.runCycle();

      expect(events.some(e => e.type === 'loop:cycle_start')).toBe(true);
      expect(events.some(e => e.type === 'loop:cycle_end')).toBe(true);
      expect(events.some(e => e.type === 'loop:maintenance_start')).toBe(true);
      expect(events.some(e => e.type === 'loop:maintenance_end')).toBe(true);
    });

    it('should handle task errors gracefully', async () => {
      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'interactive',
        maintenanceTasks: [
          {
            name: 'failing_task',
            execute: async () => {
              throw new Error('Task failed');
            },
          },
        ],
      });

      // Should not throw
      await expect(loop.runCycle()).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return loop statistics', () => {
      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'autonomous',
        cycleIntervalMs: 5000,
      });

      const stats = loop.getStats();

      expect(stats.isRunning).toBe(false);
      expect(stats.cycleCount).toBe(0);
      expect(stats.mode).toBe('autonomous');
      expect(stats.pendingApprovals).toBe(0);
      expect(stats.cycleIntervalMs).toBe(5000);
    });
  });

  describe('event listeners', () => {
    it('should subscribe to events', async () => {
      const events: any[] = [];

      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'interactive',
      });

      loop.on('loop:cycle_start', (data) => events.push(data));

      await loop.runCycle();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].cycle).toBe(1);
    });

    it('should return unsubscribe function', async () => {
      const events: any[] = [];

      const loop = new AgentLoop({
        wikiDirProvider: mockWikiDirProvider,
        sessionManager: mockSessionManager as any,
        mode: 'interactive',
      });

      const unsubscribe = loop.on('loop:cycle_start', (data) => events.push(data));
      
      await loop.runCycle();
      expect(events.length).toBe(1);

      unsubscribe();
      
      await loop.runCycle();
      expect(events.length).toBe(1); // No new events after unsubscribe
    });
  });
});
