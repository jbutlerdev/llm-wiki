/**
 * Source content summarization
 * @module @llm-wiki/core/source/summarizer
 */

import type { SourceDocument } from '../types/index.js';

export interface SourceSummary {
  title: string;
  summary: string;
  entities: ExtractedEntity[];
  keyPoints: string[];
  topics: string[];
  tags: string[];
}

export interface ExtractedEntity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'concept' | 'unknown';
}

export interface SummarizerOptions {
  /**
   * Custom LLM function for generating summaries
   * If provided, will be used instead of heuristic summarization
   */
  llmSummarize?: (content: string) => Promise<string>;
  
  /**
   * Custom LLM function for entity extraction
   */
  llmExtractEntities?: (content: string) => Promise<ExtractedEntity[]>;
  
  /**
   * Maximum summary length in characters
   */
  maxSummaryLength?: number;
  
  /**
   * Maximum number of tags to generate
   */
  maxTags?: number;
}

/**
 * Common words to exclude from entity extraction
 */
const COMMON_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
]);

/**
 * Known topic keywords for topic identification
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'machine-learning': ['machine learning', 'ml', 'neural network', 'deep learning', 'model training', 'prediction'],
  'programming': ['programming', 'code', 'developer', 'software', 'algorithm', 'function', 'class'],
  'science': ['science', 'research', 'experiment', 'hypothesis', 'theory', 'data'],
  'technology': ['technology', 'tech', 'computer', 'digital', 'system', 'platform'],
  'business': ['business', 'company', 'revenue', 'market', 'customer', 'product', 'strategy'],
  'health': ['health', 'medical', 'disease', 'treatment', 'patient', 'doctor', 'medicine'],
  'finance': ['finance', 'investment', 'stock', 'market', 'banking', 'money', 'economic'],
  'education': ['education', 'learning', 'teaching', 'student', 'school', 'university', 'course'],
};

/**
 * SourceSummarizer analyzes source documents and extracts:
 * - Summary text
 * - Named entities (people, organizations, etc.)
 * - Key points
 * - Topics and tags
 */
export class SourceSummarizer {
  private llmSummarize?: (content: string) => Promise<string>;
  private llmExtractEntities?: (content: string) => Promise<ExtractedEntity[]>;
  private maxSummaryLength: number;
  private maxTags: number;

  constructor(options: SummarizerOptions = {}) {
    this.llmSummarize = options.llmSummarize;
    this.llmExtractEntities = options.llmExtractEntities;
    this.maxSummaryLength = options.maxSummaryLength ?? 500;
    this.maxTags = options.maxTags ?? 10;
  }

  /**
   * Summarize a source document
   */
  async summarize(source: SourceDocument): Promise<SourceSummary> {
    const content = source.content;
    
    // Use LLM if available, otherwise heuristic
    const summary = this.llmSummarize
      ? await this.llmSummarize(content)
      : this.generateSummary(content);

    const entities = this.llmExtractEntities
      ? await this.llmExtractEntities(content)
      : this.extractEntities(content);

    const keyPoints = this.extractKeyPoints(content);
    const topics = this.identifyTopics(content);
    const tags = this.generateTags(topics);

    return {
      title: source.title,
      summary,
      entities,
      keyPoints,
      topics,
      tags,
    };
  }

  /**
   * Generate a heuristic summary from content
   */
  generateSummary(content: string): string {
    if (!content.trim()) {
      return '';
    }

    // Remove markdown headings for processing
    const cleanContent = content
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '');

