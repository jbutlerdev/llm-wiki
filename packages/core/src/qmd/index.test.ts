import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { QMDStoreWrapper } from './store.js';
import { createIndexer, type Indexer } from './indexer.js';

// Mock QMD store wrapper
const createMockWrapper = (): QMDStoreWrapper => {
  const mockStore = {
    update: vi.fn().mockResolvedValue({
      collections: ['wiki'],
      indexed: 5,
      updated: 3,
      unchanged: 2,
      removed: 0,
      needsEmbedding: true,
    }),
    embed: vi.fn().mockResolvedValue({
      embedded: 5,
      failed: 0,
    }),
    getStatus: vi.fn().mockResolvedValue({
      collections: [],
      totalDocuments: 10,
      indexedDocuments: 5,
      needsEmbedding: true,
    }),
  };

  return {
    getStore: () => mockStore as any,
    close: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      qmdDir: '/tmp/wiki/.llm-wiki',
      isReady: true,
      totalDocuments: 10,
      indexedDocuments: 5,
      needsEmbedding: true,
      collections: [],
    }),
    wikiDir: '/tmp/wiki',
    qmdDir: '/tmp/wiki/.llm-wiki',
    getWikiCollection: () => 'wiki',
    getRawCollection: () => 'raw',
    getAllCollections: () => ['wiki', 'raw'],
    toRelativePath: (p: string) => p.replace('/tmp/wiki/', ''),
  };
};

describe('createIndexer', () => {
  let wrapper: QMDStoreWrapper;

  beforeEach(() => {
    wrapper = createMockWrapper();
  });

  it('should create an indexer', () => {
    const indexer = createIndexer(wrapper);
    expect(indexer).toBeDefined();
    expect(typeof indexer.index).toBe('function');
    expect(typeof indexer.embed).toBe('function');
    expect(typeof indexer.reindexAll).toBe('function');
  });

  describe('index', () => {
    it('should index wiki collection by default', async () => {
      const mockStore = wrapper.getStore() as any;
      const indexer = createIndexer(wrapper);
      
      await indexer.index();
      
      expect(mockStore.update).toHaveBeenCalledWith({
        collections: ['wiki'],
      });
    });

    it('should index specific collections when specified', async () => {
      const mockStore = wrapper.getStore() as any;
      const indexer = createIndexer(wrapper);
      
      await indexer.index(['wiki']);
      
      expect(mockStore.update).toHaveBeenCalledWith({
        collections: ['wiki'],
      });
    });

    it('should return index result', async () => {
      const indexer = createIndexer(wrapper);
      const result = await indexer.index();
      
      expect(result).toMatchObject({
        collections: ['wiki'],
        indexed: 5,
        updated: 3,
        unchanged: 2,
        removed: 0,
        needsEmbedding: true,
      });
    });

    it('should call onProgress callback', async () => {
      const onProgress = vi.fn();
      const mockStore = wrapper.getStore() as any;
      
      // Configure mock to call progress callback
      mockStore.update.mockImplementation(async ({ onProgress: callback }: any) => {
        if (callback) {
          callback({ collection: 'wiki', file: 'test.md', current: 1, total: 5 });
        }
        return { indexed: 5, updated: 3, unchanged: 2, removed: 0, needsEmbedding: false };
      });
      
      const indexer = createIndexer(wrapper);
      await indexer.index([], { onProgress });
      
      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('embed', () => {
    it('should generate embeddings for indexed documents', async () => {
      const mockStore = wrapper.getStore() as any;
      const indexer = createIndexer(wrapper);
      
      await indexer.embed();
      
      expect(mockStore.embed).toHaveBeenCalled();
    });

    it('should respect force option', async () => {
      const mockStore = wrapper.getStore() as any;
      const indexer = createIndexer(wrapper);
      
      await indexer.embed({ force: true });
      
      expect(mockStore.embed).toHaveBeenCalledWith(
        expect.objectContaining({ force: true })
      );
    });

    it('should return embed result', async () => {
      const indexer = createIndexer(wrapper);
      const result = await indexer.embed();
      
      expect(result).toMatchObject({
        embedded: 5,
        failed: 0,
      });
    });
  });

  describe('reindexAll', () => {
    it('should index and embed all collections', async () => {
      const mockStore = wrapper.getStore() as any;
      const indexer = createIndexer(wrapper);
      
      await indexer.reindexAll();
      
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockStore.embed).toHaveBeenCalled();
    });

    it('should return combined results', async () => {
      const indexer = createIndexer(wrapper);
      const result = await indexer.reindexAll();
      
      expect(result).toHaveProperty('indexResult');
      expect(result).toHaveProperty('embedResult');
    });
  });

  describe('getIndexStatus', () => {
    it('should return index status', async () => {
      const indexer = createIndexer(wrapper);
      const status = await indexer.getIndexStatus();
      
      expect(status).toMatchObject({
        qmdDir: '/tmp/wiki/.llm-wiki',
        isReady: true,
        totalDocuments: 10,
        indexedDocuments: 5,
        needsEmbedding: true,
      });
    });
  });

  describe('needsEmbedding', () => {
    it('should return true when documents need embedding', async () => {
      const indexer = createIndexer(wrapper);
      const needs = await indexer.needsEmbedding();
      
      expect(needs).toBe(true);
    });
  });
});
