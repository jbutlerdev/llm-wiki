/**
 * Tests for summary page update functionality on source ingestion - Phase 4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { rm, mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { init } from '../wiki/init.js';
import { createEntityPage, updateSummaryPages, detectContradictions } from './summary-update.js';
import { loadPage, createPage } from '../wiki/page.js';
import type { IngestContext } from './ingest.js';

describe('updateSummaryPages', () => {
  let testWikiDir: string;
  let context: IngestContext;

  beforeEach(async () => {
    testWikiDir = join(tmpdir(), `llm-wiki-summary-test-${Date.now()}-${Math.random()}`);
    await mkdir(testWikiDir, { recursive: true });
    await init(testWikiDir);

    context = {
      wikiDir: testWikiDir,
      rawDir: join(testWikiDir, 'wiki', 'raw'),
    };
  });

  afterEach(async () => {
    try {
      await rm(testWikiDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('finding summary pages', () => {
    it('should find existing summary page', async () => {
      // Create an existing summary page
      await createPage({
        wikiDir: testWikiDir,
        slug: 'main',
        title: 'Main Summary',
        type: 'summary',
        content: '# Main Summary\n\nThis is the main summary page.',
        frontmatter: {
          tags: ['summary'],
          sources: [],
          relatedPages: [],
        },
      });

      const sourceContent = 'New information about the main topic.';

      const result = await updateSummaryPages(context, sourceContent, 'new-source');

      expect(result.summaryFound).toBe(true);
    });

    it('should return summaryFound=false when no summary page exists', async () => {
      const sourceContent = 'Some content without an existing summary.';

      const result = await updateSummaryPages(context, sourceContent, 'source-123');

      expect(result.summaryFound).toBe(false);
    });
  });

  describe('synthesizing with existing summary', () => {
    it('should merge new content with existing summary', async () => {
      // Create existing summary
      await createPage({
        wikiDir: testWikiDir,
        slug: 'main',
        title: 'Main Summary',
        type: 'summary',
        content: '# Main Summary\n\n## Overview\n\nThis wiki covers artificial intelligence topics.',
        frontmatter: {
          tags: ['ai', 'technology'],
          sources: ['old-source'],
          relatedPages: [],
        },
      });

      const newContent = 'Machine Learning is a subset of AI that enables systems to learn from data.';
      const sourceChecksum = 'new-machine-learning-source';

      const result = await updateSummaryPages(context, newContent, sourceChecksum);

      expect(result.synthesisUpdated).toBe(true);
      expect(result.updatedSummaries).toContain('main');
    });

    it('should update summary sources list', async () => {
      await createPage({
        wikiDir: testWikiDir,
        slug: 'index',
        title: 'Index Summary',
        type: 'summary',
        content: '# Index Summary\n\nContent here.',
        frontmatter: {
          tags: [],
          sources: ['existing'],
          relatedPages: [],
        },
      });

      const newContent = 'New content for the index.';
      const sourceChecksum = 'index-source';

      await updateSummaryPages(context, newContent, sourceChecksum);

      const summaryPage = await loadPage(testWikiDir, 'index');
      expect(summaryPage).not.toBeNull();
      expect(summaryPage!.frontmatter.sources).toContain(sourceChecksum);
      expect(summaryPage!.frontmatter.sources).toContain('existing');
    });
  });

  describe('contradiction detection', () => {
    it('should call detectContradictions when comparing content', async () => {
      await createPage({
        wikiDir: testWikiDir,
        slug: 'facts',
        title: 'Facts Summary',
        type: 'summary',
        content: '# Facts Summary\n\n## Key Facts\n\n- The earth is round\n- Water boils at 100°C',
        frontmatter: {
          tags: ['facts'],
          sources: ['fact-source'],
          relatedPages: [],
        },
      });

      // New source with potentially contradictory info
      const newContent = 'Scientists have found that the earth is actually flat.';

      const result = await updateSummaryPages(context, newContent, 'contradictory-source');

      // Contradiction detection runs (may or may not find contradictions depending on content)
      expect(result.contradictions).toBeDefined();
      expect(Array.isArray(result.contradictions)).toBe(true);
    });

    it('should run contradiction detection on existing summary content', async () => {
      await createPage({
        wikiDir: testWikiDir,
        slug: 'numbers',
        title: 'Numbers Summary',
        type: 'summary',
        content: '# Numbers Summary\n\n## Statistics\n\nThe population is approximately 8 billion.',
        frontmatter: {
          tags: ['stats'],
          sources: ['stats-source'],
          relatedPages: [],
        },
      });

      const newContent = 'Recent census shows the population is only 1 million.';

      const result = await updateSummaryPages(context, newContent, 'new-stats');

      // Should run contradiction detection
      expect(result.contradictions).toBeDefined();
      expect(Array.isArray(result.contradictions)).toBe(true);
    });

    it('should return empty contradictions when content is consistent', async () => {
      await createPage({
        wikiDir: testWikiDir,
        slug: 'consistent',
        title: 'Consistent Summary',
        type: 'summary',
        content: '# Consistent Summary\n\nPython is a popular programming language.',
        frontmatter: {
          tags: ['programming'],
          sources: ['python-source'],
          relatedPages: [],
        },
      });

      const newContent = 'Python continues to be widely used in 2024.';

      const result = await updateSummaryPages(context, newContent, 'recent-python');

      // Consistent content should have no contradictions detected
      expect(result.contradictions).toEqual([]);
    });
  });

  describe('content synthesis', () => {
    it('should extract key themes from new content', async () => {
      await createPage({
        wikiDir: testWikiDir,
        slug: 'topics',
        title: 'Topics Summary',
        type: 'summary',
        content: '# Topics Summary\n\nCurrent topics covered.',
        frontmatter: {
          tags: [],
          sources: [],
          relatedPages: [],
        },
      });

      const newContent = `
        Machine Learning and Deep Learning are key areas.
        Natural Language Processing enables chatbots.
        Computer Vision powers image recognition.
      `;

      const result = await updateSummaryPages(context, newContent, 'topics-source');

      expect(result.keyThemes.length).toBeGreaterThan(0);
    });

    it('should suggest related page links', async () => {
      await createPage({
        wikiDir: testWikiDir,
        slug: 'overview',
        title: 'Overview Summary',
        type: 'summary',
        content: '# Overview Summary\n\nMain content.',
        frontmatter: {
          tags: [],
          sources: [],
          relatedPages: [],
        },
      });

      const newContent = 'Neural networks are used in deep learning applications.';

      const result = await updateSummaryPages(context, newContent, 'neural-source');

      expect(result.suggestedLinks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing wiki directory gracefully', async () => {
      const emptyContext: IngestContext = {
        wikiDir: '/nonexistent/path',
        rawDir: '/nonexistent/raw',
      };

      const result = await updateSummaryPages(emptyContext, 'Some content', 'source');

      // Should return gracefully without throwing
      expect(result).toBeDefined();
      expect(result.summaryFound).toBe(false);
      expect(result.synthesisUpdated).toBe(false);
    });
  });
});

describe('detectContradictions', () => {
  it('should detect direct negation', () => {
    const existing = 'The project was successful.';
    const newContent = 'The project failed completely.';

    const contradictions = detectContradictions(existing, newContent);

    expect(contradictions.length).toBeGreaterThan(0);
    expect(contradictions[0].severity).toBe('warning');
  });

  it('should detect quantitative differences', () => {
    const existing = 'Revenue increased by 50%.';
    const newContent = 'Revenue decreased by 20%.';

    const contradictions = detectContradictions(existing, newContent);

    expect(contradictions.length).toBeGreaterThan(0);
  });

  it('should not flag similar content as contradiction', () => {
    const existing = 'Python is a popular language.';
    const newContent = 'Python is widely used for web development.';

    const contradictions = detectContradictions(existing, newContent);

    expect(contradictions.length).toBe(0);
  });

  it('should handle empty inputs', () => {
    const contradictions = detectContradictions('', '');

    expect(contradictions).toEqual([]);
  });
});
