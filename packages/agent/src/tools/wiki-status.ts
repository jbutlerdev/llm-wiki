import { Type } from '@sinclair/typebox';
import { isWikiInitialized, getPageStats, listPages } from '@llm-wiki/core';
import type { WikiDirProvider } from '../session/agent-session.js';

/**
 * Wiki status tool parameters (no parameters)
 */
export const wikiStatusParams = Type.Object({});

export type WikiStatusParams = {};

/**
 * Execute wiki status
 */
export async function executeWikiStatus(
  wikiDirProvider: WikiDirProvider
): Promise<{ content: { type: 'text'; text: string }[]; details: Record<string, unknown>; isError?: boolean }> {
  const wikiDir = wikiDirProvider.getWikiDir();

  try {
    // Check if wiki is initialized
    const initialized = isWikiInitialized(wikiDir);

    if (!initialized) {
      return {
        content: [{
          type: 'text',
          text: `Wiki not initialized at: ${wikiDir}\n\nRun 'llm-wiki init' to create a new wiki.`,
        }],
        details: {
          wikiDir,
          initialized: false,
        },
        isError: true,
      };
    }

    // Get page stats
    const stats = await getPageStats(wikiDir);
    
    // Get orphan count
    const pages = await listPages(wikiDir);
    const orphanCount = pages.filter(p => 
      !p.frontmatter?.relatedPages || p.frontmatter.relatedPages.length === 0
    ).length;

    // Format the output
    const parts: string[] = [];

    parts.push('## Wiki Status');
    parts.push(`**Wiki Directory:** \`${wikiDir}\``);
    parts.push('');
    parts.push('### Page Statistics');
    parts.push(`- **Total Pages:** ${stats.total}`);
    parts.push(`- **By Type:**`);

    // Page counts by type
    const typeOrder = ['summary', 'entity', 'source', 'comparison', 'synthesis'] as const;
    for (const type of typeOrder) {
      const count = stats.byType?.[type] || 0;
      parts.push(`  - ${type}: ${count}`);
    }

    // Health warnings
    if (orphanCount > 0) {
      parts.push('');
      parts.push('⚠️ **Health Warning:**');
      parts.push(`- ${orphanCount} orphan page(s) detected. Consider adding cross-references.`);
    }

    return {
      content: [{
        type: 'text',
        text: parts.join('\n'),
      }],
      details: {
        wikiDir,
        initialized: true,
        stats,
        orphanCount,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Status error: ${errorMessage}`,
      }],
      details: { error: errorMessage },
      isError: true,
    };
  }
}
