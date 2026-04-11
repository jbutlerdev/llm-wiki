import { Type } from '@sinclair/typebox';
import { ingest } from '@llm-wiki/core';
import type { WikiDirProvider } from '../session/agent-session.js';

/**
 * Wiki ingest tool parameters
 */
export const wikiIngestParams = Type.Object({
  source: Type.String({
    description: 'Source to ingest: file path, URL, or raw text (prefix with "text:" for raw text)',
  }),
  options: Type.Optional(Type.Object({
    title: Type.Optional(Type.String({
      description: 'Custom title for the source',
    })),
    tags: Type.Optional(Type.Array(Type.String(), {
      description: 'Tags to add to the source page',
    })),
  })),
});

export type WikiIngestParams = {
  source: string;
  options?: {
    title?: string;
    tags?: string[];
  };
};

/**
 * Execute wiki ingest
 */
export async function executeWikiIngest(
  wikiDirProvider: WikiDirProvider,
  params: WikiIngestParams
): Promise<{ content: { type: 'text'; text: string }[]; details: Record<string, unknown>; isError?: boolean }> {
  const { source, options = {} } = params;
  const wikiDir = wikiDirProvider.getWikiDir();

  try {
    const result = await ingest(source, { wikiDir, rawDir: wikiDir + '/raw' }, {
      title: options.title,
      tags: options.tags,
    });

    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `Ingest failed: ${result.error || 'Unknown error'}`,
        }],
        details: result as any,
        isError: true,
      };
    }

    // Build result message
    const parts: string[] = [];

    parts.push(`## Successfully ingested source`);
    
    if (result.source) {
      parts.push(`**Title:** ${result.source.title || 'Untitled'}`);
      parts.push(`**Type:** ${result.source.type}`);
    }

    // Entity information
    if (result.entityUpdate) {
      const { entitiesFound, suggestedEntities } = result.entityUpdate;
      
      parts.push(`\n### Entities`);
      parts.push(`- Entities found: ${entitiesFound}`);
      
      if (suggestedEntities && suggestedEntities.length > 0) {
        const names = suggestedEntities.slice(0, 5).map(e => e.name);
        parts.push(`  - ${names.join(', ')}${suggestedEntities.length > 5 ? '...' : ''}`);
        parts.push(`- Suggested new entity pages: ${suggestedEntities.length}`);
      }
    }

    // Summary information
    if (result.summaryUpdate) {
      const { keyThemes, contradictions } = result.summaryUpdate;
      
      if (keyThemes && keyThemes.length > 0) {
        parts.push(`\n### Key Themes`);
        parts.push(`- ${keyThemes.slice(0, 5).join('\n- ')}`);
      }
      
      if (contradictions && contradictions.length > 0) {
        parts.push(`\n⚠️ **Contradictions detected:** ${contradictions.length}`);
        contradictions.slice(0, 3).forEach((c) => {
          parts.push(`  - ${c.existingClaim} vs ${c.newClaim}`);
        });
      }
    }

    // Pages created/updated
    if (result.pagesCreated && result.pagesCreated.length > 0) {
      parts.push(`\n### Pages Created`);
      result.pagesCreated.forEach(page => {
        parts.push(`- \`${page}\``);
      });
    }

    if (result.pagesUpdated && result.pagesUpdated.length > 0) {
      parts.push(`\n### Pages Updated`);
      result.pagesUpdated.forEach(page => {
        parts.push(`- \`${page}\``);
      });
    }

    return {
      content: [{
        type: 'text',
        text: parts.join('\n'),
      }],
      details: result as any,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Ingest error: ${errorMessage}`,
      }],
      details: { error: errorMessage },
      isError: true,
    };
  }
}
