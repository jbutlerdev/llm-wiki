/**
 * Tests for entity update functionality on source ingestion - Phase 4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { rm, mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { init } from '../wiki/init.js';
import { updateRelatedEntities, createEntityPage } from './entity-update.js';
import { loadPage, createPage } from '../wiki/page.js';
import type { IngestContext } from './ingest.js';

describe('updateRelatedEntities', () => {
  let testWikiDir: string;
  let context: IngestContext;

  beforeEach(async () => {
    testWikiDir = join(tmpdir(), `llm-wiki-entity-test-${Date.now()}-${Math.random()}`);
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

  describe('finding related entity pages', () => {
    it('should find existing entity pages mentioned in source', async () => {
      // Create an existing entity page
      await createPage({
        wikiDir: testWikiDir,
        slug: 'artificial-intelligence',
        title: 'Artificial Intelligence',
        type: 'entity',
        content: '# Artificial Intelligence\n\nAI is a field of computer science.',
        frontmatter: {
          tags: ['ai', 'technology'],
          sources: [],
          relatedPages: [],
        },
      });

      // Source content that mentions the entity
      const sourceContent = 'Artificial Intelligence has transformed many industries.';

      const result = await updateRelatedEntities(context, sourceContent);

      expect(result.entitiesFound).toBeGreaterThan(0);
      expect(result.updatedPages.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty arrays when no entities found', async () => {
      const sourceContent = 'This document contains no known entity references.';

      const result = await updateRelatedEntities(context, sourceContent);

      expect(result.entitiesFound).toBe(0);
      expect(result.updatedPages).toEqual([]);
    });
  });

  describe('updating cross-references', () => {
    it('should add cross-reference to entity page when mentioned', async () => {
      // Create entity page
      await createPage({
        wikiDir: testWikiDir,
        slug: 'machine-learning',
        title: 'Machine Learning',
        type: 'entity',
        content: '# Machine Learning\n\nML is a subset of AI.',
        frontmatter: {
          tags: ['ml', 'ai'],
          sources: [],
          relatedPages: [],
        },
      });

      // Source that mentions machine learning
      const sourceContent = 'Machine Learning models require training data.';
      const sourceChecksum = 'abc123';

      await updateRelatedEntities(context, sourceContent, sourceChecksum);

      // Check entity page was updated
      const entityPage = await loadPage(testWikiDir, 'machine-learning');
      expect(entityPage).not.toBeNull();
      
      // Should have source in sources list
      expect(entityPage!.frontmatter.sources).toContain(sourceChecksum);
    });

    it('should not duplicate existing source references', async () => {
      // Create entity page with existing source reference
      await createPage({
        wikiDir: testWikiDir,
        slug: 'python',
        title: 'Python',
        type: 'entity',
        content: '# Python\n\nPython is a programming language.',
        frontmatter: {
          tags: ['programming'],
          sources: ['existing-source'],
          relatedPages: [],
        },
      });

      const sourceContent = 'Python is widely used in data science.';
      const sourceChecksum = 'existing-source'; // Same as existing

      await updateRelatedEntities(context, sourceContent, sourceChecksum);

      const entityPage = await loadPage(testWikiDir, 'python');
      expect(entityPage!.frontmatter.sources.filter(s => s === sourceChecksum).length).toBe(1);
    });
  });

  describe('creating new entity pages', () => {
    it('should suggest creating new entity pages for unknown entities', async () => {
      const sourceContent = 'LangChain is a popular framework for building LLM applications.';

      const result = await updateRelatedEntities(context, sourceContent);

      // Should suggest new entity
      expect(result.suggestedEntities.length).toBeGreaterThan(0);
      expect(result.suggestedEntities.some(e => e.name.toLowerCase().includes('langchain'))).toBe(true);
    });

    it('should include entity type in suggestions', async () => {
      const sourceContent = 'OpenAI released GPT-4 in 2023.';

      const result = await updateRelatedEntities(context, sourceContent);

      // Should have suggestions with type classification
      expect(result.suggestedEntities.length).toBeGreaterThan(0);
      const suggestion = result.suggestedEntities[0];
      expect(suggestion.type).toBeDefined();
    });
  });

  describe('entity linking patterns', () => {
    it('should recognize various entity name patterns', async () => {
      // Create multiple entity pages
      await createPage({
        wikiDir: testWikiDir,
        slug: 'google',
        title: 'Google',
        type: 'entity',
        content: '# Google\n\nA major technology company.',
        frontmatter: { tags: [], sources: [], relatedPages: [] },
      });

      await createPage({
        wikiDir: testWikiDir,
        slug: 'deep-learning',
        title: 'Deep Learning',
        type: 'entity',
        content: '# Deep Learning\n\nA subset of machine learning.',
        frontmatter: { tags: [], sources: [], relatedPages: [] },
      });

      const sourceContent = 'Google uses Deep Learning extensively in their products.';

      const result = await updateRelatedEntities(context, sourceContent);

      // Should find at least one of the entities
      expect(result.entitiesFound).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('createPage helper', () => {
  let testWikiDir: string;

  beforeEach(async () => {
    testWikiDir = join(tmpdir(), `llm-wiki-create-test-${Date.now()}-${Math.random()}`);
    await mkdir(testWikiDir, { recursive: true });
    await init(testWikiDir);
  });

  afterEach(async () => {
    try {
      await rm(testWikiDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup
    }
  });

  it('should create entity page in correct directory', async () => {
    const result = await createPage({
      wikiDir: testWikiDir,
      slug: 'test-entity',
      title: 'Test Entity',
      type: 'entity',
      content: '# Test Entity\n\nContent here.',
      frontmatter: { tags: ['test'], sources: [], relatedPages: [] },
    });

    expect(result.success).toBe(true);
    const entityPath = join(testWikiDir, 'wiki', 'entity', 'test-entity.md');
    expect(existsSync(entityPath)).toBe(true);
  });

  it('should fail when page already exists', async () => {
    await createPage({
      wikiDir: testWikiDir,
      slug: 'duplicate',
      title: 'Duplicate',
      type: 'entity',
      content: '# Duplicate\n\nFirst content.',
      frontmatter: { tags: [], sources: [], relatedPages: [] },
    });

    const result = await createPage({
      wikiDir: testWikiDir,
      slug: 'duplicate',
      title: 'Duplicate',
      type: 'entity',
      content: '# Duplicate\n\nSecond content.',
      frontmatter: { tags: [], sources: [], relatedPages: [] },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });
});
