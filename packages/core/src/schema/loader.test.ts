/**
 * Tests for SchemaLoader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SchemaLoader } from './loader.js';

describe('SchemaLoader', () => {
  let testDir: string;
  let schemaPath: string;

  beforeEach(() => {
    // Create temporary directory for tests
    testDir = join(tmpdir(), `schema-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    // SchemaLoader expects wiki directory structure: wikiDir/wiki/CLAUDE.md
    mkdirSync(join(testDir, 'wiki'), { recursive: true });
    schemaPath = join(testDir, 'wiki', 'CLAUDE.md');
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('load', () => {
    it('should load a CLAUDE.md schema file', () => {
      const schemaContent = `# LLM Wiki Schema

## Conventions

### Naming
- Use lowercase-kebab-case

## Workflows

### Ingest
1. Read source
2. Extract entities
3. Create pages

### Query
1. Search pages
2. Synthesize answer
`;
      writeFileSync(schemaPath, schemaContent);

      const loader = new SchemaLoader(testDir);
      const schema = loader.load();

      expect(schema).toBeDefined();
      expect(schema!.raw).toBe(schemaContent);
      expect(schema!.conventions).toBeDefined();
      expect(schema!.workflows).toBeDefined();
    });

    it('should return null when schema file does not exist', () => {
      const loader = new SchemaLoader(testDir);
      const schema = loader.load();

      expect(schema).toBeNull();
    });

    it('should extract conventions section', () => {
      const schemaContent = `# LLM Wiki Schema

## Conventions

### Naming
- Use lowercase-kebab-case
- Include type prefix

### Frontmatter
- Always include tags
- Always include sources
`;
      writeFileSync(schemaPath, schemaContent);

      const loader = new SchemaLoader(testDir);
      const schema = loader.load();

      expect(schema?.conventions).toBeDefined();
      expect(schema?.conventions.naming).toContain('Use lowercase-kebab-case');
      expect(schema?.conventions.frontmatter).toContain('Always include tags');
    });

    it('should extract workflow sections', () => {
      const schemaContent = `# LLM Wiki Schema

## Workflows

### Ingest
1. Read the source document
2. Extract key entities
3. Create entity pages
4. Update index

### Query
1. Search relevant pages
2. Synthesize answer
`;
      writeFileSync(schemaPath, schemaContent);

      const loader = new SchemaLoader(testDir);
      const schema = loader.load();

      expect(schema?.workflows.Ingest).toBeDefined();
      expect(schema?.workflows.Query).toBeDefined();
      expect(schema?.workflows.Ingest?.steps).toHaveLength(4);
      expect(schema?.workflows.Query?.steps).toHaveLength(2);
    });

    it('should cache loaded schema', () => {
      const schemaContent = `# Schema
## Conventions
### Test
- value
`;
      writeFileSync(schemaPath, schemaContent);

      const loader = new SchemaLoader(testDir);
      const schema1 = loader.load();
      
      // Modify file after first load
      writeFileSync(schemaPath, `# Schema
## Conventions
### Test
- modified
`);

      // Should return cached version
      const schema2 = loader.load();
      
      expect(schema1?.conventions.test).toBe(schema2?.conventions.test);
    });

    it('should clear cache when refreshing', () => {
      const schemaContent = `# Schema
## Conventions
### Test
- original
`;
      writeFileSync(schemaPath, schemaContent);

      const loader = new SchemaLoader(testDir);
      loader.load();
      
      // Modify file
      writeFileSync(schemaPath, `# Schema
## Conventions
### Test
- modified
`);

      // Should reload with refresh()
      const schema = loader.refresh();
      
      expect(schema?.conventions.test).toContain('modified');
    });
  });

  describe('exists', () => {
    it('should return true when schema exists', () => {
      // Ensure wiki directory exists
      mkdirSync(join(testDir, 'wiki'), { recursive: true });
      writeFileSync(schemaPath, '# Schema');
      const loader = new SchemaLoader(testDir);
      
      expect(loader.exists()).toBe(true);
    });

    it('should return false when schema does not exist', () => {
      const loader = new SchemaLoader(testDir);
      
      expect(loader.exists()).toBe(false);
    });
  });

  describe('getWorkflow', () => {
    it('should return specific workflow by name', () => {
      const schemaContent = `# Schema

## Workflows

### Ingest
1. Step one
2. Step two

### Lint
1. Check contradictions
2. Check orphans
`;
      writeFileSync(schemaPath, schemaContent);

      const loader = new SchemaLoader(testDir);
      loader.load();

      const workflow = loader.getWorkflow('ingest');
      expect(workflow).toBeDefined();
      expect(workflow?.name).toBe('Ingest');
      expect(workflow?.steps).toHaveLength(2);
    });

    it('should return undefined for non-existent workflow', () => {
      const schemaContent = `# Schema

## Workflows

### Ingest
1. Step
`;
      writeFileSync(schemaPath, schemaContent);

      const loader = new SchemaLoader(testDir);
      loader.load();

      const workflow = loader.getWorkflow('nonExistent');
      expect(workflow).toBeUndefined();
    });
  });
});
