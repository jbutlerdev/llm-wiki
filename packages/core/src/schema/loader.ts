/**
 * Schema loading and parsing functionality
 * @module @llm-wiki/core/schema/loader
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Schema conventions extracted from CLAUDE.md
 */
export interface SchemaConventions {
  naming?: string[];
  frontmatter?: string[];
  links?: string[];
  [key: string]: string[] | undefined;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  step: number;
  description: string;
}

/**
 * Workflow definition extracted from schema
 */
export interface Workflow {
  name: string;
  description?: string;
  steps: WorkflowStep[];
}

/**
 * Parsed schema structure
 */
export interface Schema {
  raw: string;
  title?: string;
  conventions: SchemaConventions;
  workflows: Record<string, Workflow>;
}

/**
 * Schema loader for CLAUDE.md files
 */
export class SchemaLoader {
  private wikiDir: string;
  private schemaPath: string;
  private cachedSchema: Schema | null = null;

  constructor(wikiDir: string) {
    this.wikiDir = wikiDir;
    this.schemaPath = join(wikiDir, 'wiki', 'CLAUDE.md');
  }

  /**
   * Check if schema file exists
   */
  exists(): boolean {
    return existsSync(this.schemaPath);
  }

  /**
   * Load and parse the schema file
   */
  load(): Schema | null {
    if (!this.exists()) {
      return null;
    }

    // Return cached version if available
    if (this.cachedSchema) {
      return this.cachedSchema;
    }

    const raw = readFileSync(this.schemaPath, 'utf-8');
    this.cachedSchema = this.parse(raw);
    return this.cachedSchema;
  }

  /**
   * Force reload the schema, bypassing cache
   */
  refresh(): Schema | null {
    this.cachedSchema = null;
    return this.load();
  }

  /**
   * Get a specific workflow by name
   */
  getWorkflow(name: string): Workflow | undefined {
    const schema = this.load();
    if (!schema) return undefined;
    
    // Normalize the name for lookup (capitalize first letter)
    const normalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    return schema.workflows[normalizedName];
  }

  /**
   * Parse raw schema content
   */
  private parse(raw: string): Schema {
    // Extract title from first heading
    let title: string | undefined;
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1];
    }

    // Parse conventions section
    const conventions = this.parseConventions(raw);
    
    // Parse workflows section
    const workflows = this.parseWorkflows(raw);

    return {
      raw,
      title,
      conventions,
      workflows,
    };
  }

  /**
   * Parse conventions from schema content
   */
  private parseConventions(raw: string): SchemaConventions {
    const conventions: SchemaConventions = {};
    
    // Split by top-level ## sections using lookahead
    // (?=## ) matches ## followed by space, at start of line or after newline
    const sections = raw.split(/(?:^|\n)(?=## )/);
    
    // Find the Conventions section
    const conventionsSection = sections.find(s => s.startsWith('## Conventions'));
    if (!conventionsSection) {
      return conventions;
    }

    // Split by ### subsections (lookahead for ### at start of line)
    const subsections = conventionsSection.split(/(?:^|\n)(?=### )/);
    
    for (const subsection of subsections) {
      if (!subsection.startsWith('### ')) continue;
      
      const lines = subsection.split('\n');
      if (lines.length === 0) continue;
      
      // Extract subsection name (remove ### prefix)
      const nameMatch = lines[0].replace(/^### \s*/, '').trim().match(/^([\w-]+)/);
      if (!nameMatch) continue;
      
      const subsectionName = nameMatch[1].toLowerCase();
      
      // Rest of the lines are the content
      const content = lines.slice(1).join('\n');
      
      // Extract bullet points
      const items = content
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(item => item.length > 0);
      
      conventions[subsectionName] = items;
    }

    return conventions;
  }

  /**
   * Parse workflows from schema content
   */
  private parseWorkflows(raw: string): Record<string, Workflow> {
    const workflows: Record<string, Workflow> = {};
    
    // Split by top-level ## sections using lookahead
    const sections = raw.split(/(?:^|\n)(?=## )/);
    
    // Find the Workflows section
    const workflowsSection = sections.find(s => s.startsWith('## Workflows'));
    if (!workflowsSection) {
      return workflows;
    }

    // Split by ### subsections (lookahead for ### at start of line)
    const subsections = workflowsSection.split(/(?:^|\n)(?=### )/);
    
    for (const subsection of subsections) {
      if (!subsection.startsWith('### ')) continue;
      
      const lines = subsection.split('\n');
      if (lines.length === 0) continue;
      
      // Extract workflow name (remove ### prefix)
      const nameMatch = lines[0].replace(/^### \s*/, '').trim().match(/^([\w-]+)/);
      if (!nameMatch) continue;
      
      const name = nameMatch[1];
      
      // Rest of the lines are the content
      const content = lines.slice(1).join('\n');
      
      // Extract description (paragraph before numbered list)
      const descMatch = content.match(/^([^\n1-9]+?)(?=\n?\d+\.)/s);
      const description = descMatch ? descMatch[1].trim() : undefined;
      
      // Extract numbered steps
      const steps = this.parseWorkflowSteps(content);
      
      workflows[name] = {
        name,
        description,
        steps,
      };
    }

    return workflows;
  }

  /**
   * Parse numbered workflow steps
   */
  private parseWorkflowSteps(content: string): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    
    // Match numbered steps (1. Step description)
    const stepRegex = /^(\d+)\.\s+(.+)$/gm;
    let match;
    
    while ((match = stepRegex.exec(content)) !== null) {
      steps.push({
        step: parseInt(match[1], 10),
        description: match[2].trim(),
      });
    }

    return steps;
  }
}
