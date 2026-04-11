import { Type } from '@sinclair/typebox';
import { loadPage } from '@llm-wiki/core';
import type { WikiDirProvider } from '../session/agent-session.js';

/**
 * Wiki get tool parameters
 */
export const wikiGetParams = Type.Object({
  id: Type.String({
    description: 'Page ID or path (e.g., "entity/my-page" or "my-page")',
  }),
  raw: Type.Optional(Type.Boolean({
    description: 'Return raw markdown without formatting',
    default: false,
  })),
});

export type WikiGetParams = {
  id: string;
  raw?: boolean;
};

/**
 * Execute wiki get
 */
export async function executeWikiGet(
  wikiDirProvider: WikiDirProvider,
  params: WikiGetParams
): Promise<{ content: { type: 'text'; text: string }[]; details: Record<string, unknown>; isError?: boolean }> {
  const { id, raw = false } = params;
  const wikiDir = wikiDirProvider.getWikiDir();

  try {
    const page = await loadPage(wikiDir, id);

    if (!page) {
      return {
        content: [{
          type: 'text',
          text: `Page not found: "${id}"`,
        }],
        details: { id, found: false },
        isError: true,
      };
    }

    if (raw) {
      return {
        content: [{
          type: 'text',
          text: page.content,
        }],
        details: {
          slug: page.slug,
          title: page.title,
          type: page.type,
          frontmatter: page.frontmatter,
          raw: true,
        },
      };
    }

    // Format with metadata
    const parts: string[] = [];

    parts.push(`# ${page.title}`);
    parts.push('');
    parts.push(`**Type:** ${page.type}`);
    parts.push(`**Slug:** \`${page.slug}\``);

    if (page.frontmatter?.tags?.length > 0) {
      parts.push(`**Tags:** ${page.frontmatter.tags.join(', ')}`);
    }

    if (page.frontmatter?.sources?.length > 0) {
      parts.push(`**Sources:** ${page.frontmatter.sources.length}`);
    }

    if (page.frontmatter?.relatedPages?.length > 0) {
      parts.push(`**Related Pages:** ${page.frontmatter.relatedPages.join(', ')}`);
    }

    parts.push('');
    parts.push(`*Last modified: ${page.lastModified?.toISOString() || 'Unknown'}*`);
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(page.content);

    return {
      content: [{
        type: 'text',
        text: parts.join('\n'),
      }],
      details: {
        slug: page.slug,
        title: page.title,
        type: page.type,
        frontmatter: page.frontmatter,
        raw: false,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
      return {
        content: [{
          type: 'text',
          text: `Page not found: "${id}"`,
        }],
        details: { id, found: false },
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Error loading page: ${errorMessage}`,
      }],
      details: { error: errorMessage },
      isError: true,
    };
  }
}
