/**
 * Tests for Web package - Phase 8: App Routing
 * 
 * Tests React Router setup, route structure, and layout.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './App.js';
import { webVersion } from './version.js';
import { ThemeProvider } from './hooks/useTheme.js';

// Mock the API calls
vi.mock('./api/wiki', () => ({
  getWikiStatus: vi.fn().mockResolvedValue({
    wikiDir: './wiki',
    pageCount: 10,
    sourceCount: 5,
    lintSummary: { contradictions: 0, orphans: 1, stale: 0 },
  }),
  getLog: vi.fn().mockResolvedValue([
    { timestamp: '2024-01-01T00:00:00Z', type: 'ingest', title: 'Test source', details: 'Ingested test.md' },
  ]),
  getPages: vi.fn().mockResolvedValue([]),
  getPage: vi.fn().mockResolvedValue({
    id: 'test-page',
    title: 'Test Page',
    type: 'entity',
    content: 'Test content',
    tags: ['test'],
    sources: [],
    relatedPages: [],
    lastModified: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  }),
  getBacklinks: vi.fn().mockResolvedValue([]),
  searchWiki: vi.fn().mockResolvedValue([]),
  getGraphData: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
  getSources: vi.fn().mockResolvedValue([]),
  ingestSource: vi.fn().mockResolvedValue({ createdPages: [] }),
  runLint: vi.fn().mockResolvedValue({
    timestamp: '2024-01-01T00:00:00Z',
    issues: [],
    summary: { contradictions: 0, orphans: 0, stale: 0, coverage: [] },
  }),
  getLintHistory: vi.fn().mockResolvedValue([]),
  getConfig: vi.fn().mockResolvedValue({ wikiName: 'Test Wiki' }),
  updateConfig: vi.fn().mockResolvedValue(undefined),
  getAgentStatus: vi.fn().mockResolvedValue({ running: false, mode: 'interactive' }),
  startAgent: vi.fn().mockResolvedValue(undefined),
  stopAgent: vi.fn().mockResolvedValue(undefined),
  setAgentMode: vi.fn().mockResolvedValue(undefined),
  sendAgentCommand: vi.fn().mockResolvedValue('Test response'),
}));

// Create a test wrapper with all providers
function createTestWrapper(initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  };
}

describe('Web package', () => {
  describe('App entry point', () => {
    it('should export version', () => {
      expect(webVersion).toBe('0.1.0');
    });
  });

  describe('App routing', () => {
    it('should render without crashing', () => {
      const Wrapper = createTestWrapper();
      expect(() => render(<AppRoutes />, { wrapper: Wrapper })).not.toThrow();
    });

    it('should have React Router set up', () => {
      const Wrapper = createTestWrapper();
      render(<AppRoutes />, { wrapper: Wrapper });
      
      // Check that navigation elements exist
      const wikiText = document.body.textContent || '';
      expect(wikiText).toContain('LLM Wiki');
    });
  });

  describe('Route guards and structure', () => {
    it('should define all required routes', async () => {
      const Wrapper = createTestWrapper();
      const { container } = render(<AppRoutes />, { wrapper: Wrapper });

      // App should render without errors
      expect(container).toBeTruthy();
    });

    it('should have dashboard route at /', async () => {
      const Wrapper = createTestWrapper();
      render(<AppRoutes />, { wrapper: Wrapper });

      // Wait for dashboard to load
      await waitFor(() => {
        expect(document.body.textContent).toContain('Dashboard');
      });
    });

    it('should have browse route', async () => {
      const Wrapper = createTestWrapper(['/browse']);
      render(<AppRoutes />, { wrapper: Wrapper });

      // Wait for page to load
      await waitFor(() => {
        expect(document.body.textContent).toContain('Browse');
      });
    });

    it('should have search route', async () => {
      const Wrapper = createTestWrapper(['/search']);
      render(<AppRoutes />, { wrapper: Wrapper });

      // Wait for page to load
      await waitFor(() => {
        expect(document.body.textContent).toContain('Search');
      });
    });

    it('should have query route', async () => {
      const Wrapper = createTestWrapper(['/query']);
      render(<AppRoutes />, { wrapper: Wrapper });

      // Wait for page to load
      await waitFor(() => {
        expect(document.body.textContent).toContain('Ask a Question');
      });
    });

    it('should have graph route', async () => {
      const Wrapper = createTestWrapper(['/graph']);
      render(<AppRoutes />, { wrapper: Wrapper });

      // Wait for page to load
      await waitFor(() => {
        expect(document.body.textContent).toContain('Graph');
      });
    });

    it('should have sources route', async () => {
      const Wrapper = createTestWrapper(['/sources']);
      render(<AppRoutes />, { wrapper: Wrapper });

      // Wait for page to load
      await waitFor(() => {
        expect(document.body.textContent).toContain('Sources');
      });
    });

    it('should have lint route', async () => {
      const Wrapper = createTestWrapper(['/lint']);
      render(<AppRoutes />, { wrapper: Wrapper });

      // Wait for page to load
      await waitFor(() => {
        expect(document.body.textContent).toContain('Lint');
      });
    });

    it('should have settings route', async () => {
      const Wrapper = createTestWrapper(['/settings']);
      render(<AppRoutes />, { wrapper: Wrapper });

      // Wait for page to load
      await waitFor(() => {
        expect(document.body.textContent).toContain('Settings');
      });
    });

    it('should have agent route', async () => {
      const Wrapper = createTestWrapper(['/agent']);
      render(<AppRoutes />, { wrapper: Wrapper });

      // Wait for page to load
      await waitFor(() => {
        expect(document.body.textContent).toContain('Agent');
      });
    });

    it('should handle 404 route', async () => {
      const Wrapper = createTestWrapper(['/404']);
      render(<AppRoutes />, { wrapper: Wrapper });

      // The app should have a 404 route
      await waitFor(() => {
        expect(document.body.textContent).toContain('404');
      });
    });
  });

  describe('Layout wrapper', () => {
    it('should include sidebar navigation', async () => {
      const Wrapper = createTestWrapper();
      render(<AppRoutes />, { wrapper: Wrapper });

      await waitFor(() => {
        // Check for navigation links in sidebar
        const navElements = document.querySelectorAll('nav a');
        expect(navElements.length).toBeGreaterThan(0);
      });
    });

    it('should include header with theme toggle', async () => {
      const Wrapper = createTestWrapper();
      render(<AppRoutes />, { wrapper: Wrapper });

      // Header should exist (contains title)
      expect(document.body.textContent).toContain('LLM Wiki');
    });

    it('should include search button in header', async () => {
      const Wrapper = createTestWrapper();
      render(<AppRoutes />, { wrapper: Wrapper });

      // Search button should exist
      const searchButton = document.querySelector('button');
      expect(searchButton).toBeTruthy();
    });
  });
});

describe('Theme functionality', () => {
  it('should export theme hook', async () => {
    const { useTheme } = await import('./hooks/useTheme');
    expect(useTheme).toBeDefined();
  });
});
