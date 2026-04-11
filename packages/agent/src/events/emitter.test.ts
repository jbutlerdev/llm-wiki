/**
 * Tests for agent event emitter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgentEventEmitter,
  type AgentEvent,
  type AgentEventType,
} from './emitter.js';

describe('AgentEventEmitter', () => {
  let emitter: AgentEventEmitter;

  beforeEach(() => {
    emitter = new AgentEventEmitter();
  });

  describe('subscribe/unsubscribe', () => {
    it('should subscribe a new client', () => {
      // Create a mock controller
      const mockController = {
        enqueue: () => Promise.resolve(),
        close: () => {},
        error: () => {},
      } as unknown as ReadableStreamDefaultController<Uint8Array>;
      
      const clientId = emitter.subscribe(mockController);
      
      expect(clientId).toBeTruthy();
      expect(emitter.getClientCount()).toBe(1);
    });

    it('should unsubscribe a client', () => {
      const mockController = {
        enqueue: () => Promise.resolve(),
        close: () => {},
        error: () => {},
      } as unknown as ReadableStreamDefaultController<Uint8Array>;
      
      const clientId = emitter.subscribe(mockController);
      
      emitter.unsubscribe(clientId);
      
      expect(emitter.getClientCount()).toBe(0);
    });

    it('should track multiple clients', () => {
      const mockController1 = {
        enqueue: () => Promise.resolve(),
        close: () => {},
        error: () => {},
      } as unknown as ReadableStreamDefaultController<Uint8Array>;
      const mockController2 = {
        enqueue: () => Promise.resolve(),
        close: () => {},
        error: () => {},
      } as unknown as ReadableStreamDefaultController<Uint8Array>;
      
      const id1 = emitter.subscribe(mockController1);
      const id2 = emitter.subscribe(mockController2);
      
      expect(emitter.getClientCount()).toBe(2);
      expect(id1).not.toBe(id2);
    });

    it('should have clients when subscribed', () => {
      const mockController = {
        enqueue: () => Promise.resolve(),
        close: () => {},
        error: () => {},
      } as unknown as ReadableStreamDefaultController<Uint8Array>;
      emitter.subscribe(mockController);
      
      expect(emitter.hasClients()).toBe(true);
    });

    it('should not have clients when all unsubscribed', () => {
      const mockController = {
        enqueue: () => Promise.resolve(),
        close: () => {},
        error: () => {},
      } as unknown as ReadableStreamDefaultController<Uint8Array>;
      const clientId = emitter.subscribe(mockController);
      emitter.unsubscribe(clientId);
      
      expect(emitter.hasClients()).toBe(false);
    });
  });

  describe('event subscription', () => {
    it('should subscribe to specific events', () => {
      const mockController = {
        enqueue: () => Promise.resolve(),
        close: () => {},
        error: () => {},
      } as unknown as ReadableStreamDefaultController<Uint8Array>;
      
      const clientId = emitter.subscribe(mockController);
      
      const result = emitter.subscribeToEvents(clientId, ['agent:started', 'agent:stopped']);
      
      expect(result).toBe(true);
    });

    it('should return false for invalid client', () => {
      const result = emitter.subscribeToEvents('invalid-id', ['agent:started']);
      
      expect(result).toBe(false);
    });

    it('should unsubscribe from specific events', () => {
      const mockController = {
        enqueue: () => Promise.resolve(),
        close: () => {},
        error: () => {},
      } as unknown as ReadableStreamDefaultController<Uint8Array>;
      
      const clientId = emitter.subscribe(mockController);
      
      emitter.subscribeToEvents(clientId, ['agent:started', 'agent:stopped']);
      const result = emitter.unsubscribeFromEvents(clientId, ['agent:started']);
      
      expect(result).toBe(true);
    });
  });

  describe('on listener', () => {
    it('should add and call event listener', () => {
      const events: AgentEvent[] = [];
      
      const unsubscribe = emitter.on('agent:started', (event) => {
        events.push(event);
      });
      
      emitter.emit('agent:started', { wikiDir: '/test' });
      
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('agent:started');
      
      unsubscribe();
      
      emitter.emit('agent:started', {});
      
      expect(events.length).toBe(1); // No new events
    });

    it('should handle listener errors gracefully', () => {
      emitter.on('agent:started', () => {
        throw new Error('Listener error');
      });
      
      // Should not throw
      expect(() => emitter.emit('agent:started', {})).not.toThrow();
    });

    it('should call onAny listener for all events', () => {
      const events: AgentEvent[] = [];
      
      emitter.onAny((event) => events.push(event));
      
      emitter.emit('agent:started', {});
      emitter.emit('agent:stopped', {});
      emitter.emit('wiki:changed', { wikiDir: '/test' });
      
      expect(events.length).toBe(3);
    });
  });
});
