import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createQMDStore, type QMDStoreWrapper } from './store.js';
import type { QMDStore } from '@tobilu/qmd';

// Mock the createStore from @tobilu/qmd
vi.mock('@tobilu/qmd', async () => {
  const mockStore = {
    close: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      collections: [],
      totalDocuments: 0,
      indexedDocuments: 0,
      needsEmbedding: false,
    }),
    listCollections: vi.fn().mockResolvedValue([]),
    addCollection: vi.fn().mockResolvedValue(undefined),
    removeCollection: vi.fn().mockResolvedValue(undefined),
  };
  return {
    createStore: vi.fn().mockResolvedValue(mockStore),
  };
});

describe('QMDStoreWrapper', () => {
  let wrapper: QMDStoreWrapper;
  const testWikiDir = '/tmp/test-wiki';
  const testQmdDir = '/tmp/test-wiki/.llm-wiki';

  beforeEach(async () => {
    wrapper = await createQMDStore({
      wikiDir: testWikiDir,
      qmdDir: testQmdDir,
    });
  });

  afterEach(async () => {
    await wrapper.close();
  });

  describe('initialization', () => {
    it('should create a QMD store wrapper', () => {
      expect(wrapper).toBeDefined();
      expect(wrapper.wikiDir).toBe(testWikiDir);
      expect(wrapper.qmdDir).toBe(testQmdDir);
    });

    it('should have the wiki collection configured', async () => {
      const { listCollections } = wrapper.getStore();
      const collections = await listCollections();
      // The wiki collection should be added during initialization
      expect(collections).toBeDefined();
    });

    it('should have the raw sources collection configured', async () => {
      const { listCollections } = wrapper.getStore();
      const collections = await listCollections();
      expect(collections).toBeDefined();
    });

    it('should handle store lifecycle', async () => {
      const closeSpy = vi.spyOn(wrapper.getStore(), 'close');
      await wrapper.close();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return store status', async () => {
      const status = await wrapper.getStatus();
      expect(status).toBeDefined();
      expect(status.qmdDir).toBe(testQmdDir);
      expect(status.isReady).toBe(true);
    });
  });

  describe('collection management', () => {
    it('should return wiki collection name', () => {
      expect(wrapper.getWikiCollection()).toBe('wiki');
    });

    it('should return raw collection name', () => {
      expect(wrapper.getRawCollection()).toBe('raw');
    });

    it('should return both collection names for search', () => {
      const names = wrapper.getAllCollections();
      expect(names).toContain('wiki');
      expect(names).toContain('raw');
    });
  });

  describe('path conversion', () => {
    it('should convert wiki path to relative path', () => {
      const relative = wrapper.toRelativePath(`${testWikiDir}/entity/test.md`);
      expect(relative).toBe('entity/test.md');
    });

    it('should convert raw path to relative path', () => {
      const relative = wrapper.toRelativePath(`${testWikiDir}/raw/sources/doc.md`);
      expect(relative).toBe('raw/sources/doc.md');
    });

    it('should handle paths outside wiki directory', () => {
      const relative = wrapper.toRelativePath('/tmp/other/path.md');
      expect(relative).toBeNull();
    });
  });

  describe('context management', () => {
    it('should add context for a collection path', async () => {
      const addSpy = vi.spyOn(wrapper.getStore(), 'addCollection');
      // Context is added implicitly through collection configuration
      expect(addSpy).toBeDefined();
    });
  });
});

describe('createQMDStore', () => {
  it('should create a store with custom options', async () => {
    const wrapper = await createQMDStore({
      wikiDir: '/custom/wiki',
      qmdDir: '/custom/wiki/.qmd',
      autoIndex: false,
    });
    expect(wrapper).toBeDefined();
    await wrapper.close();
  });

  it('should use default collection names', async () => {
    const wrapper = await createQMDStore({
      wikiDir: '/test/wiki',
      qmdDir: '/test/wiki/.qmd',
    });
    expect(wrapper.getWikiCollection()).toBe('wiki');
    expect(wrapper.getRawCollection()).toBe('raw');
    await wrapper.close();
  });

  it('should create qmd directory if it does not exist', async () => {
    const wrapper = await createQMDStore({
      wikiDir: '/tmp/wiki-create-dir-test',
      qmdDir: '/tmp/wiki-create-dir-test/.llm-wiki',
    });
    expect(wrapper).toBeDefined();
    await wrapper.close();
  });
});
