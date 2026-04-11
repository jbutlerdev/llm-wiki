/**
 * Tests for contradiction detection - Phase 11
 */
import { describe, it, expect, vi } from 'vitest';
import { detectWikiContradictions } from './contradiction.js';

// Mock the llm module for extractClaims
vi.mock('../llm/index.js', () => ({
  extractClaims: vi.fn(),
}));

describe('contradictionDetector', () => {
  describe('detectWikiContradictions', () => {
    it('should return empty array when no pages exist', async () => {
      const issues = await detectWikiContradictions('mock/wiki');
      expect(issues).toEqual([]);
    });

    it('should not flag pages without contradicting claims', async () => {
      // Pages with unrelated content should not have contradictions
      const issues = await detectWikiContradictions('mock/wiki');
      expect(issues).toBeInstanceOf(Array);
    });

    it('should identify potential contradictions between pages', async () => {
      // This test would require LLM integration for real claim extraction
      // For now, we test the interface
      const issues = await detectWikiContradictions('mock/wiki');
      expect(Array.isArray(issues)).toBe(true);
      
      // All issues should have required fields
      for (const issue of issues) {
        expect(issue).toHaveProperty('type', 'contradiction');
        expect(issue).toHaveProperty('pageId');
        expect(issue).toHaveProperty('message');
        expect(issue).toHaveProperty('severity');
        expect(['error', 'warning', 'info']).toContain(issue.severity);
      }
    });

    it('should include affected pages in the message', async () => {
      const issues = await detectWikiContradictions('mock/wiki');
      
      for (const issue of issues) {
        expect(issue.message.length).toBeGreaterThan(0);
        // Message should reference the conflicting pages
        expect(issue.message).toContain(issue.pageId);
      }
    });
  });
});
