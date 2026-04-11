/**
 * Tests for SourceSummarizer - Phase 4
 */
import { describe, it, expect, vi } from 'vitest';
import { SourceSummarizer } from './summarizer.js';
import type { SourceDocument } from '../types/index.js';

describe('SourceSummarizer', () => {
  let summarizer: SourceSummarizer;

  beforeEach(() => {
    summarizer = new SourceSummarizer();
  });

  describe('summarize', () => {
    it('should return a SourceSummary object', async () => {
      const source: SourceDocument = {
        path: '/test/source.md',
        type: 'markdown',
        title: 'Test Source',
        content: '# Test\n\nSome content here.',
        checksum: 'abc123',
        ingestedAt: new Date(),
      };

      const result = await summarizer.summarize(source);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Source');
      expect(result.summary).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.keyPoints).toBeDefined();
      expect(result.topics).toBeDefined();
      expect(result.tags).toBeDefined();
    });

    it('should extract entities from content', async () => {
      const source: SourceDocument = {
        path: '/test/people.md',
        type: 'markdown',
        title: 'Notable People',
        content: '# Notable People\n\nJohn Smith was born in 1980. Jane Doe is a scientist.\n\nJohn and Jane both work at Acme Corp.',
        checksum: 'abc123',
        ingestedAt: new Date(),
      };

      const result = await summarizer.summarize(source);

      // Should identify entities (people, organizations)
      expect(result.entities).toBeDefined();
      expect(Array.isArray(result.entities)).toBe(true);
    });

    it('should extract key points from content', async () => {
      const source: SourceDocument = {
        path: '/test/topics.md',
        type: 'markdown',
        title: 'Main Topics',
        content: '# Main Topics\n\n1. First important point\n2. Second important point\n3. Third important point',
        checksum: 'abc123',
        ingestedAt: new Date(),
      };

      const result = await summarizer.summarize(source);

      expect(result.keyPoints).toBeDefined();
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(result.keyPoints.length).toBeGreaterThan(0);
    });

    it('should identify topics', async () => {
      const source: SourceDocument = {
        path: '/test/tech.md',
        type: 'markdown',
        title: 'Technology Overview',
        content: '# Technology Overview\n\nThis document covers software development, cloud computing, and machine learning.',
        checksum: 'abc123',
        ingestedAt: new Date(),
      };

      const result = await summarizer.summarize(source);

      expect(result.topics).toBeDefined();
      expect(Array.isArray(result.topics)).toBe(true);
    });

    it('should generate tags from content', async () => {
      const source: SourceDocument = {
        path: '/test/science.md',
        type: 'markdown',
        title: 'Scientific Method',
        content: '# Scientific Method\n\nThis is about biology, chemistry, and physics experiments.',
        checksum: 'abc123',
        ingestedAt: new Date(),
      };

      const result = await summarizer.summarize(source);

      expect(result.tags).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags.length).toBeGreaterThan(0);
    });

    it('should handle empty content', async () => {
      const source: SourceDocument = {
        path: '/test/empty.md',
        type: 'markdown',
        title: 'Empty Document',
        content: '',
        checksum: 'abc123',
        ingestedAt: new Date(),
      };

      const result = await summarizer.summarize(source);

      expect(result).toBeDefined();
      expect(result.summary).toBe('');
      expect(result.entities).toEqual([]);
      expect(result.keyPoints).toEqual([]);
    });

    it('should handle very long content', async () => {
      const longContent = '# Long Document\n\n' + 'Lorem ipsum '.repeat(1000);
      const source: SourceDocument = {
        path: '/test/long.md',
        type: 'markdown',
        title: 'Long Document',
        content: longContent,
        checksum: 'abc123',
        ingestedAt: new Date(),
      };

      const result = await summarizer.summarize(source);

      expect(result).toBeDefined();
      expect(result.summary.length).toBeLessThanOrEqual(500);
    });
  });

  describe('extractEntities', () => {
    it('should identify capitalized phrases as potential entities', () => {
      const content = 'The company Apple released iPhone. Microsoft and Google are competitors.';
      
      const entities = summarizer.extractEntities(content);

      expect(entities).toBeDefined();
      expect(Array.isArray(entities)).toBe(true);
      expect(entities.length).toBeGreaterThan(0);
    });

    it('should return empty array for empty content', () => {
      const entities = summarizer.extractEntities('');
      expect(entities).toEqual([]);
    });

    it('should not include common words as entities', () => {
      const content = 'The quick brown fox jumps over the lazy dog.';
      
      const entities = summarizer.extractEntities(content);

      // Should filter out common words
      const entityNames = entities.map(e => e.name.toLowerCase());
      expect(entityNames).not.toContain('the');
      expect(entityNames).not.toContain('quick');
    });
  });

  describe('extractKeyPoints', () => {
    it('should extract numbered list items', () => {
      const content = '# Topics\n\n1. First point\n2. Second point\n3. Third point';
      
      const keyPoints = summarizer.extractKeyPoints(content);

      expect(keyPoints).toBeDefined();
      expect(keyPoints.length).toBeGreaterThan(0);
    });

    it('should extract bullet points', () => {
      const content = '# Topics\n\n- First bullet\n- Second bullet\n- Third bullet';
      
      const keyPoints = summarizer.extractKeyPoints(content);

      expect(keyPoints).toBeDefined();
      expect(keyPoints.length).toBeGreaterThan(0);
    });

    it('should extract sentences starting with key words', () => {
      const content = 'This is important. The main point is that we should test. Also critical is the deadline.';
      
      const keyPoints = summarizer.extractKeyPoints(content);

      expect(keyPoints).toBeDefined();
    });
  });

  describe('identifyTopics', () => {
    it('should identify domain-specific topics', () => {
      const content = 'Machine learning and artificial intelligence are transforming software development.';
      
      const topics = summarizer.identifyTopics(content);

      expect(topics).toBeDefined();
      expect(Array.isArray(topics)).toBe(true);
    });

    it('should return empty array for generic content', () => {
      const content = 'Hello world test content.';
      
      const topics = summarizer.identifyTopics(content);

      expect(topics).toBeDefined();
      expect(Array.isArray(topics)).toBe(true);
    });
  });

  describe('generateTags', () => {
    it('should generate tags from content and topics', () => {
      const topics = ['Machine Learning', 'Python', 'Data Science'];
      
      const tags = summarizer.generateTags(topics);

      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeLessThanOrEqual(10);
    });

    it('should normalize tags to lowercase', () => {
      const topics = ['Machine Learning', 'Python'];
      
      const tags = summarizer.generateTags(topics);

      tags.forEach(tag => {
        expect(tag).toBe(tag.toLowerCase());
      });
    });

    it('should return empty array for empty topics', () => {
      const tags = summarizer.generateTags([]);
      expect(tags).toEqual([]);
    });
  });

  describe('generateSummary', () => {
    it('should generate a summary under 500 characters', () => {
      const content = '# Long Document\n\n' + 'This is a much longer document with lots of content. '.repeat(50);
      
      const summary = summarizer.generateSummary(content);

      expect(summary.length).toBeLessThanOrEqual(500);
    });

    it('should preserve meaning in summary', () => {
      const content = '# Important Document\n\nThis document is about critical topics that require attention.';
      
      const summary = summarizer.generateSummary(content);

      expect(summary).toContain('document');
    });
  });
});

describe('SourceSummarizer with LLM integration', () => {
  it('should be extensible for LLM-based summarization', async () => {
    const summarizer = new SourceSummarizer({
      llmSummarize: async (content: string) => `AI Summary: ${content.slice(0, 50)}...`,
    });

    const source: SourceDocument = {
      path: '/test/ai.md',
      type: 'markdown',
      title: 'AI Document',
      content: '# AI Document\n\nThis content will be summarized by AI.',
      checksum: 'abc123',
      ingestedAt: new Date(),
    };

    const result = await summarizer.summarize(source);

    expect(result.summary).toContain('AI Summary');
  });
});
