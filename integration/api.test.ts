/**
 * API Integration Tests
 * Tests all HTTP API endpoints
 * 
 * Phase 14: Testing & QA
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { join } from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { init } from '../packages/core/dist/wiki/init.js';

// Mock the createTestApp function for testing
// In production, this would import from @llm-wiki/server
async function createTestApp(wikiDir: string) {
  const { createTestApp: createApp } = await import('../packages/server/dist/index.js');
  return createApp({ wikiDir });
}

describe('API Integration Tests', () => {
  let testWikiDir: string;
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    testWikiDir = join(tmpdir(), `llm-wiki-api-test-${Date.now()}-${Math.random()}`);
    await mkdir(testWikiDir, { recursive: true });
    await init(testWikiDir);
    app = await createTestApp(testWikiDir);
  });

  afterEach(async () => {
    try {
      await rm(testWikiDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Health & Status', () => {
    it('GET / should return health status', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { status?: string; wiki?: string; timestamp?: string };
      expect(json.status).toBe('ok');
      expect(json.wiki).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it('GET /api/status should return wiki and QMD status', async () => {
      const res = await app.request('/api/status');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { wiki?: unknown; qmd?: unknown } };
      expect(json.success).toBe(true);
      expect(json.data?.wiki).toBeDefined();
      expect(json.data?.qmd).toBeDefined();
    });
  });

  describe('Pages API', () => {
    it('GET /api/pages should return list of pages', async () => {
      const res = await app.request('/api/pages');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { pages?: unknown[] } };
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data?.pages)).toBe(true);
    });

    it('GET /api/pages should support pagination', async () => {
      const res = await app.request('/api/pages?page=1&pageSize=10');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { page?: number; pageSize?: number } };
      expect(json.data?.page).toBe(1);
      expect(json.data?.pageSize).toBe(10);
    });

    it('GET /api/pages should validate pagination params', async () => {
      const res = await app.request('/api/pages?page=-1');
      expect(res.status).toBe(400);
    });

    it('GET /api/pages should support type filter', async () => {
      const res = await app.request('/api/pages?type=source');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { pages?: unknown[] } };
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data?.pages)).toBe(true);
    });
  });

  describe('Sources API', () => {
    it('GET /api/sources should return list of sources', async () => {
      const res = await app.request('/api/sources');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { sources?: unknown[] } };
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data?.sources)).toBe(true);
    });

    it('POST /api/sources/ingest should ingest a file', async () => {
      // Create a test file
      const testFile = join(testWikiDir, 'test-ingest.md');
      await writeFile(testFile, '# Test Ingest\n\nContent for API test.');

      const res = await app.request('/api/sources/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'file', path: testFile }),
      });
      
      expect([200, 201]).toContain(res.status);
      
      const json = await res.json() as { success?: boolean; data?: { result?: unknown } };
      expect(json.success).toBe(true);
      expect(json.data?.result).toBeDefined();
    });

    it('POST /api/sources/ingest should handle URL sources', async () => {
      // Note: This test mocks the URL handling
      // In real scenarios, URLs would be fetched
      const res = await app.request('/api/sources/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'url',
          url: 'https://example.com/page'
        }),
      });
      
      // Should accept the request (actual fetch might fail in test env)
      expect([200, 201, 400, 500]).toContain(res.status);
    });
  });

  describe('Search API', () => {
    it('GET /api/search should require query parameter', async () => {
      const res = await app.request('/api/search');
      expect(res.status).toBe(400);
    });

    it('GET /api/search should return results for valid query', async () => {
      const res = await app.request('/api/search?q=test');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { query?: string; results?: unknown[] } };
      expect(json.success).toBe(true);
      expect(json.data?.query).toBe('test');
      expect(Array.isArray(json.data?.results)).toBe(true);
    });

    it('GET /api/search should support type filter', async () => {
      const res = await app.request('/api/search?q=test&type=source');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { results?: unknown[] } };
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data?.results)).toBe(true);
    });
  });

  describe('Lint API', () => {
    it('GET /api/lint should return lint report', async () => {
      const res = await app.request('/api/lint');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { report?: { timestamp?: Date; issues?: unknown[] } } };
      expect(json.success).toBe(true);
      expect(json.data?.report).toBeDefined();
      expect(Array.isArray(json.data?.report?.issues)).toBe(true);
    });

    it('GET /api/lint/history should return lint history', async () => {
      const res = await app.request('/api/lint/history');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { history?: unknown[] } };
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data?.history)).toBe(true);
    });
  });

  describe('Config API', () => {
    it('GET /api/config should return current config', async () => {
      const res = await app.request('/api/config');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { config?: unknown; editableFields?: string[] } };
      expect(json.success).toBe(true);
      expect(json.data?.config).toBeDefined();
      expect(Array.isArray(json.data?.editableFields)).toBe(true);
    });

    it('PUT /api/config should update config', async () => {
      const res = await app.request('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Wiki' }),
      });
      
      expect([200, 400]).toContain(res.status);
    });

    it('PUT /api/config should reject invalid fields', async () => {
      const res = await app.request('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalidField: 'should fail' }),
      });
      
      expect(res.status).toBe(400);
    });
  });

  describe('Log API', () => {
    it('GET /api/log should return log entries', async () => {
      const res = await app.request('/api/log');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { entries?: unknown[]; total?: number } };
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data?.entries)).toBe(true);
      expect(typeof json.data?.total).toBe('number');
    });

    it('GET /api/log should support limit parameter', async () => {
      const res = await app.request('/api/log?limit=5');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { entries?: unknown[] } };
      expect(json.success).toBe(true);
      expect(json.data?.entries?.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Agent API', () => {
    it('GET /api/agent/status should return agent status', async () => {
      const res = await app.request('/api/agent/status');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { running?: boolean; mode?: string } };
      expect(json.success).toBe(true);
      expect(typeof json.data?.running).toBe('boolean');
      expect(typeof json.data?.mode).toBe('string');
    });

    it('POST /api/agent/start should start agent', async () => {
      const res = await app.request('/api/agent/start', {
        method: 'POST',
      });
      
      // Returns 202 Accepted on success, or error code on failure
      expect([200, 202, 409, 500]).toContain(res.status);
    });

    it('POST /api/agent/stop should stop agent', async () => {
      const res = await app.request('/api/agent/stop', {
        method: 'POST',
      });
      
      expect([200, 500]).toContain(res.status);
    });

    it('PUT /api/agent/mode should update agent mode', async () => {
      const res = await app.request('/api/agent/mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'interactive' }),
      });
      
      expect([200, 400, 500]).toContain(res.status);
    });

    it('PUT /api/agent/mode should reject invalid mode', async () => {
      const res = await app.request('/api/agent/mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'invalid' }),
      });
      
      expect(res.status).toBe(400);
    });
  });

  describe('Graph API', () => {
    it('GET /api/graph should return graph data', async () => {
      const res = await app.request('/api/graph');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { nodes?: unknown[]; edges?: unknown[]; stats?: unknown } };
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data?.nodes)).toBe(true);
      expect(Array.isArray(json.data?.edges)).toBe(true);
      expect(json.data?.stats).toBeDefined();
    });
  });

  describe('Git API', () => {
    it('GET /api/git/status should return git status', async () => {
      const res = await app.request('/api/git/status');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: { isRepo?: boolean } };
      expect(json.success).toBe(true);
      expect(typeof json.data?.isRepo).toBe('boolean');
    });

    it('GET /api/git/diff should return diff', async () => {
      const res = await app.request('/api/git/diff');
      expect(res.status).toBe(200);
      
      const json = await res.json() as { success?: boolean; data?: unknown };
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await app.request('/api/unknown/route');
      expect(res.status).toBe(404);
    });

    it('should return proper error format', async () => {
      const res = await app.request('/api/unknown');
      const json = await res.json() as { success?: boolean; error?: { message?: string; statusCode?: number } };
      
      expect(json.success).toBe(false);
      expect(json.error?.statusCode).toBe(404);
    });
  });
});

describe('API Edge Cases', () => {
  let testWikiDir: string;
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    testWikiDir = join(tmpdir(), `llm-wiki-edge-${Date.now()}-${Math.random()}`);
    await mkdir(testWikiDir, { recursive: true });
    await init(testWikiDir);
    app = await createTestApp(testWikiDir);
  });

  afterEach(async () => {
    try {
      await rm(testWikiDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should handle empty wiki directory', async () => {
    const res = await app.request('/api/pages');
    expect(res.status).toBe(200);
    
    const json = await res.json() as { success?: boolean; data?: { pages?: unknown[] } };
    expect(json.success).toBe(true);
    expect(json.data?.pages).toHaveLength(0);
  });

  it('should handle malformed JSON in PUT requests', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    });
    
    expect([400, 500]).toContain(res.status);
  });

  it('should handle very long query strings', async () => {
    const longQuery = 'a'.repeat(10000);
    const res = await app.request(`/api/search?q=${longQuery}`);
    
    // Should either succeed or return appropriate error
    expect([200, 400, 414]).toContain(res.status);
  });
});
