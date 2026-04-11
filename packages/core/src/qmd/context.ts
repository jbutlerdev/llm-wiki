import type { QMDStoreWrapper } from './store.js';

/**
 * Context entry from QMD
 */
export interface ContextEntry {
  /** Collection name */
  collection: string;
  /** Virtual path within collection */
  path: string;
  /** Context description */
  context: string;
}

/**
 * Context manager for wiki collections
 */
export interface ContextManager {
  /** List all contexts */
  listContexts(): Promise<ContextEntry[]>;
  /** Add context for a path within a collection */
  addContext(path: string, context: string, collection?: string): Promise<void>;
  /** Remove context from a path */
  removeContext(path: string, collection?: string): Promise<void>;
  /** Set global context for all collections */
  setGlobalContext(context: string | undefined): Promise<void>;
  /** Initialize default contexts for wiki */
  initializeDefaults(): Promise<void>;
}

/**
 * Default contexts for wiki collections
 */
const DEFAULT_CONTEXTS: Array<{
  path: string;
  context: string;
  collection?: string;
}> = [
  {
    path: '/entity',
    context: 'Individual entities including people, organizations, concepts, and topics. These pages provide detailed information about specific subjects mentioned across sources.',
  },
  {
    path: '/entity/people',
    context: 'People and individuals referenced in sources.',
  },
  {
    path: '/entity/concepts',
    context: 'Concepts, theories, and ideas from sources.',
  },
  {
    path: '/source',
    context: 'Processed source documents including papers, articles, and references. Each page summarizes a single source with key takeaways.',
  },
  {
    path: '/summary',
    context: 'Overview pages synthesizing information from multiple sources. These provide high-level summaries of topics covered in the wiki.',
  },
  {
    path: '/comparison',
    context: 'Side-by-side comparisons of entities, approaches, or perspectives from different sources.',
  },
  {
    path: '/synthesis',
    context: 'Deep-dive analysis on specific themes, combining insights from multiple sources into comprehensive explorations.',
  },
];

/**
 * Default global context for wiki
 */
const DEFAULT_GLOBAL_CONTEXT = 'Personal knowledge base compiled from various sources. The wiki contains summaries, entity pages, source references, and synthesized analyses.';

/**
 * Create a context manager for wiki collections
 */
export function createContextManager(wrapper: QMDStoreWrapper): ContextManager {
  const { getStore, getWikiCollection, getRawCollection } = wrapper;

  return {
    /**
     * List all contexts in the store
     */
    async listContexts(): Promise<ContextEntry[]> {
      const store = getStore();
      return store.listContexts() as Promise<ContextEntry[]>;
    },

    /**
     * Add context for a path within a collection
     */
    async addContext(
      path: string,
      context: string,
      collection?: string
    ): Promise<void> {
      const store = getStore();
      const collectionName = collection ?? getWikiCollection();
      await store.addContext(collectionName, path, context);
    },

    /**
     * Remove context from a path
     */
    async removeContext(path: string, collection?: string): Promise<void> {
      const store = getStore();
      const collectionName = collection ?? getWikiCollection();
      await store.removeContext(collectionName, path);
    },

    /**
     * Set global context for all collections
     */
    async setGlobalContext(context: string | undefined): Promise<void> {
      const store = getStore();
      await store.setGlobalContext(context);
    },

    /**
     * Initialize default contexts for wiki
     */
    async initializeDefaults(): Promise<void> {
      const store = getStore();

      // Set global context
      await store.setGlobalContext(DEFAULT_GLOBAL_CONTEXT);

      // Add context for each default path
      for (const { path, context, collection } of DEFAULT_CONTEXTS) {
        const collectionName = collection ?? getWikiCollection();
        await store.addContext(collectionName, path, context);
      }
    },
  };
}

/**
 * Predefined context templates for common wiki setups
 */
export const CONTEXT_TEMPLATES = {
  /** Minimal context for basic wikis */
  minimal: [
    { path: '/entity', context: 'Individual entities and topics.' },
    { path: '/source', context: 'Source documents and references.' },
  ],

  /** Research-focused context */
  research: [
    { path: '/entity/authors', context: 'Authors and researchers.' },
    { path: '/entity/papers', context: 'Research papers and publications.' },
    { path: '/entity/concepts', context: 'Theoretical concepts and frameworks.' },
    { path: '/entity/methods', context: 'Research methods and approaches.' },
    { path: '/source', context: 'Source documents and citations.' },
    { path: '/summary', context: 'Overview summaries of research topics.' },
    { path: '/comparison', context: 'Comparative analyses of approaches.' },
  ],

  /** Project documentation context */
  project: [
    { path: '/entity/features', context: 'Product features and capabilities.' },
    { path: '/entity/components', context: 'System components and modules.' },
    { path: '/entity/people', context: 'Team members and stakeholders.' },
    { path: '/source/meetings', context: 'Meeting notes and decisions.' },
    { path: '/source/docs', context: 'Reference documentation.' },
    { path: '/synthesis/adr', context: 'Architecture Decision Records.' },
  ],

  /** Personal knowledge context */
  personal: [
    { path: '/entity/people', context: 'People you know.' },
    { path: '/entity/places', context: 'Places you have been or want to visit.' },
    { path: '/entity/interests', context: 'Topics and interests.' },
    { path: '/source/notes', context: 'Personal notes and thoughts.' },
    { path: '/source/links', context: 'Saved links and references.' },
  ],
};
