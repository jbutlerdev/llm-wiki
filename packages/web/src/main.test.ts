/**
 * Tests for Web package - Phase 0
 */
import { describe, it, expect } from 'vitest';
import { webVersion } from './main.js';

describe('Web package', () => {
  it('should export version', () => {
    expect(webVersion).toBe('0.1.0');
  });
});
