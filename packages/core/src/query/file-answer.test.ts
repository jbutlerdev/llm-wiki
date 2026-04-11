/**
 * Tests for File Answer functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileAnswer, formatAnswerForDisplay } from './file-answer.js';
import type { Citation } from './query.js';

// Mock the wiki operations
vi.mock('../wiki/page.js', () => ({
  createPage: vi.fn().mockResolvedValue({
    slug: 'test-answer-123',
    title: 'Test Answer',
    type: 'synthesis',
    content: '',
    frontmatter: { tags: [], sources: [], relatedPages: [] },
    createdAt: new Date(),
    lastModified: new Date(),
  }),
}));

vi.mock('../wiki/index-page.js', () => ({
  updateIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../wiki/log.js', () => ({
  appendLog: vi.fn().mockResolvedValue(undefined),
}));

describe('File Answer', () => {
  describe('fileAnswer', () => {
    const wikiDir = '/test/wiki';

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create a wiki page from an answer', async () => {
      const result = await fileAnswer(
        'What is AI?',
        'Artificial Intelligence is the simulation of human intelligence.',
        [{ slug: 'ai', title: 'Artificial Intelligence', snippet: 'AI definition' }],
        wikiDir
      );

      // The slug removes leading "what" so it becomes "is-ai-timestamp"
      expect(result.slug).toMatch(/^is-ai-/);
      // Title becomes "Is Ai - Answer" (capitalized per-word)
      expect(result.title).toContain('Ai');
    });

    it('should use custom title when provided', async () => {
      const result = await fileAnswer(
        'What is AI?',
        'Answer content',
        [],
        wikiDir,
        { title: 'My Custom Title' }
      );

      expect(result.title).toBe('My Custom Title');
    });

    it('should use custom tags when provided', async () => {
      const { createPage } = await import('../wiki/page.js');
      
      await fileAnswer(
        'Test question?',
        'Answer content',
        [],
        wikiDir,
        { tags: ['custom', 'tags'] }
      );

      expect(createPage).toHaveBeenCalledWith(
        expect.objectContaining({
          wikiDir,
          frontmatter: expect.objectContaining({
            tags: ['custom', 'tags'],
          }),
        })
      );
    });

    it('should include citations in content when enabled', async () => {
      const { createPage } = await import('../wiki/page.js');
      
      const citations: Citation[] = [
        { slug: 'page-1', title: 'Page One', snippet: 'Content from page 1' },
        { slug: 'page-2', title: 'Page Two', snippet: 'Content from page 2' },
      ];

      await fileAnswer(
        'Test question?',
        'The answer is yes.',
        citations,
        wikiDir,
        { includeCitations: true }
      );

      expect(createPage).toHaveBeenCalledWith(
        expect.objectContaining({
          wikiDir,
          content: expect.stringContaining('Sources'),
        })
      );
    });

    it('should generate unique slug with timestamp', async () => {
      const result1 = await fileAnswer('First question?', 'Answer 1', [], wikiDir);
      const result2 = await fileAnswer('Second question?', 'Answer 2', [], wikiDir);

      // Different questions should generate different slugs
      expect(result1.slug).not.toBe(result2.slug);
    });
  });

  describe('formatAnswerForDisplay', () => {
    it('should format answer without citations', () => {
      const answer = 'This is the answer.';
      const result = formatAnswerForDisplay(answer, []);

      expect(result).toBe('This is the answer.');
    });

    it('should format answer with citations', () => {
      const answer = 'This is the answer.';
      const citations: Citation[] = [
        { slug: 'page-1', title: 'First Page', snippet: 'Content' },
        { slug: 'page-2', title: 'Second Page', snippet: 'Content' },
      ];

      const result = formatAnswerForDisplay(answer, citations);

      expect(result).toContain('This is the answer.');
      expect(result).toContain('**Sources:**');
      expect(result).toContain('[[page-1|First Page]]');
      expect(result).toContain('[[page-2|Second Page]]');
    });

    it('should not add citations section when empty', () => {
      const answer = 'Simple answer';
      const result = formatAnswerForDisplay(answer, []);

      expect(result).toBe('Simple answer');
      expect(result).not.toContain('Sources');
    });
  });
});
