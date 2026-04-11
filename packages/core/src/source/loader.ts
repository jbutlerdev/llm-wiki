/**
 * Source document loading
 * @module @llm-wiki/core/source/loader
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { createHash } from 'crypto';
import type { SourceDocument, SourceType } from '../types/index.js';

export interface LoadResult {
  source: SourceDocument;
  content: string;
}

/**
 * SourceLoader handles loading source documents from various sources:
 * - Markdown files (local .md files)
 * - URLs (fetched and converted to markdown)
 * - Raw text inputs
 */
export class SourceLoader {
  private rawDir: string;

  /**
   * Create a new SourceLoader
   * @param rawDir - Directory to store raw source files
   */
  constructor(rawDir: string) {
    this.rawDir = rawDir;
  }

  /**
   * Check if a path is a URL
   */
  isUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  /**
   * Check if a path is a markdown file
   */
  isMarkdownFile(path: string): boolean {
    return extname(path).toLowerCase() === '.md';
  }

  /**
   * Load a markdown file and create a SourceDocument
   */
  async loadMarkdownFile(filePath: string): Promise<SourceDocument> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = await readFile(filePath, 'utf-8');
    const filename = basename(filePath);
    const title = this.detectTitle(content, filename);
    const checksum = this.calculateChecksum(content);

    return {
      path: filePath,
      type: 'markdown',
      title,
      content,
      checksum,
      ingestedAt: new Date(),
    };
  }

  /**
   * Process raw text input and create a SourceDocument
   */
  async loadTextInput(text: string): Promise<SourceDocument> {
    const title = this.detectTitle(text);
    const checksum = this.calculateChecksum(text);

    return {
      path: undefined,
      type: 'text',
      title,
      content: text,
      checksum,
      ingestedAt: new Date(),
    };
  }

  /**
   * Load a source from a URL
   * Note: Actual URL fetching would use turndown in a real implementation
   */
  async loadUrl(url: string): Promise<SourceDocument> {
    // In a full implementation, this would:
    // 1. Fetch the URL using a fetch library
    // 2. Convert HTML to markdown using turndown
    // 3. Save the raw HTML and converted markdown to rawDir
    
    // For now, we create a placeholder source document
    const title = this.extractTitleFromUrl(url);
    const content = `[Content from ${url}]`;
    const checksum = this.calculateChecksum(content);

    return {
      path: undefined,
      type: 'url',
      title,
      content,
      url,
      checksum,
      ingestedAt: new Date(),
    };
  }

  /**
   * Load a source document based on its type
   */
  async loadSource(source: string): Promise<SourceDocument> {
    if (this.isUrl(source)) {
      return this.loadUrl(source);
    }

    if (this.isMarkdownFile(source)) {
      return this.loadMarkdownFile(source);
    }

    // Treat as raw text
    return this.loadTextInput(source);
  }

  /**
   * Detect the title from content
   */
  detectTitle(content: string, filename?: string): string {
    // Try to extract from first heading
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // Try h2 if no h1
    const h2Match = content.match(/^##\s+(.+)$/m);
    if (h2Match) {
      return h2Match[1].trim();
    }

    // Use filename without extension
    if (filename) {
      return basename(filename, extname(filename));
    }

    // Try first non-empty line
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        return trimmed.slice(0, 100); // Limit title length
      }
    }

    return 'Untitled';
  }

  /**
   * Calculate a checksum for content deduplication
   */
  calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Extract a readable title from a URL
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // Use last segment of path
      if (path && path !== '/') {
        const segments = path.split('/').filter(Boolean);
        if (segments.length > 0) {
          const lastSegment = segments[segments.length - 1];
          // Remove file extension
          return decodeURIComponent(lastSegment.replace(/\.[^/.]+$/, ''));
        }
      }
      
      // Fall back to hostname
      return urlObj.hostname;
    } catch {
      return 'Untitled';
    }
  }

  /**
   * Get the raw directory path
   */
  getRawDir(): string {
    return this.rawDir;
  }

  /**
   * Generate a unique filename for storing a source
   */
  generateStorageFilename(source: SourceDocument): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sanitizedTitle = source.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    const extension = source.type === 'markdown' ? '.md' : '.txt';

    return `${timestamp}-${sanitizedTitle}${extension}`;
  }
}
