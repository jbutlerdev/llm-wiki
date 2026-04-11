/**
 * Tests for SchemaValidator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaValidator, ValidationIssue } from './validator.js';
import { Schema } from './loader.js';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;
  let schema: Schema;

  beforeEach(() => {
    schema = {
      raw: '',
      conventions: {
        naming: ['lowercase-kebab-case', 'no spaces'],
        frontmatter: ['always include title', 'always include tags'],
        links: ['use double brackets'],
      },
      workflows: {},
    };
    validator = new SchemaValidator(schema);
  });

  describe('validatePageSlug', () => {
    it('should pass for valid kebab-case slug', () => {
      const result = validator.validatePageSlug('artificial-intelligence');
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail for uppercase letters', () => {
      const result = validator.validatePageSlug('Artificial-Intelligence');
      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('lowercase');
    });

    it('should fail for spaces', () => {
      const result = validator.validatePageSlug('artificial intelligence');
      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('kebab-case');
    });

    it('should fail for special characters', () => {
      const result = validator.validatePageSlug('artificial@intelligence');
      expect(result.valid).toBe(false);
    });

    it('should allow hyphens and underscores', () => {
      const result = validator.validatePageSlug('artificial_intelligence-test');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFrontmatter', () => {
    it('should pass when all required fields present', () => {
      const frontmatter = {
        title: 'Test Page',
        tags: ['test'],
        sources: [],
        relatedPages: [],
      };
      
      const result = validator.validateFrontmatter(frontmatter);
      expect(result.valid).toBe(true);
    });

    it('should fail when tags is empty', () => {
      const frontmatter = {
        tags: [],
        sources: [],
        relatedPages: [],
      };
      
      const result = validator.validateFrontmatter(frontmatter);
      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('tags');
    });

    it('should fail when tags is missing', () => {
      const frontmatter = {
        tags: [],
        sources: [],
        relatedPages: [],
      };
      
      const result = validator.validateFrontmatter(frontmatter);
      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('tags');
    });

    it('should warn when sources is empty', () => {
      const frontmatter = {
        title: 'Test Page',
        tags: ['test'],
        sources: [],
        relatedPages: [],
      };
      
      const result = validator.validateFrontmatter(frontmatter);
      expect(result.issues.some(i => i.severity === 'warning')).toBe(true);
    });
  });

  describe('validateLinks', () => {
    it('should pass for valid wiki links', () => {
      const content = 'See [[artificial-intelligence]] for details.';
      const result = validator.validateLinks(content);
      expect(result.valid).toBe(true);
    });

    it('should pass for wiki links with display text', () => {
      const content = 'See [[artificial-intelligence|AI]] for details.';
      const result = validator.validateLinks(content);
      expect(result.valid).toBe(true);
    });

    it('should warn for bare URLs', () => {
      const content = 'See https://example.com for details.';
      const result = validator.validateLinks(content);
      expect(result.issues.some(i => i.severity === 'warning')).toBe(true);
    });

    it('should pass for multiple valid links', () => {
      const content = '[[page-one]] and [[page-two|Display]] are related.';
      const result = validator.validateLinks(content);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('validatePage', () => {
    it('should validate complete page', () => {
      const page = {
        slug: 'test-page',
        title: 'Test Page',
        type: 'entity' as const,
        content: 'Content with [[link]]',
        frontmatter: {
          title: 'Test Page',
          tags: ['test'],
          sources: ['source.md'],
          relatedPages: ['other-page'],
        },
        lastModified: new Date(),
        createdAt: new Date(),
      };
      
      const result = validator.validatePage(page);
      expect(result.valid).toBe(true);
    });

    it('should collect all issues from different validators', () => {
      const page = {
        slug: 'BadSlug', // Invalid (uppercase)
        title: 'Test Page',
        type: 'entity' as const,
        content: 'No wiki links here',
        frontmatter: {
          title: 'Test Page',
          tags: [],
          sources: [],
          relatedPages: [],
        },
        lastModified: new Date(),
        createdAt: new Date(),
      };
      
      const result = validator.validatePage(page);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(1);
    });
  });

  describe('suggestCorrections', () => {
    it('should suggest kebab-case for slug', () => {
      const suggestion = validator.suggestSlugCorrection('Artificial Intelligence');
      expect(suggestion).toBe('artificial-intelligence');
    });

    it('should remove special characters', () => {
      const suggestion = validator.suggestSlugCorrection('Test@Page#123');
      expect(suggestion).toBe('testpage123');
    });

    it('should handle unicode', () => {
      const suggestion = validator.suggestSlugCorrection('Café Résumé');
      expect(suggestion).toBe('cafe-resume');
    });
  });
});