    // Split into sentences
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim());

    if (sentences.length === 0) {
      return '';
    }

    // Take first significant sentence(s)
    let summary = sentences[0].trim();
    let charCount = summary.length;

    // Add more sentences up to max length
    for (let i = 1; i < sentences.length && charCount < this.maxSummaryLength - 50; i++) {
      const sentence = sentences[i].trim();
      if (sentence && sentence.length < 200) {
        summary += '. ' + sentence;
        charCount += sentence.length + 2;
      }
    }

    // Ensure we don't exceed max length
    if (summary.length > this.maxSummaryLength) {
      summary = summary.slice(0, this.maxSummaryLength - 3) + '...';
    }

    return summary;
  }

  /**
   * Extract potential named entities from content
   */
  extractEntities(content: string): ExtractedEntity[] {
    if (!content.trim()) {
      return [];
    }

    const entities: Map<string, ExtractedEntity> = new Map();

    // Pattern for capitalized phrases (simple entity extraction)
    // Matches: "John Smith", "Apple Inc", "San Francisco"
    const capitalizedPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
    let match;

    while ((match = capitalizedPattern.exec(content)) !== null) {
      const name = match[1];
      
      // Skip common words and short matches
      if (name.length < 3 || COMMON_WORDS.has(name.toLowerCase())) {
        continue;
      }

      // Classify entity type (simplified heuristic)
      const type = this.classifyEntity(name, content);
      
      // Only keep if not already found
      if (!entities.has(name)) {
        entities.set(name, { name, type });
      }
    }

    return Array.from(entities.values()).slice(0, 20); // Limit entities
  }

  /**
   * Classify an entity based on context and naming patterns
   */
  private classifyEntity(name: string, content: string): ExtractedEntity['type'] {
    const lowerContent = content.toLowerCase();
    const lowerName = name.toLowerCase();

    // Check for organization indicators
    if (
      lowerContent.includes(`${lowerName} inc`) ||
      lowerContent.includes(`${lowerName} corp`) ||
      lowerContent.includes(`${lowerName} llc`) ||
      lowerContent.includes(`${lowerName} ltd`) ||
      lowerName.endsWith(' inc') ||
      lowerName.endsWith(' corp')
    ) {
      return 'organization';
    }

    // Check for location indicators
    if (
      lowerContent.includes(`in ${lowerName}`) ||
      lowerContent.includes(`at ${lowerName}`) ||
      lowerContent.includes(`from ${lowerName}`) ||
      /city|town|country|state|river|mountain|ocean/i.test(name)
    ) {
      return 'location';
    }

    // Check for person indicators
    if (
      /^(mr|mrs|ms|dr|prof)\./i.test(content.slice(Math.max(0, content.indexOf(name) - 4), content.indexOf(name)))
    ) {
      return 'person';
    }

    // Default to unknown
    return 'unknown';
  }

  /**
   * Extract key points from content
   */
  extractKeyPoints(content: string): string[] {
    const keyPoints: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Extract numbered list items
      const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (numberedMatch) {
        keyPoints.push(numberedMatch[1]);
        continue;
      }

      // Extract bullet points
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        keyPoints.push(bulletMatch[1]);
        continue;
      }

      // Extract sentences starting with key indicators
      const keyIndicators = [
        'important', 'critical', 'key', 'main', 'essential',
        'primary', 'significant', 'notable', 'major', 'fundamental'
      ];
      const lowerLine = trimmed.toLowerCase();
      
      if (keyIndicators.some(word => lowerLine.startsWith(word)) && trimmed.length > 20) {
        keyPoints.push(trimmed);
      }
    }

    return [...new Set(keyPoints)].slice(0, 10); // Dedupe and limit
  }

  /**
   * Identify topics from content
   */
  identifyTopics(content: string): string[] {
    const topics: Set<string> = new Set();
    const lowerContent = content.toLowerCase();

    // Match content against topic keywords
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword)) {
          topics.add(topic);
          break;
        }
      }
    }

    // Extract noun phrases (simplified - just capitalized words not at start of sentences)
    const nounPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const matches = content.match(nounPattern) || [];
    
    for (const match of matches.slice(0, 5)) {
      if (!COMMON_WORDS.has(match.toLowerCase())) {
        topics.add(match.toLowerCase().replace(/\s+/g, '-'));
      }
    }

    return Array.from(topics).slice(0, 5);
  }

  /**
   * Generate tags from topics
   */
  generateTags(topics: string[]): string[] {
    const tags: string[] = [];

    for (const topic of topics) {
      // Convert topics to tags
      const tag = topic
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }

      if (tags.length >= this.maxTags) {
        break;
      }
    }

    return tags;
  }
}
