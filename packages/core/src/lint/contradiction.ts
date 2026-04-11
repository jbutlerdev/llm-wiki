/**
 * Contradiction detection for wiki pages
 * @module @llm-wiki/core/lint/contradiction
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import matter from 'gray-matter';
import type { LintIssue, PageType } from '../types/index.js';

// Patterns that indicate factual claims
const CLAIM_PATTERNS = [
  // is/isn't patterns
  /(\w+(?:\s+\w+)*)\s+is\s+(not\s+)?(\w+(?:\s+\w+)*)/gi,
  /(\w+(?:\s+\w+)*)\s+are\s+(not\s+)?(\w+(?:\s+\w+)*)/gi,
  // was/were patterns
  /(\w+(?:\s+\w+)*)\s+was\s+(not\s+)?(\w+(?:\s+\w+)*)/gi,
  /(\w+(?:\s+\w+)*)\s+were\s+(not\s+)?(\w+(?:\s+\w+)*)/gi,
  // has/hasn't patterns
  /(\w+(?:\s+\w+)*)\s+has\s+(not\s+)?(\w+(?:\s+\w+)*)/gi,
  // contains patterns
  /(\w+(?:\s+\w+)*)\s+contains?\s+(not\s+)?(\w+(?:\s+\w+)*)/gi,
  // supports/contradicts patterns (for arguments)
  /this (supports|contradicts|confirms|refutes)/gi,
  // certainty patterns
  /(always|never|definitely|always)\s+(is|are|was|were)/gi,
  /(never|rarely|never)\s+(is|are|was|were)/gi,
];

/**
 * Claim extracted from a page
 */
interface ExtractedClaim {
  subject: string;
  predicate: string;
  negated: boolean;
  pageSlug: string;
  line: number;
  context: string;
}

/**
 * Page directories to scan
 */
const PAGE_DIRS: PageType[] = ['entity', 'source', 'summary', 'comparison', 'synthesis'];

/**
 * Non-page files to exclude
 */
const EXCLUDED_FILES = ['index.md', 'log.md', 'CLAUDE.md', 'AGENTS.md'];

/**
 * Extract factual claims from a page's content
 */
function extractClaimsFromContent(content: string, pageSlug: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    // Skip headers and code blocks
    if (line.startsWith('#') || line.startsWith('```')) continue;
    
    // Skip links and references
    const cleanLine = line.replace(/\[\[.*?\]\]/g, '').replace(/\[.*?\]\(.*?\)/g, '');

    for (const pattern of CLAIM_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(cleanLine)) !== null) {
        if (match[1] && match[2] !== undefined) {
          claims.push({
            subject: match[1].trim(),
            predicate: (match[3] || match[0]).trim(),
            negated: match[2]?.includes('not') || false,
            pageSlug,
            line: lineNum + 1,
            context: line.trim().slice(0, 100),
          });
        }
      }
    }
  }

  return claims;
}

/**
 * Normalize a claim for comparison
 */
function normalizeClaim(claim: ExtractedClaim): string {
  const subject = claim.subject.toLowerCase().trim();
  const predicate = claim.predicate.toLowerCase().trim();
  const negation = claim.negated ? 'not ' : '';
  return `${subject} ${negation}${predicate}`;
}

/**
 * Check if two claims are contradictory
 */
function areContradictory(claim1: ExtractedClaim, claim2: ExtractedClaim): boolean {
  // Same subject (normalized)
  const subject1 = claim1.subject.toLowerCase().trim();
  const subject2 = claim2.subject.toLowerCase().trim();
  
  if (subject1 !== subject2) return false;
  
  // Same predicate but one is negated
  const pred1 = claim1.predicate.toLowerCase().trim();
  const pred2 = claim2.predicate.toLowerCase().trim();
  
  if (pred1 === pred2 && claim1.negated !== claim2.negated) {
    return true;
  }
  
  // Antonym detection (simple)
  const antonyms: Record<string, string> = {
    'true': 'false',
    'false': 'true',
    'good': 'bad',
    'bad': 'good',
    'yes': 'no',
    'no': 'yes',
    'supports': 'contradicts',
    'contradicts': 'supports',
    'confirms': 'refutes',
    'refutes': 'confirms',
  };
  
  if (antonyms[pred1] === pred2 || antonyms[pred2] === pred1) {
    return true;
  }
  
  return false;
}

/**
 * Detect contradictions between wiki pages
 */
export async function detectWikiContradictions(wikiDir: string): Promise<LintIssue[]> {
  const issues: LintIssue[] = [];
  
  if (!existsSync(wikiDir)) {
    return issues;
  }

  // Collect all claims from all pages
  const allClaims: ExtractedClaim[] = [];

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
          const { content: markdownContent } = matter(content);
          
          const claims = extractClaimsFromContent(markdownContent, `${type}/${slug}`);
          allClaims.push(...claims);
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  // Compare claims to find contradictions
  const seen = new Set<string>();
  
  for (let i = 0; i < allClaims.length; i++) {
    for (let j = i + 1; j < allClaims.length; j++) {
      const claim1 = allClaims[i];
      const claim2 = allClaims[j];
      
      // Skip claims from the same page
      if (claim1.pageSlug === claim2.pageSlug) continue;
      
      if (areContradictory(claim1, claim2)) {
        const key = [claim1.pageSlug, claim2.pageSlug, claim1.subject].sort().join('|');
        
        if (!seen.has(key)) {
          seen.add(key);
          
          const claim1Norm = normalizeClaim(claim1);
          const claim2Norm = normalizeClaim(claim2);
          
          issues.push({
            type: 'contradiction',
            pageId: claim1.pageSlug,
            message: `Potential contradiction: "${claim1Norm}" vs "${claim2Norm}". Found on pages "${claim1.pageSlug}" and "${claim2.pageSlug}"`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return issues;
}
