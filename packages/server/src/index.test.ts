/**
 * Tests for Server package
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp } from './index.js';

// Test wiki directory setup
const TEST_WIKI_DIR = './data/test-wiki';

describe('Server package', () => {
  describe('createTestApp', () => {
    it('should create a Hono app instance', async () => {
      const app = createTestApp({ wikiDir: TEST_WIKI_DIR });
      expect(app).toBeDefined();
      expect(typeof app.fetch).toBe('function');
    });
  });
});

describe('Server API - Health', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 200 on health check GET /', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
  });

  it('should return JSON with status ok', async () => {
    const res = await app.request('/');
    const json = await res.json() as { status?: string; wiki?: string; timestamp?: string };
    expect(json).toHaveProperty('status', 'ok');
    expect(json).toHaveProperty('wiki');
    expect(json).toHaveProperty('timestamp');
  });
});

describe('Server API - Pages', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 200 on GET /api/pages', async () => {
    const res = await app.request('/api/pages');
    expect(res.status).toBe(200);
  });

  it('should return pages array in response', async () => {
    const res = await app.request('/api/pages');
    const json = await res.json() as { success?: boolean; data?: { pages?: unknown[] } };
    expect(json).toHaveProperty('success', true);
    expect(json.data).toHaveProperty('pages');
    expect(Array.isArray(json.data?.pages)).toBe(true);
  });

  it('should support pagination parameters', async () => {
    const res = await app.request('/api/pages?page=1&pageSize=10');
    const json = await res.json() as { data?: { page?: number; pageSize?: number } };
    expect(json.data).toHaveProperty('page', 1);
    expect(json.data).toHaveProperty('pageSize', 10);
  });

  it('should return 400 for invalid page parameter', async () => {
    const res = await app.request('/api/pages?page=-1');
    expect(res.status).toBe(400);
  });
});

describe('Server API - Sources', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 200 on GET /api/sources', async () => {
    const res = await app.request('/api/sources');
    expect(res.status).toBe(200);
  });

  it('should return sources array in response', async () => {
    const res = await app.request('/api/sources');
    const json = await res.json() as { success?: boolean; data?: { sources?: unknown[] } };
    expect(json).toHaveProperty('success', true);
    expect(json.data).toHaveProperty('sources');
    expect(Array.isArray(json.data?.sources)).toBe(true);
  });
});

describe('Server API - Search', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 200 on GET /api/search', async () => {
    const res = await app.request('/api/search?q=test');
    expect(res.status).toBe(200);
  });

  it('should require query parameter', async () => {
    const res = await app.request('/api/search');
    expect(res.status).toBe(400);
  });

  it('should return search results format', async () => {
    const res = await app.request('/api/search?q=test');
    const json = await res.json() as { data?: { query?: string; results?: unknown[]; took?: number } };
    expect(json.data).toHaveProperty('query', 'test');
    expect(json.data).toHaveProperty('results');
    expect(Array.isArray(json.data?.results)).toBe(true);
    expect(json.data).toHaveProperty('took');
  });
});

describe('Server API - Lint', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 200 on GET /api/lint', async () => {
    const res = await app.request('/api/lint');
    expect(res.status).toBe(200);
  });

  it('should return lint report format', async () => {
    const res = await app.request('/api/lint');
    const json = await res.json() as { data?: { report?: { timestamp?: Date; issues?: unknown[]; summary?: unknown } } };
    expect(json.data).toHaveProperty('report');
    expect(json.data?.report).toHaveProperty('timestamp');
    expect(json.data?.report).toHaveProperty('issues');
    expect(json.data?.report).toHaveProperty('summary');
  });
});

describe('Server API - Status', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 200 on GET /api/status', async () => {
    const res = await app.request('/api/status');
    expect(res.status).toBe(200);
  });

  it('should return status with wiki and qmd info', async () => {
    const res = await app.request('/api/status');
    const json = await res.json() as { data?: { wiki?: unknown; qmd?: unknown } };
    expect(json.data).toHaveProperty('wiki');
    expect(json.data).toHaveProperty('qmd');
  });
});

describe('Server API - Config', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 200 on GET /api/config', async () => {
    const res = await app.request('/api/config');
    expect(res.status).toBe(200);
  });

  it('should return config with editable fields', async () => {
    const res = await app.request('/api/config');
    const json = await res.json() as { data?: { config?: unknown; editableFields?: unknown[] } };
    expect(json.data).toHaveProperty('config');
    expect(json.data).toHaveProperty('editableFields');
  });

  it('should return 400 for invalid config field', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: 'value' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('Server API - Log', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 200 on GET /api/log', async () => {
    const res = await app.request('/api/log');
    expect(res.status).toBe(200);
  });

  it('should return log entries', async () => {
    const res = await app.request('/api/log');
    const json = await res.json() as { data?: { entries?: unknown[]; total?: number } };
    expect(json.data).toHaveProperty('entries');
    expect(json.data).toHaveProperty('total');
  });
});

describe('Server API - 404', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 404 for unknown routes', async () => {
    const res = await app.request('/api/unknown');
    expect(res.status).toBe(404);
  });
});

describe('Server API - Agent', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 200 on GET /api/agent/status', async () => {
    const res = await app.request('/api/agent/status');
    expect(res.status).toBe(200);
  });

  it('should return agent status', async () => {
    const res = await app.request('/api/agent/status');
    const json = await res.json() as { data?: { running?: boolean; mode?: string } };
    expect(json.data).toHaveProperty('running');
    expect(json.data).toHaveProperty('mode');
  });
});

describe('Server API - Graph', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    app = createTestApp({ wikiDir: TEST_WIKI_DIR });
  });

  it('should return 200 on GET /api/graph', async () => {
    const res = await app.request('/api/graph');
    expect(res.status).toBe(200);
  });

  it('should return graph data format', async () => {
    const res = await app.request('/api/graph');
    const json = await res.json() as { data?: { nodes?: unknown[]; edges?: unknown[]; stats?: unknown } };
    expect(json.data).toHaveProperty('nodes');
    expect(json.data).toHaveProperty('edges');
    expect(json.data).toHaveProperty('stats');
  });
});
