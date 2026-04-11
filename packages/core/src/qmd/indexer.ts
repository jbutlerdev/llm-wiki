import type { QMDStoreWrapper, QMDStoreStatus } from './store.js';

/**
 * Progress callback for indexing operations
 */
export interface IndexProgress {
  /** Current collection being processed */
  collection: string;
  /** Current file being processed */
  file: string;
  /** Current progress count */
  current: number;
  /** Total count */
  total: number;
}

/**
 * Index result from QMD update
 */
export interface IndexResult {
  /** Collections that were indexed */
  collections: string[];
  /** Number of newly indexed documents */
  indexed: number;
  /** Number of updated documents */
  updated: number;
  /** Number of unchanged documents */
  unchanged: number;
  /** Number of removed documents */
  removed: number;
  /** Whether any documents need embedding */
  needsEmbedding: boolean;
}

/**
 * Embed result from QMD embed
 */
export interface EmbedResult {
  /** Number of documents successfully embedded */
  embedded: number;
  /** Number of documents that failed */
  failed: number;
}

/**
 * Full reindex result
 */
export interface ReindexResult {
  /** Index operation result */
  indexResult: IndexResult;
  /** Embed operation result */
  embedResult: EmbedResult;
}

/**
 * Indexer for wiki content
 */
export interface Indexer {
  /** Index wiki content to QMD */
  index(
    collections?: string[],
    options?: { onProgress?: (progress: IndexProgress) => void }
  ): Promise<IndexResult>;
  /** Generate embeddings for indexed content */
  embed(options?: { force?: boolean; onProgress?: (progress: any) => void }): Promise<EmbedResult>;
  /** Perform full reindex (index + embed) */
  reindexAll(options?: { force?: boolean }): Promise<ReindexResult>;
  /** Get index status */
  getIndexStatus(): Promise<QMDStoreStatus>;
  /** Check if any documents need embedding */
  needsEmbedding(): Promise<boolean>;
}

/**
 * Create an indexer for wiki content
 */
export function createIndexer(wrapper: QMDStoreWrapper): Indexer {
  const { getStore, getWikiCollection } = wrapper;

  return {
    /**
     * Index wiki content to QMD
     */
    async index(
      _collections?: string[],
      options?: { onProgress?: (progress: IndexProgress) => void }
    ): Promise<IndexResult> {
      const store = getStore();
      
      const result = await store.update({
        collections: [getWikiCollection()],
        onProgress: options?.onProgress as any,
      }) as any;

      return {
        collections: result.collections ?? [getWikiCollection()],
        indexed: typeof result.indexed === 'number' ? result.indexed : 0,
        updated: typeof result.updated === 'number' ? result.updated : 0,
        unchanged: typeof result.unchanged === 'number' ? result.unchanged : 0,
        removed: typeof result.removed === 'number' ? result.removed : 0,
        needsEmbedding: Boolean(result.needsEmbedding),
      };
    },

    /**
     * Generate embeddings for indexed content
     */
    async embed(options?: { force?: boolean; onProgress?: (progress: any) => void }): Promise<EmbedResult> {
      const store = getStore();
      
      const result = await store.embed({
        force: options?.force ?? false,
        onProgress: options?.onProgress,
      }) as any;

      return {
        embedded: typeof result.embedded === 'number' ? result.embedded : 0,
        failed: typeof result.failed === 'number' ? result.failed : 0,
      };
    },

    /**
     * Perform full reindex (index + embed)
     */
    async reindexAll(options?: { force?: boolean }): Promise<ReindexResult> {
      const indexResult = await this.index();
      const embedResult = await this.embed({ force: options?.force });

      return {
        indexResult,
        embedResult,
      };
    },

    /**
     * Get index status
     */
    async getIndexStatus(): Promise<QMDStoreStatus> {
      return wrapper.getStatus();
    },

    /**
     * Check if any documents need embedding
     */
    async needsEmbedding(): Promise<boolean> {
      const status = await wrapper.getStatus();
      return status.needsEmbedding;
    },
  };
}
