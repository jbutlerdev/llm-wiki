/**
 * Tests for Server package - Phase 0
 */
import { describe, it, expect } from 'vitest';
import { serverVersion } from './index.js';

describe('Server package', () => {
  it('should export version', () => {
    expect(serverVersion).toBe('0.1.0');
  });
});
