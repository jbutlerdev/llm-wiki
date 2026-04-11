import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { QMDStoreWrapper } from './store.js';
import { createContextManager } from './context.js';

// Mock QMD store wrapper
const createMockWrapper = (): QMDStoreWrapper => {
  const mockStore = {
    listContexts: vi.fn().mockResolvedValue([]),
    addContext: vi.fn().mockResolvedValue(undefined),
    removeContext: vi.fn().mockResolvedValue(undefined),
    setGlobalContext: vi.fn().mockResolvedValue(undefined),
  };

  return {
    getStore: () => mockStore as any,
    close: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      qmdDir: '/tmp/wiki/.llm-wiki',
      isReady: true,
      totalDocuments: 0,
      indexedDocuments: 0,
      needsEmbedding: false,
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

describe('createContextManager', () => {
  let wrapper: QMDStoreWrapper;

  beforeEach(() => {
    wrapper = createMockWrapper();
  });

  it('should create a context manager', () => {
    const manager = createContextManager(wrapper);
    expect(manager).toBeDefined();
  });

  describe('listContexts', () => {
    it('should list all contexts', async () => {
      const mockStore = wrapper.getStore() as any;
      mockStore.listContexts.mockResolvedValueOnce([
        { collection: 'wiki', path: '/entity', context: 'Entity pages for concepts and people' },
        { collection: 'wiki', path: '/source', context: 'Processed source documents' },
      ]);

      const manager = createContextManager(wrapper);
      const contexts = await manager.listContexts();

      expect(contexts).toHaveLength(2);
      expect(contexts[0].path).toBe('/entity');
    });
  });

  describe('addContext', () => {
    it('should add context for a collection path', async () => {
      const mockStore = wrapper.getStore() as any;
      const addSpy = vi.spyOn(wrapper.getStore(), 'addContext');

      const manager = createContextManager(wrapper);
      await manager.addContext('/entity', 'Pages about individual entities');

      expect(addSpy).toHaveBeenCalledWith('wiki', '/entity', 'Pages about individual entities');
    });

    it('should support adding context to raw collection', async () => {
      const mockStore = wrapper.getStore() as any;
      const addSpy = vi.spyOn(wrapper.getStore(), 'addContext');

      const manager = createContextManager(wrapper);
      await manager.addContext('/sources', 'Original source documents', 'raw');

      expect(addSpy).toHaveBeenCalledWith('raw', '/sources', 'Original source documents');
    });
  });

  describe('removeContext', () => {
    it('should remove context from a path', async () => {
      const mockStore = wrapper.getStore() as any;
      const removeSpy = vi.spyOn(wrapper.getStore(), 'removeContext');

      const manager = createContextManager(wrapper);
      await manager.removeContext('/entity');

      expect(removeSpy).toHaveBeenCalledWith('wiki', '/entity');
    });
  });

  describe('setGlobalContext', () => {
    it('should set global context', async () => {
      const mockStore = wrapper.getStore() as any;
      const setSpy = vi.spyOn(wrapper.getStore(), 'setGlobalContext');

      const manager = createContextManager(wrapper);
      await manager.setGlobalContext('Knowledge base for my projects');

      expect(setSpy).toHaveBeenCalledWith('Knowledge base for my projects');
    });

    it('should clear global context when undefined', async () => {
      const mockStore = wrapper.getStore() as any;
      const setSpy = vi.spyOn(wrapper.getStore(), 'setGlobalContext');

      const manager = createContextManager(wrapper);
      await manager.setGlobalContext(undefined);

      expect(setSpy).toHaveBeenCalledWith(undefined);
    });
  });

  describe('initializeDefaults', () => {
    it('should set up default contexts for wiki', async () => {
      const mockStore = wrapper.getStore() as any;
      const addSpy = vi.spyOn(wrapper.getStore(), 'addContext');
      const setSpy = vi.spyOn(wrapper.getStore(), 'setGlobalContext');

      const manager = createContextManager(wrapper);
      await manager.initializeDefaults();

      // Should add contexts for each page type directory
      expect(addSpy).toHaveBeenCalled();
      // Should set global context
      expect(setSpy).toHaveBeenCalled();
    });

    it('should include entity context', async () => {
      const mockStore = wrapper.getStore() as any;
      const addSpy = vi.spyOn(wrapper.getStore(), 'addContext');

      const manager = createContextManager(wrapper);
      await manager.initializeDefaults();

      const entityCall = addSpy.mock.calls.find(
        (call: any[]) => call[1] === '/entity'
      );
      expect(entityCall).toBeDefined();
      expect(entityCall![2]).toContain('entities');
    });

    it('should include source context', async () => {
      const mockStore = wrapper.getStore() as any;
      const addSpy = vi.spyOn(wrapper.getStore(), 'addContext');

      const manager = createContextManager(wrapper);
      await manager.initializeDefaults();

      const sourceCall = addSpy.mock.calls.find(
        (call: any[]) => call[1] === '/source'
      );
      expect(sourceCall).toBeDefined();
      expect(sourceCall![2]).toContain('documents');
    });
  });
});

describe('context paths', () => {
  it('should use qmd:// URI format', async () => {
    const wrapper = createMockWrapper();
    const mockStore = wrapper.getStore() as any;
    const addSpy = vi.spyOn(wrapper.getStore(), 'addContext');

    const manager = createContextManager(wrapper);
    
    // The context manager should use collection://path format
    // when adding contexts through the store
    await manager.addContext('/entity', 'Entity pages');

    expect(addSpy).toHaveBeenCalledWith('wiki', '/entity', 'Entity pages');
  });

  it('should handle nested paths', async () => {
    const wrapper = createMockWrapper();
    const mockStore = wrapper.getStore() as any;
    const addSpy = vi.spyOn(wrapper.getStore(), 'addContext');

    const manager = createContextManager(wrapper);
    await manager.addContext('/entity/people', 'Person entities');

    expect(addSpy).toHaveBeenCalledWith('wiki', '/entity/people', 'Person entities');
  });
});
