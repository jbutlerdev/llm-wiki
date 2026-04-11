/**
 * Tests for SchemaTemplate generator
 */

import { describe, it, expect } from 'vitest';
import { generateSchemaTemplate, generateAgentsTemplate } from './template.js';

describe('SchemaTemplate', () => {
  describe('generateSchemaTemplate', () => {
    it('should generate a valid CLAUDE.md template', () => {
      const template = generateSchemaTemplate();
      
      expect(template).toBeDefined();
      expect(template).toContain('# LLM Wiki');
      expect(template).toContain('## Wiki Structure');
      expect(template).toContain('## Conventions');
      expect(template).toContain('## Workflows');
    });

    it('should include wiki structure section', () => {
      const template = generateSchemaTemplate();
      
      expect(template).toContain('wiki/');
      expect(template).toContain('wiki/raw/');
      expect(template).toContain('wiki/entity/');
      expect(template).toContain('wiki/source/');
    });

    it('should include conventions section', () => {
      const template = generateSchemaTemplate();
      
      expect(template).toContain('### Naming');
      expect(template).toContain('### Frontmatter');
      expect(template).toContain('### Links');
    });

    it('should include workflow sections', () => {
      const template = generateSchemaTemplate();
      
      expect(template).toContain('### Ingest');
      expect(template).toContain('### Query');
      expect(template).toContain('### Lint');
    });

    it('should include numbered workflow steps', () => {
      const template = generateSchemaTemplate();
      
      // Check that Ingest workflow has numbered steps
      const ingestSection = template.split('### Ingest')[1]?.split('### ')[0] || '';
      expect(ingestSection).toMatch(/^\d+\./m);
    });

    it('should customize with wiki name', () => {
      const template = generateSchemaTemplate({
        wikiName: 'My Research Wiki',
      });
      
      expect(template).toContain('My Research Wiki');
    });

    it('should include error handling section', () => {
      const template = generateSchemaTemplate();
      
      expect(template).toContain('## Error Handling');
      expect(template).toContain('source attribution');
      expect(template).toContain('log.md');
    });
  });

  describe('generateAgentsTemplate', () => {
    it('should generate a valid AGENTS.md template', () => {
      const template = generateAgentsTemplate();
      
      expect(template).toBeDefined();
      expect(template).toContain('# LLM Wiki Agent Instructions');
      expect(template).toContain('## On Source Ingestion');
      expect(template).toContain('## On Questions');
      expect(template).toContain('## On Lint');
    });

    it('should include conventions section', () => {
      const template = generateAgentsTemplate();
      
      expect(template).toContain('## Conventions');
      expect(template).toContain('lowercase-kebab-case');
      expect(template).toContain('[[page-slug]]');
    });

    it('should customize with wiki name', () => {
      const template = generateAgentsTemplate({
        wikiName: 'Project Alpha',
      });
      
      expect(template).toContain('Project Alpha');
    });

    it('should include ingest workflow steps', () => {
      const template = generateAgentsTemplate();
      
      const ingestSection = template.split('## On Source Ingestion')[1]?.split('##')[0] || '';
      expect(ingestSection).toMatch(/\d+\./);
    });
  });
});
