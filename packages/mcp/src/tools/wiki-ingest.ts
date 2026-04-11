/**
 * Wiki Ingest Tool for MCP
 * 
 * Ingests source documents into the wiki.
 */

import { ingest } from '@llm-wiki/core';
import type { WikiDirProvider } from '../types/index.js';

/**
 * Execute wiki ingest tool
 */
export async function executeWikiIngestTool(
  wikiDirProvider: WikiDirProvider,
  args: {
    source: string;
    sourceType?: 'file' | 'url' | 'text';
    title?: string;
  }
): Promise<{ content: Array<{ type: 'text'; text: string }>; details?: Record<string, unknown>; isError?: boolean }> {
  const { source, title } = args;
  const wikiDir = wikiDirProvider.getWikiDir();

  try {
    // Call the core ingest function with proper context
    const result = await ingest(source, {
      wikiDir,
      rawDir: `${wikiDir}/raw`,
    }, {
      title,
    });

    const parts: string[] = [];

    parts.push(`## Ingest Result`);
    parts.push('');
    parts.push(`**Status:** ${result.success ? 'Success' : 'Failed'}`);
    parts.push(`**Pages created:** ${result.pagesCreated.length}`);
    parts.push(`**Pages updated:** ${result.pagesUpdated.length}`);

    if (result.pagesCreated.length > 0) {
      parts.push('');
      parts.push('**Created pages:**');
      for (const page of result.pagesCreated) {
        parts.push(`  - [[${page}]]`);
      }
    }

    if (result.pagesUpdated.length > 0) {
      parts.push('');
      parts.push('**Updated pages:**');
      for (const page of result.pagesUpdated) {
        parts.push(`  - [[${page}]]`);
      }
    }

    if (result.source) {
      parts.push('');
      parts.push(`**Source stored:** ${result.source.path}`);
    }

    // Include entity and summary updates if available
    if (result.entityUpdate) {
      if (result.entityUpdate.entitiesFound > 0) {
        parts.push('');
        parts.push(`**Entities found:** ${result.entityUpdate.entitiesFound}`);
        parts.push(`**Entities updated:** ${result.entityUpdate.updatedPages.length}`);
      }
      if (result.entityUpdate.suggestedEntities.length > 0) {
        parts.push('');
        parts.push('**Suggested new entities:**');
        for (const entity of result.entityUpdate.suggestedEntities.slice(0, 5)) {
          parts.push(`  - ${entity.name} (${entity.type})`);
        }
        if (result.entityUpdate.suggestedEntities.length > 5) {
          parts.push(`  - ... and ${result.entityUpdate.suggestedEntities.length - 5} more`);
        }
      }
    }

    if (result.summaryUpdate) {
      if (result.summaryUpdate.contradictions.length > 0) {
        parts.push('');
        parts.push(`**⚠️ Contradictions detected:** ${result.summaryUpdate.contradictions.length}`);
        for (const contradiction of result.summaryUpdate.contradictions.slice(0, 3)) {
          parts.push(`  - ${contradiction.type}: ${contradiction.existingClaim} vs ${contradiction.newClaim}`);
        }
      }
      if (result.summaryUpdate.keyThemes.length > 0) {
        parts.push('');
        parts.push(`**Key themes:** ${result.summaryUpdate.keyThemes.join(', ')}`);
      }
    }

    if (!result.success && result.error) {
      parts.push('');
      parts.push('**Error:**');
      parts.push(`  - ${result.error}`);
    }

    return {
      content: [{
        type: 'text',
        text: parts.join('\n'),
      }],
      details: {
        success: result.success,
        pagesCreated: result.pagesCreated,
        pagesUpdated: result.pagesUpdated,
        source: result.source?.path,
        error: result.error,
      },
      isError: !result.success,
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
