/**
 * Staleness checking for wiki pages
 * @module @llm-wiki/core/lint/staleness
 */

import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname, basename } from 'path';
import matter from 'gray-matter';
import type { LintIssue, PageType } from '../types/index.js';

/**
 * Page directories to scan
 */
const PAGE_DIRS: PageType[] = ['entity', 'source', 'summary', 'comparison', 'synthesis'];

/**
 * Non-page files to exclude
 */
const EXCLUDED_FILES = ['index.md', 'log.md', 'CLAUDE.md', 'AGENTS.md'];

/**
 * Days before a page is considered stale
 */
const STALE_THRESHOLD_DAYS = 90;

/**
 * Days before a page with no sources is flagged
 */
const NO_SOURCE_THRESHOLD_DAYS = 30;

/**
 * Check if a page is potentially stale based on:
 * - Last modification date
 * - Presence of source references
 * - Content age indicators
 */
export async function checkStaleness(wikiDir: string): Promise<LintIssue[]> {
  const issues: LintIssue[] = [];
  
  if (!existsSync(wikiDir)) {
    return issues;
  }

  const now = new Date();
  const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const noSourceThreshold = new Date(now.getTime() - NO_SOURCE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

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
        const pageId = `${type}/${slug}`;

        try {
          const content = await readFile(filePath, 'utf-8');
          const { data, content: markdownContent } = matter(content);
          
          const lastModified = data.lastModified 
            ? new Date(data.lastModified) 
            : new Date((await stat(filePath)).mtime);
          
          const sources = data.sources || [];
          
          // Check 1: Page hasn't been updated in a long time
          if (lastModified < staleThreshold && sources.length === 0) {
            const daysSinceUpdate = Math.floor(
              (now.getTime() - lastModified.getTime()) / (24 * 60 * 60 * 1000)
            );
            
            issues.push({
              type: 'stale',
              pageId,
              message: `Page has not been updated in ${daysSinceUpdate} days and has no source references`,
              severity: 'info',
            });
          }
          
          // Check 2: Page has sources but no recent updates
          if (sources.length > 0 && lastModified < noSourceThreshold) {
            const daysSinceUpdate = Math.floor(
              (now.getTime() - lastModified.getTime()) / (24 * 60 * 60 * 1000)
            );
            
            // Check if any source is newer than the page
            const hasNewerSource = await checkForNewerSources(wikiDir, sources);
            
            if (hasNewerSource) {
              issues.push({
                type: 'stale',
                pageId,
                message: `Page may contain outdated information - referenced sources have been updated in the last ${daysSinceUpdate} days`,
                severity: 'warning',
              });
            }
          }
          
          // Check 3: Look for date indicators in content that might be outdated
          const datePatterns = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/gi;
          const contentDates = markdownContent.match(datePatterns);
          
          if (contentDates) {
            for (const dateStr of contentDates) {
              const contentDate = new Date(dateStr);
              const contentAge = Math.floor(
                (now.getTime() - contentDate.getTime()) / (24 * 60 * 60 * 1000)
              );
              
              if (contentAge > 365 && lastModified < staleThreshold) {
                issues.push({
                  type: 'stale',
                  pageId,
                  message: `Page references events from ${dateStr}, which may be outdated`,
                  severity: 'info',
                });
                break;
              }
            }
          }
          
          // Check 4: Look for "current" or "latest" claims about things that change
          const outdatedPhrases = [
            /\bcurrently\s+(is|are|was|were)\b/gi,
            /\blatest\s+(version|release|update)\b/gi,
            /\bup to date\b/gi,
            /\brecently\s+(added|updated|created)\b/gi,
          ];
          
          for (const pattern of outdatedPhrases) {
            pattern.lastIndex = 0;
            if (pattern.test(markdownContent) && lastModified < staleThreshold) {
              issues.push({
                type: 'stale',
                pageId,
                message: `Page contains claims about "current" or "latest" status but has not been updated since ${lastModified.toISOString().split('T')[0]}`,
                severity: 'info',
              });
              break;
            }
          }
          
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  return issues;
}

/**
 * Check if any of the referenced sources are newer than the page
 */
async function checkForNewerSources(wikiDir: string, sources: string[]): Promise<boolean> {
  const rawDir = join(wikiDir, 'raw');
  
  if (!existsSync(rawDir)) {
    return false;
  }

  try {
    for (const sourcePath of sources) {
      // Try to find the source file
      const possiblePaths = [
        join(rawDir, sourcePath),
        join(rawDir, basename(sourcePath)),
        sourcePath,
      ];
      
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          const sourceStat = await stat(path);
          const sourceAge = Date.now() - sourceStat.mtime.getTime();
          const sourceAgeDays = sourceAge / (24 * 60 * 60 * 1000);
          
          // If source was modified in the last 30 days
          if (sourceAgeDays < 30) {
            return true;
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }
  
  return false;
}
