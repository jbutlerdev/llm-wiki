/**
 * @llm-wiki/server - HTTP API server
 * 
 * Hono-based API server for LLM Wiki
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { join, resolve } from 'path';

// WebSocket manager
import { WebSocketManager } from './ws/index.js';
// File watcher for hot-reload
import { initializeFileWatcher, stopFileWatcher } from './ws/file-watcher.js';

// Static file middleware
import { registerStaticMiddleware, checkStaticFiles } from './middleware/index.js';

// Route handlers - will be registered with wikiDir passed explicitly
import type { WikiContext } from './types.js';

export { type WikiContext } from './types.js';

export interface ServerOptions {
  wikiDir: string;
  port: number;
  host: string;
  wsPort?: number;
  publicDir?: string;
}

// Global wiki directory - set at startup
let globalWikiDir = './wiki';

/**
 * Set the global wiki directory
 */
export function setWikiDir(dir: string): void {
  globalWikiDir = dir;
}

/**
 * Get the global wiki directory
 */
export function getWikiDir(): string {
  return globalWikiDir;
}

/**
 * Create a test app instance (for unit testing)
 */
export function createTestApp(options: { wikiDir: string }): Hono {
  // Set global wiki dir
  globalWikiDir = options.wikiDir;
  
  const app = new Hono();

  // Add middleware
  app.use('*', async (_c, next) => {
    await next();
  });

  // Health check
  app.get('/', (c) => {
    return c.json({
      status: 'ok',
      wiki: globalWikiDir,
      timestamp: new Date().toISOString(),
    });
  });

  // Register routes
  registerAllRoutes(app);

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        success: false,
        error: {
          error: 'Not Found',
          message: `Route ${c.req.method} ${c.req.path} not found`,
          statusCode: 404,
        },
      },
      404
    );
  });

  // Error handler
  app.onError((err, c) => {
    console.error('Server error:', err);
    return c.json(
      {
        success: false,
        error: {
          error: 'Internal Server Error',
          message: err.message || 'An unexpected error occurred',
          statusCode: 500,
        },
      },
      500
    );
  });

  return app;
}

/**
 * Register all routes
 */
function registerAllRoutes(app: Hono): void {
  // Pages routes
  registerPagesRoutes(app);
  registerSourcesRoutes(app);
  registerSearchRoutes(app);
  registerLintRoutes(app);
  registerStatusRoutes(app);
  registerConfigRoutes(app);
  registerLogRoutes(app);
  registerAgentRoutes(app);
  registerGraphRoutes(app);
  registerGitRoutes(app);
}

/**
 * Start the production server with WebSocket and static file support
 */
export async function startServer(options: ServerOptions): Promise<void> {
  globalWikiDir = options.wikiDir;
  
  const app = createTestApp({ wikiDir: options.wikiDir });

  // Determine public directory for static files
  // First check for relative path from server package
  const serverDir = resolve(import.meta.dirname || __dirname, '..');
  const webDist = resolve(serverDir, '..', 'web', 'dist');
  const defaultPublicDir = resolve(serverDir, 'public');
  
  let publicDir: string;
  if (options.publicDir) {
    publicDir = options.publicDir;
  } else {
    const webDistStatus = await checkStaticFiles(webDist);
    publicDir = webDistStatus.exists ? webDist : defaultPublicDir;
  }

  // Check static files status
  const staticStatus = await checkStaticFiles(publicDir);
  if (staticStatus.exists) {
    console.log(`Static files: ${staticStatus.assetCount} assets found`);
  } else {
    console.log('Static files: Web UI not built (run `npm run build` in packages/web)');
  }

  // Register static file middleware (serves web frontend)
  registerStaticMiddleware(app, publicDir);

  // Initialize WebSocket manager
  const wsPort = options.wsPort || options.port + 1;
  const wsManager = new WebSocketManager();
  
  // Store WebSocket manager globally for route access
  (globalThis as { wsManager?: WebSocketManager }).wsManager = wsManager;

  // Start WebSocket server
  try {
    wsManager.initialize(wsPort, options.host);
    console.log(`WebSocket server: ws://${options.host}:${wsPort}`);
  } catch (error) {
    console.warn('WebSocket server failed to start:', error);
  }

  // Initialize file watcher for hot-reload
  try {
    const fileWatcher = initializeFileWatcher(options.wikiDir, wsManager);
    await fileWatcher.start();
    console.log('File watcher: enabled');
  } catch (error) {
    console.warn('File watcher failed to start:', error);
  }

  console.log(`Starting LLM Wiki server on http://${options.host}:${options.port}`);
  console.log(`Wiki directory: ${options.wikiDir}`);
  console.log(`WebSocket: ws://${options.host}:${wsPort}`);

  serve({
    fetch: app.fetch,
    port: options.port,
    hostname: options.host,
  });

  // Keep process alive
  await new Promise(() => {});
}

/**
 * Get the WebSocket manager instance
 */
export function getWebSocketManager(): WebSocketManager | undefined {
  return (globalThis as { wsManager?: WebSocketManager }).wsManager;
}

// Import and re-export route functions
import { registerPagesRoutes } from './routes/pages.js';
import { registerSourcesRoutes } from './routes/sources.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerLintRoutes } from './routes/lint.js';
import { registerStatusRoutes } from './routes/status.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerLogRoutes } from './routes/log.js';
import { registerAgentRoutes } from './routes/agent.js';
import { registerGraphRoutes } from './routes/graph.js';
import { registerGitRoutes } from './routes/git.js';
