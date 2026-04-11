/**
 * Tests for CLI package - Phase 0
 */
import { describe, it, expect } from 'vitest';
import { version } from './index.js';

describe('CLI package', () => {
  it('should export version', () => {
    expect(version).toBe('0.1.0');
  });
});
