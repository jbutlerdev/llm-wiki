/**
 * Tests for static file middleware
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestApp } from '../index.js';
import { registerStaticMiddleware, checkStaticFiles } from './static.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { resolve } from 'path';
import { tmpdir } from 'os';

describe('Static File Middleware', () => {
  let publicDir: string;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(async () => {
    // Create a temporary directory for static files
    publicDir = resolve(tmpdir(), `llm-wiki-test-${Date.now()}`);
    await mkdir(publicDir, { recursive: true });
    await mkdir(resolve(publicDir, 'assets'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await rm(publicDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('registerStaticMiddleware', () => {
    it('should register middleware without error', () => {
      app = createTestApp({ wikiDir: './test-wiki' });
      expect(() => {
        registerStaticMiddleware(app, publicDir);
      }).not.toThrow();
    });
  });

  describe('index.html serving', () => {
    it('should serve index.html for SPA routes', async () => {
      app = createTestApp({ wikiDir: './test-wiki' });
      registerStaticMiddleware(app, publicDir);

      // Create index.html
      await writeFile(resolve(publicDir, 'index.html'), '<html><body>SPA App</body></html>');

      // Request a non-API path that should trigger SPA fallback
      const res = await app.request('/app/browse');
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('SPA App');
    });

    it('should return placeholder when index.html not found', async () => {
      app = createTestApp({ wikiDir: './test-wiki' });
      registerStaticMiddleware(app, publicDir);

      // Request a path that would trigger SPA fallback
      const res = await app.request('/app/browse');
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('LLM Wiki');
    });
  });

  describe('static asset serving', () => {
    it('should serve CSS files with correct content-type', async () => {
      app = createTestApp({ wikiDir: './test-wiki' });
      registerStaticMiddleware(app, publicDir);

      // Create a CSS file
      const cssContent = 'body { color: red; }';
      await writeFile(resolve(publicDir, 'assets', 'style.css'), cssContent);

      const res = await app.request('/assets/style.css');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/css');
    });

    it('should serve JS files with correct content-type', async () => {
      app = createTestApp({ wikiDir: './test-wiki' });
      registerStaticMiddleware(app, publicDir);

      // Create a JS file
      const jsContent = 'console.log("test");';
      await writeFile(resolve(publicDir, 'assets', 'app.js'), jsContent);

      const res = await app.request('/assets/app.js');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('javascript');
    });

    it('should return 404 for non-existent assets', async () => {
      app = createTestApp({ wikiDir: './test-wiki' });
      registerStaticMiddleware(app, publicDir);

      const res = await app.request('/assets/nonexistent.js');
      expect(res.status).toBe(404);
    });
  });

  describe('SPA fallback', () => {
    it('should serve index.html for non-API, non-asset routes', async () => {
      app = createTestApp({ wikiDir: './test-wiki' });
      registerStaticMiddleware(app, publicDir);

      // Create index.html
      await writeFile(resolve(publicDir, 'index.html'), '<html><body>SPA</body></html>');

      const res = await app.request('/browse');
      expect(res.status).toBe(200);
    });

    it('should not interfere with API routes', async () => {
      app = createTestApp({ wikiDir: './test-wiki' });
      registerStaticMiddleware(app, publicDir);

      const res = await app.request('/api/pages');
      expect(res.status).toBe(200);
    });
  });
});

describe('checkStaticFiles', () => {
  let publicDir: string;

  beforeEach(async () => {
    publicDir = resolve(tmpdir(), `llm-wiki-test-static-${Date.now()}`);
    await mkdir(publicDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(publicDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should return exists:false when no static files', async () => {
    const result = await checkStaticFiles(publicDir);
    expect(result.exists).toBe(false);
    expect(result.hasIndex).toBe(false);
    expect(result.assetCount).toBe(0);
  });

  it('should detect existing index.html', async () => {
    await writeFile(resolve(publicDir, 'index.html'), '<html></html>');
    
    const result = await checkStaticFiles(publicDir);
    expect(result.exists).toBe(true);
    expect(result.hasIndex).toBe(true);
  });

  it('should count assets in assets directory', async () => {
    await mkdir(resolve(publicDir, 'assets'), { recursive: true });
    await writeFile(resolve(publicDir, 'index.html'), '<html></html>');
    await writeFile(resolve(publicDir, 'assets', 'style.css'), 'body {}');
    await writeFile(resolve(publicDir, 'assets', 'app.js'), '// js');
    
    const result = await checkStaticFiles(publicDir);
    expect(result.assetCount).toBe(2);
  });
});
