/**
 * Schema template generation
 * @module @llm-wiki/core/schema/template
 */

/**
 * Options for generating schema templates
 */
export interface SchemaTemplateOptions {
  wikiName?: string;
  wikiDescription?: string;
}

/**
 * Generate CLAUDE.md schema template for external Claude Code usage
 */
export function generateSchemaTemplate(options: SchemaTemplateOptions = {}): string {
  const { wikiName = 'LLM Wiki', wikiDescription = 'Your personal knowledge base' } = options;

  return `# ${wikiName}

${wikiDescription}. Follow the conventions below to maintain consistency.

## Wiki Structure

- \`wiki/\` - All wiki content
- \`wiki/raw/\` - Immutable source documents (never modify)
- \`wiki/entity/\` - Individual entities (people, concepts, topics)
- \`wiki/source/\` - Processed source summaries
- \`wiki/comparison/\` - Side-by-side comparisons
- \`wiki/synthesis/\` - Deep dives on specific themes
- \`wiki/index.md\` - Content catalog
- \`wiki/log.md\` - Chronological operation log

## Conventions

### Naming
- Use lowercase-kebab-case (e.g., \`artificial-intelligence.md\`)
- Include type prefix for disambiguation if needed

### Frontmatter
Every page must have YAML frontmatter:
\`\`\`yaml
---
title: Page Title
tags: [tag1, tag2]
sources: [source-file.md]
relatedPages: [other-page, another-page]
summary: One-line summary for index
---
\`\`\`

### Links
Use wiki-links: \`[[page-slug]]\` or \`[[page-slug|Display Text]]\`

## Workflows

### Ingest
1. Read the source document from \`raw/\`
2. Extract key entities and concepts
3. Create/update entity pages in \`wiki/entity/\`
4. Create source page in \`wiki/source/\`
5. Update \`wiki/index.md\` with new pages
6. Add entry to \`wiki/log.md\`

### Query
1. Search relevant pages using [[wiki-links]]
2. Synthesize answer with citations to relevant pages
3. If answer is worth preserving, create a synthesis page in \`wiki/synthesis/\`

### Lint
1. Check for contradictions between pages
2. Check for orphan pages (no inbound links)
3. Check for stale content (superseded by newer sources)
4. Report issues but don't auto-fix without approval

## Error Handling

- If unsure about a page update, create a new page instead of modifying
- Always maintain source attribution
- Log all operations in \`wiki/log.md\`
`;
}

/**
 * Generate AGENTS.md template for embedded agent usage
 */
export function generateAgentsTemplate(options: SchemaTemplateOptions = {}): string {
  const { wikiName = 'LLM Wiki' } = options;

  return `# ${wikiName} Agent Instructions

You are the maintainer of this wiki. Your job is to:

## On Source Ingestion
1. Read the source document from \`raw/\`
2. Extract key entities and concepts
3. Create/update entity pages in \`wiki/entity/\`
4. Update the main summary if applicable
5. Update cross-references
6. Update index.md and log.md

## On Questions
1. Search relevant pages
2. Synthesize an answer with citations
3. File good answers back to the wiki if requested

## On Lint
1. Check for contradictions
2. Check for orphan pages
3. Check for stale content
4. Fix minor issues automatically
5. Flag major issues for review

## Conventions
- Page slugs: lowercase-kebab-case
- Tags: lowercase, hyphen-separated
- Links: \`[[page-slug]]\` or \`[[page-slug|Display Text]]\`
- Frontmatter: always include tags, sources, relatedPages
`;
}
