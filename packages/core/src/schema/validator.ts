/**
 * Schema validation functionality
 * @module @llm-wiki/core/schema/validator
 */

import { Schema } from './loader.js';
import { WikiPage, PageMeta } from '../types/index.js';

/**
 * Validation issue severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  field: string;
  message: string;
  severity: ValidationSeverity;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Schema validator for wiki pages
 */
export class SchemaValidator {
  private schema: Schema;

  constructor(schema: Schema) {
    this.schema = schema;
  }

  /**
   * Validate a page slug against naming conventions
   */
  validatePageSlug(slug: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    const conventions = this.schema.conventions.naming || [];

    // Check for lowercase
    if (conventions.includes('lowercase-kebab-case')) {
      if (slug !== slug.toLowerCase()) {
        issues.push({
          field: 'slug',
          message: `Slug should be lowercase: '${slug}' contains uppercase letters`,
          severity: 'error',
        });
      }
    }

    // Check for kebab-case (no spaces)
    if (conventions.includes('no spaces') || conventions.includes('kebab-case')) {
      if (slug.includes(' ')) {
        issues.push({
          field: 'slug',
          message: `Slug should use kebab-case (hyphens): '${slug}' contains spaces`,
          severity: 'error',
        });
      }
    }

    // Check for special characters (allow hyphens and underscores)
    const cleanSlug = slug.replace(/[-_]/g, '');
    if (!/^[a-z0-9]+$/i.test(cleanSlug)) {
      issues.push({
        field: 'slug',
        message: `Slug should only contain letters, numbers, hyphens, and underscores: '${slug}'`,
        severity: 'error',
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Validate frontmatter against conventions
   */
  validateFrontmatter(frontmatter: PageMeta): ValidationResult {
    const issues: ValidationIssue[] = [];
    const conventions = this.schema.conventions.frontmatter || [];

    // Note: title is on WikiPage, not PageMeta. We don't check for it here.
    // The page-level validation handles title.

    // Check for tags
    if (conventions.includes('always include tags') || conventions.includes('tags')) {
      if (!frontmatter.tags || frontmatter.tags.length === 0) {
        issues.push({
          field: 'frontmatter.tags',
          message: 'Frontmatter should include tags array',
          severity: 'error',
        });
      }
    }

    // Check for sources
    if (frontmatter.sources && frontmatter.sources.length === 0) {
      issues.push({
        field: 'frontmatter.sources',
        message: 'Consider adding source references',
        severity: 'warning',
      });
    }

    // Warn if no sources
    if (frontmatter.sources && frontmatter.sources.length === 0) {
      issues.push({
        field: 'frontmatter.sources',
        message: 'Consider adding source references',
        severity: 'warning',
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  }

  /**
   * Validate wiki links in content
   */
  validateLinks(content: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    const conventions = this.schema.conventions.links || [];

    // Extract wiki links [[...]]
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    const wikiLinks = [...content.matchAll(wikiLinkRegex)].map(m => m[1]);

    // Extract bare URLs
    const urlRegex = /https?:\/\/[^\s\]]+/g;
    const urls = content.match(urlRegex) || [];

    // Check for bare URLs
    if (urls.length > 0 && conventions.includes('use double brackets')) {
      issues.push({
        field: 'content.links',
        message: `Found ${urls.length} bare URL(s). Consider using [[wiki-links]] instead`,
        severity: 'warning',
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  }

  /**
   * Validate a complete wiki page
   */
  validatePage(page: WikiPage): ValidationResult {
    const allIssues: ValidationIssue[] = [];

    // Validate slug
    const slugResult = this.validatePageSlug(page.slug);
    allIssues.push(...slugResult.issues);

    // Validate frontmatter
    const frontmatterResult = this.validateFrontmatter(page.frontmatter);
    allIssues.push(...frontmatterResult.issues);

    // Validate links in content
    const linksResult = this.validateLinks(page.content);
    allIssues.push(...linksResult.issues);

    return {
      valid: allIssues.filter(i => i.severity === 'error').length === 0,
      issues: allIssues,
    };
  }

  /**
   * Suggest a corrected slug based on conventions
   */
  suggestSlugCorrection(text: string): string {
    return text
      // Convert to lowercase (handles unicode like Café -> café)
      .toLowerCase()
      // Normalize unicode characters (é → e)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove special characters (keep only alphanumeric and hyphen)
      .replace(/[^a-z0-9-]/g, '')
      // Remove consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get validation summary
   */
  getSummary(): {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
  } {
    // This would need to track issues across multiple validations
    // For now, return placeholder structure
    return {
      totalIssues: 0,
      errors: 0,
      warnings: 0,
      info: 0,
    };
  }
}
