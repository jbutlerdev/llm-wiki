/**
 * Coverage analysis for wiki pages
 * @module @llm-wiki/core/lint/coverage
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import matter from 'gray-matter';
import type { CoverageGap, PageType } from '../types/index.js';

/**
 * Page directories to scan
 */
const PAGE_DIRS: PageType[] = ['entity', 'source', 'summary', 'comparison', 'synthesis'];

/**
 * Non-page files to exclude
 */
const EXCLUDED_FILES = ['index.md', 'log.md', 'CLAUDE.md', 'AGENTS.md'];

/**
 * Important concepts that should have pages
 * These are detected from mentions in content
 */
const CORE_CONCEPTS = [
  'overview', 'introduction', 'summary', 'background',
  'getting started', 'tutorial', 'guide', 'documentation',
];

/**
 * Analyze wiki coverage and identify gaps
 */
export async function analyzeCoverage(wikiDir: string): Promise<CoverageGap[]> {
  const gaps: CoverageGap[] = [];
  
  if (!existsSync(wikiDir)) {
    return gaps;
  }

  // Collect all page info
  const pages: Array<{
    slug: string;
    title: string;
    type: PageType;
    tags: string[];
    relatedPages: string[];
    content: string;
  }> = [];

  // Scan each page type directory
  for (const type of PAGE_DIRS) {
    const dirPath = join(wikiDir, 'wiki', type);
    
    if (!existsSync(dirPath)) {
      continue;
    }

    try {
      const files = await readdir(dirPath);
      
      for (const file of files) {
        if (extname(file) !== '.md' || EXCLUDED_FILES.includes(file)) {
          continue;
        }

        const slug = file.replace(/\.md$/, '');
        const filePath = join(dirPath, file);

        try {
          const content = await readFile(filePath, 'utf-8');
          const { data, content: markdownContent } = matter(content);
          
          pages.push({
            slug: `${type}/${slug}`,
            title: data.title || slug,
            type,
            tags: data.tags || [],
            relatedPages: data.relatedPages || [],
            content: markdownContent,
          });
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  // Check 1: No summary/overview page exists
  const hasSummary = pages.some(p => p.type === 'summary');
  if (!hasSummary && pages.length > 3) {
    gaps.push({
      concept: 'Missing overview page',
      description: 'The wiki has multiple pages but no summary/overview page. Consider creating summary/index.md to provide an introduction to the wiki content.',
      suggestedPages: ['summary/index.md'],
    });
  }

  // Check 2: Entity pages with no cross-references
  const orphanedEntities = pages.filter(p => 
    p.type === 'entity' && p.relatedPages.length === 0
  );
  
  if (orphanedEntities.length > 0) {
    gaps.push({
      concept: 'Disconnected entity pages',
      description: `${orphanedEntities.length} entity page(s) have no cross-references: ${orphanedEntities.map(p => p.title).join(', ')}. Consider adding relatedPages to improve discoverability.`,
      suggestedPages: orphanedEntities.slice(0, 5).map(p => `entity/${p.slug.split('/')[1]}`),
    });
  }

  // Check 3: Source pages with no linked entity pages
  const sourcesWithoutLinks = pages.filter(p => {
    if (p.type !== 'source') return false;
    return !pages.some(other => 
      other.relatedPages.includes(p.slug.split('/')[1]) ||
      other.relatedPages.includes(p.slug)
    );
  });

  if (sourcesWithoutLinks.length > 0) {
    gaps.push({
      concept: 'Unlinked source pages',
      description: `${sourcesWithoutLinks.length} source page(s) have no entity pages linking to them. Consider creating entity pages for concepts mentioned in these sources.`,
      suggestedPages: sourcesWithoutLinks.slice(0, 3).map(p => `entity/${p.title.toLowerCase().replace(/\s+/g, '-')}`),
    });
  }

  // Check 4: Tag coverage - common tags without pages
  const allTags = new Set<string>();
  for (const page of pages) {
    for (const tag of page.tags) {
      allTags.add(tag);
    }
  }

  const commonTags = ['getting-started', 'tutorial', 'reference', 'advanced', 'troubleshooting'];
  for (const tag of commonTags) {
    if (!allTags.has(tag) && pages.length >= 5) {
      gaps.push({
        concept: `Missing content for "${tag}" tag`,
        description: `No pages are tagged with "${tag}". Consider categorizing existing pages or adding new content in this category.`,
        suggestedPages: [],
      });
    }
  }

  // Check 5: Pages with similar titles (possible duplicates)
  const titleGroups = new Map<string, typeof pages>();
  for (const page of pages) {
    const normalizedTitle = page.title.toLowerCase().replace(/[^\w]/g, '');
    const existing = titleGroups.get(normalizedTitle) || [];
    existing.push(page);
    titleGroups.set(normalizedTitle, existing);
  }

  for (const [normalizedTitle, group] of titleGroups) {
    if (group.length > 1) {
      const titles = group.map(p => p.title).join(', ');
      gaps.push({
        concept: 'Potential duplicate pages',
        description: `Multiple pages have similar titles: ${titles}. Consider merging or clarifying their distinct purposes.`,
        suggestedPages: group.map(p => p.slug),
      });
    }
  }

  // Check 6: Check for deep links (too many levels deep)
  const deepPages = pages.filter(p => p.slug.split('/').length > 2);
  if (deepPages.length > pages.length * 0.3) {
    gaps.push({
      concept: 'Deep nesting structure',
      description: `Many pages are nested deeply. Consider flattening the structure or adding more top-level categories for better organization.`,
      suggestedPages: [],
    });
  }

  // Check 7: Pages without tags
  const untaggedPages = pages.filter(p => p.tags.length === 0);
  if (untaggedPages.length > 0) {
    gaps.push({
      concept: 'Untagged pages',
      description: `${untaggedPages.length} page(s) have no tags. Adding tags improves search and organization.`,
      suggestedPages: untaggedPages.slice(0, 5).map(p => p.slug),
    });
  }

  // Check 8: Content gaps based on common domain patterns
  const content = pages.map(p => p.content).join(' ').toLowerCase();
  const importantKeywords = [
    { keyword: 'api', suggestion: 'entity/api-reference.md' },
    { keyword: 'cli', suggestion: 'entity/cli-commands.md' },
    { keyword: 'config', suggestion: 'entity/configuration.md' },
    { keyword: 'install', suggestion: 'entity/installation.md' },
    { keyword: 'setup', suggestion: 'entity/setup.md' },
    { keyword: 'error', suggestion: 'entity/troubleshooting.md' },
    { keyword: 'deploy', suggestion: 'entity/deployment.md' },
    { keyword: 'test', suggestion: 'entity/testing.md' },
  ];

  for (const { keyword, suggestion } of importantKeywords) {
    if (content.includes(keyword) && !pages.some(p => p.slug.includes(keyword))) {
      gaps.push({
        concept: `Content mentions "${keyword}" but no dedicated page exists`,
        description: `Consider creating a dedicated page for ${keyword}-related information.`,
        suggestedPages: [suggestion],
      });
    }
  }

  return gaps;
}
