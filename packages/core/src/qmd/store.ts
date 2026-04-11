import { createStore, type QMDStore } from '@tobilu/qmd';
import fs from 'fs/promises';
import path from 'path';

/**
 * QMD store wrapper options
 */
export interface QMDStoreOptions {
  /** Wiki directory path */
  wikiDir: string;
  /** QMD database and config directory */
  qmdDir: string;
  /** Enable auto-indexing on wiki changes */
  autoIndex?: boolean;
  /** Wiki collection name */
  wikiCollectionName?: string;
  /** Raw sources collection name */
  rawCollectionName?: string;
}

/**
 * QMD store wrapper for wiki operations
 */
export interface QMDStoreWrapper {
  /** Get the underlying QMD store */
  getStore(): QMDStore;
  /** Close the store and dispose resources */
  close(): Promise<void>;
  /** Get store status */
  getStatus(): Promise<QMDStoreStatus>;
  /** Get the wiki directory */
  wikiDir: string;
  /** Get the QMD directory */
  qmdDir: string;
  /** Get the wiki collection name */
  getWikiCollection(): string;
  /** Get the raw sources collection name */
  getRawCollection(): string;
  /** Get all collection names */
  getAllCollections(): string[];
  /** Convert absolute path to relative path for collection */
  toRelativePath(absolutePath: string): string | null;
}

/**
 * QMD store status information
 */
export interface QMDStoreStatus {
  /** QMD directory path */
  qmdDir: string;
  /** Whether the store is ready */
  isReady: boolean;
  /** Total documents across all collections */
  totalDocuments: number;
  /** Indexed documents with embeddings */
  indexedDocuments: number;
  /** Whether any documents need embedding */
  needsEmbedding: boolean;
  /** Collection statistics */
  collections: CollectionStats[];
}

/**
 * Statistics for a single collection
 */
export interface CollectionStats {
  name: string;
  documentCount: number;
  indexedCount: number;
}

/**
 * Create a QMD store wrapper for wiki operations
 */
export async function createQMDStore(options: QMDStoreOptions): Promise<QMDStoreWrapper> {
  const {
    wikiDir,
    qmdDir,
    wikiCollectionName = 'wiki',
    rawCollectionName = 'raw',
  } = options;

  // Ensure QMD directory exists
  await fs.mkdir(qmdDir, { recursive: true });

  // Calculate relative paths for collections
  const wikiRelativePath = wikiDir;
  const rawRelativePath = path.join(wikiDir, 'raw');

  // Create the QMD store with wiki collections
  const store = await createStore({
    dbPath: path.join(qmdDir, 'qmd.sqlite'),
    config: {
      collections: {
        [wikiCollectionName]: {
          path: wikiRelativePath,
          pattern: '**/*.md',
          ignore: ['**/node_modules/**'],
        },
        [rawCollectionName]: {
          path: rawRelativePath,
          pattern: '**/*',
          ignore: ['**/node_modules/**'],
        },
      },
    },
  });

  // Wrapper instance
  const wrapper: QMDStoreWrapper = {
    getStore: () => store,
    
    close: async () => {
      await store.close();
    },
    
    getStatus: async () => {
      const status = await store.getStatus();
      const collections = await store.listCollections();
      
      const collectionStats: CollectionStats[] = collections.map((c: any) => ({
        name: c.name,
        documentCount: c.doc_count ?? 0,
        indexedCount: c.active_count ?? 0,
      }));
      
      // Extract values from QMD status, with defaults
      const totalDocs = (status as any).totalDocuments ?? 0;
      const indexedDocs = (status as any).indexedDocuments ?? 0;
      const needsEmbed = (status as any).needsEmbedding ?? false;
      
      return {
        qmdDir,
        isReady: true,
        totalDocuments: typeof totalDocs === 'number' ? totalDocs : 0,
        indexedDocuments: typeof indexedDocs === 'number' ? indexedDocs : 0,
        needsEmbedding: typeof needsEmbed === 'boolean' ? needsEmbed : Boolean(needsEmbed),
        collections: collectionStats,
      };
    },
    
    wikiDir,
    qmdDir,
    
    getWikiCollection: () => wikiCollectionName,
    
    getRawCollection: () => rawCollectionName,
    
    getAllCollections: () => [wikiCollectionName, rawCollectionName],
    
    toRelativePath: (absolutePath: string): string | null => {
      const normalizedPath = path.normalize(absolutePath);
      const normalizedWikiDir = path.normalize(wikiDir);
      
      // Check if path is within wiki directory
      if (normalizedPath.startsWith(normalizedWikiDir + path.sep)) {
        return path.relative(normalizedWikiDir, normalizedPath);
      }
      
      return null;
    },
  };

  return wrapper;
}
