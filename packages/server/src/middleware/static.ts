/**
 * Static file middleware for serving web frontend
 * 
 * Serves built React app with SPA fallback for client-side routing.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFile, stat, readdir } from 'fs/promises';
import { join, extname, resolve } from 'path';
import { lookup } from 'mime-types';

// MIME types mapping
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.ts': 'application/typescript',
  '.jsx': 'text/javascript',
  '.tsx': 'text/typescript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
};

/**
 * Get MIME type for file extension
 */
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || lookup(ext) || 'application/octet-stream';
}

/**
 * Check if path is a static asset that should be served directly
 */
function isStaticAsset(path: string): boolean {
  const staticExtensions = [
    '.js', '.mjs', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', 
    '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.webm', '.mp4'
  ];
  const ext = extname(path).toLowerCase();
  return staticExtensions.includes(ext);
}

/**
 * Register static file middleware
 */
export function registerStaticMiddleware(app: Hono, publicDir: string): void {
  // Enable CORS for API routes
  app.use('*', cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }));

  // Serve static files from public directory
  app.use('/assets/*', async (c) => {
    const assetPath = c.req.path.replace('/assets/', '');
    const filePath = resolve(publicDir, 'assets', assetPath);
    
    try {
      const content = await readFile(filePath);
      const mimeType = getMimeType(filePath);
      
      return c.body(content, 200, {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
    } catch {
      return c.text('Asset not found', 404);
    }
  });

  // Serve index.html for root
  app.get('/', async (c) => {
    const indexPath = resolve(publicDir, 'index.html');
    
    try {
      const content = await readFile(indexPath, 'utf-8');
      return c.html(content, 200);
    } catch {
      return c.html('<html><body><h1>LLM Wiki</h1><p>Web UI not built. Run `npm run build` in packages/web</p></body></html>', 200);
    }
  });

  // SPA fallback - serve index.html for non-API, non-asset routes
  // This enables client-side routing
  app.use('/*', async (c, next) => {
    const path = c.req.path;
    
    // Skip API routes
    if (path.startsWith('/api/')) {
      return next();
    }
    
    // Skip WebSocket upgrade
    if (path === '/ws') {
      return next();
    }
    
    // For static assets, try to serve them
    if (isStaticAsset(path)) {
      const filePath = resolve(publicDir, path);
      
      try {
        const content = await readFile(filePath);
        const mimeType = getMimeType(filePath);
        
        return c.body(content, 200, {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
      } catch {
        return c.text('File not found', 404);
      }
    }
    
    // For other routes, serve index.html (SPA)
    const indexPath = resolve(publicDir, 'index.html');
    
    try {
      const content = await readFile(indexPath, 'utf-8');
      
      return c.html(content, 200, {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
    } catch {
      return c.html('<html><body><h1>LLM Wiki</h1><p>Web UI not built. Run `npm run build` in packages/web</p></body></html>', 200);
    }
  });
}

/**
 * Check if static files exist
 */
export async function checkStaticFiles(publicDir: string): Promise<{
  exists: boolean;
  hasIndex: boolean;
  assetCount: number;
}> {
  try {
    const indexPath = resolve(publicDir, 'index.html');
    
    try {
      await stat(indexPath);
    } catch {
      return { exists: false, hasIndex: false, assetCount: 0 };
    }

    const assetsDir = resolve(publicDir, 'assets');
    let assetCount = 0;
    
    try {
      const files = await readdir(assetsDir);
      assetCount = files.length;
    } catch {
      // Assets directory might not exist
    }

    return { exists: true, hasIndex: true, assetCount };
  } catch {
    return { exists: false, hasIndex: false, assetCount: 0 };
  }
}
