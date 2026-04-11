/**
 * Tests for Phase 9 pages: Graph, Sources, Lint, Settings, Agent
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../hooks/useTheme.js';

// Mock implementations for API calls
const mockGraphData = {
  nodes: [
    { id: 'page-1', title: 'Page One', type: 'entity' },
    { id: 'page-2', title: 'Page Two', type: 'source' },
    { id: 'page-3', title: 'Page Three', type: 'summary' },
  ],
  edges: [
    { source: 'page-1', target: 'page-2' },
    { source: 'page-2', target: 'page-3' },
  ],
};

const mockSources = [
  { id: 'src-1', path: '/raw/doc1.md', type: 'markdown', title: 'Document 1', ingestedAt: '2024-01-01T00:00:00Z' },
  { id: 'src-2', path: '/raw/doc2.md', type: 'markdown', title: 'Document 2', ingestedAt: '2024-01-02T00:00:00Z' },
];

const mockLintReport = {
  timestamp: '2024-01-01T00:00:00Z',
  issues: [
    { type: 'orphan', pageId: 'page-1', message: 'No pages link to this page', severity: 'warning' },
    { type: 'contradiction', pageId: 'page-2', message: 'Possible contradiction detected', severity: 'error' },
  ],
  summary: { contradictions: 1, orphans: 1, stale: 0, coverage: [] },
};

const mockLintHistory: any[] = [];

const mockConfig = { wikiName: 'Test Wiki', wikiDir: './wiki' };

const mockAgentStatus = {
  running: true,
  mode: 'interactive',
  currentTask: 'Checking sources',
  lastActivity: '2024-01-01T00:00:00Z',
};

const mockApprovals: any[] = [];

const mockLog = [
  { timestamp: '2024-01-01T00:00:00Z', type: 'ingest', title: 'Test source', details: 'Ingested test.md' },
];

// Mock the API calls at the module level
vi.mock('../api/wiki', () => ({
  getGraphData: vi.fn().mockResolvedValue({
    nodes: [
      { id: 'page-1', title: 'Page One', type: 'entity' },
      { id: 'page-2', title: 'Page Two', type: 'source' },
      { id: 'page-3', title: 'Page Three', type: 'summary' },
    ],
    edges: [
      { source: 'page-1', target: 'page-2' },
      { source: 'page-2', target: 'page-3' },
    ],
  }),
  getSources: vi.fn().mockResolvedValue([
    { id: 'src-1', path: '/raw/doc1.md', type: 'markdown', title: 'Document 1', ingestedAt: '2024-01-01T00:00:00Z' },
    { id: 'src-2', path: '/raw/doc2.md', type: 'markdown', title: 'Document 2', ingestedAt: '2024-01-02T00:00:00Z' },
  ]),
  ingestSource: vi.fn().mockResolvedValue({ createdPages: [] }),
  runLint: vi.fn().mockResolvedValue({
    timestamp: '2024-01-01T00:00:00Z',
    issues: [
      { type: 'orphan', pageId: 'page-1', message: 'No pages link to this page', severity: 'warning' },
      { type: 'contradiction', pageId: 'page-2', message: 'Possible contradiction detected', severity: 'error' },
    ],
    summary: { contradictions: 1, orphans: 1, stale: 0, coverage: [] },
  }),
  getLintHistory: vi.fn().mockResolvedValue([]),
  getConfig: vi.fn().mockResolvedValue({ wikiName: 'Test Wiki', wikiDir: './wiki' }),
  updateConfig: vi.fn().mockResolvedValue(undefined),
  getAgentStatus: vi.fn().mockResolvedValue({
    running: true,
    mode: 'interactive',
    currentTask: 'Checking sources',
    lastActivity: '2024-01-01T00:00:00Z',
  }),
  startAgent: vi.fn().mockResolvedValue(undefined),
  stopAgent: vi.fn().mockResolvedValue(undefined),
  setAgentMode: vi.fn().mockResolvedValue(undefined),
  sendAgentCommand: vi.fn().mockResolvedValue('Test response'),
  getApprovals: vi.fn().mockResolvedValue([]),
  respondToApproval: vi.fn().mockResolvedValue(undefined),
  getLog: vi.fn().mockResolvedValue([
    { timestamp: '2024-01-01T00:00:00Z', type: 'ingest', title: 'Test source', details: 'Ingested test.md' },
  ]),
}));

// Import components after mocking
import { GraphPage } from './Graph.js';
import { SourcesPage } from './Sources.js';
import { LintPage } from './Lint.js';
import { SettingsPage } from './Settings.js';
import { AgentPage } from './Agent.js';

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

// Reset mocks before each test
beforeEach(() => {
  // Don't clear mocks - they are set up with default values at module level
});

describe('Graph Page', () => {
  it('should render graph page with loading state initially', async () => {
    const Wrapper = createTestWrapper(['/graph']);
    render(<GraphPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Page Graph')).toBeTruthy();
    });
  });

  it('should render graph with nodes and edges when data is available', async () => {
    const Wrapper = createTestWrapper(['/graph']);
    render(<GraphPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/3 pages, 2 connections/)).toBeTruthy();
    });
  });

  it('should render legend with all page types', async () => {
    const Wrapper = createTestWrapper(['/graph']);
    render(<GraphPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Entities')).toBeTruthy();
      expect(screen.getByText('Sources')).toBeTruthy();
      expect(screen.getByText('Summaries')).toBeTruthy();
    });
  });

  it('should show empty state when no graph data', async () => {
    // Import fresh to get a handle on the mock
    const wikiApi = await import('../api/wiki');
    vi.mocked(wikiApi.getGraphData).mockResolvedValueOnce({ nodes: [], edges: [] });

    const Wrapper = createTestWrapper(['/graph']);
    render(<GraphPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('No graph data available')).toBeTruthy();
    });
  });

  it('should show instructions for interaction', async () => {
    const Wrapper = createTestWrapper(['/graph']);
    render(<GraphPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Drag nodes to reposition/)).toBeTruthy();
    });
  });
});

describe('Sources Page', () => {
  it('should render sources page', async () => {
    const Wrapper = createTestWrapper(['/sources']);
    render(<SourcesPage />, { wrapper: Wrapper });

    expect(screen.getByText('Upload Files')).toBeTruthy();
    expect(screen.getByText('Import from URL')).toBeTruthy();
  });

  it('should display sources list', async () => {
    const Wrapper = createTestWrapper(['/sources']);
    render(<SourcesPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeTruthy();
      expect(screen.getByText('Document 2')).toBeTruthy();
    });
  });

  it('should have upload section with drag and drop area', async () => {
    const Wrapper = createTestWrapper(['/sources']);
    render(<SourcesPage />, { wrapper: Wrapper });

    expect(screen.getByText(/Drag and drop markdown files here/)).toBeTruthy();
    expect(screen.getByText('Browse Files')).toBeTruthy();
  });

  it('should have URL import form', async () => {
    const Wrapper = createTestWrapper(['/sources']);
    render(<SourcesPage />, { wrapper: Wrapper });

    expect(screen.getByPlaceholderText('https://example.com/article')).toBeTruthy();
    expect(screen.getByText('Import')).toBeTruthy();
  });

  it('should show empty state when no sources', async () => {
    const wikiApi = await import('../api/wiki');
    vi.mocked(wikiApi.getSources).mockResolvedValueOnce([]);

    const Wrapper = createTestWrapper(['/sources']);
    render(<SourcesPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/No sources yet/)).toBeTruthy();
    });
  });
});

describe('Lint Page', () => {
  it('should render lint page with summary cards', async () => {
    const Wrapper = createTestWrapper(['/lint']);
    render(<LintPage />, { wrapper: Wrapper });

    expect(screen.getByText('Contradictions')).toBeTruthy();
    expect(screen.getByText('Orphan Pages')).toBeTruthy();
    expect(screen.getByText('Stale Content')).toBeTruthy();
    expect(screen.getByText('Coverage Gaps')).toBeTruthy();
  });

  it('should display issue count', async () => {
    const Wrapper = createTestWrapper(['/lint']);
    render(<LintPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Issues \(2\)/)).toBeTruthy();
    });
  });

  it('should display issues with severity badges', async () => {
    const Wrapper = createTestWrapper(['/lint']);
    render(<LintPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('No pages link to this page')).toBeTruthy();
      expect(screen.getByText('Possible contradiction detected')).toBeTruthy();
    });
  });

  it('should have run lint button', async () => {
    const Wrapper = createTestWrapper(['/lint']);
    render(<LintPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Run Lint')).toBeTruthy();
    });
  });
});

describe('Lint Page - Empty State', () => {
  it('should show empty state when no issues', async () => {
    const wikiApi = await import('../api/wiki');
    vi.mocked(wikiApi.runLint).mockResolvedValue({
      timestamp: '2024-01-01T00:00:00Z',
      issues: [],
      summary: { contradictions: 0, orphans: 0, stale: 0, coverage: [] },
    });

    const Wrapper = createTestWrapper(['/lint']);
    render(<LintPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/No issues found/)).toBeTruthy();
    });
  });
});

describe('Settings Page', () => {
  it('should render settings page with tabs', async () => {
    const Wrapper = createTestWrapper(['/settings']);
    render(<SettingsPage />, { wrapper: Wrapper });

    expect(screen.getByText('Configuration')).toBeTruthy();
    expect(screen.getByText('Schema Editor')).toBeTruthy();
  });

  it('should display configuration tab by default', async () => {
    const Wrapper = createTestWrapper(['/settings']);
    render(<SettingsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Wiki Configuration')).toBeTruthy();
    });
  });

  it('should have edit button for configuration', async () => {
    const Wrapper = createTestWrapper(['/settings']);
    render(<SettingsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });
  });

  it('should switch to schema tab when clicked', async () => {
    const Wrapper = createTestWrapper(['/settings']);
    render(<SettingsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Schema Editor'));
    });

    expect(screen.getByText('CLAUDE.md (for Claude Code)')).toBeTruthy();
  });
});

describe('Agent Page', () => {
  it('should render agent page', async () => {
    const Wrapper = createTestWrapper(['/agent']);
    render(<AgentPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Agent Running')).toBeTruthy();
    });
  });

  it('should display mode selector', async () => {
    const Wrapper = createTestWrapper(['/agent']);
    render(<AgentPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Interactive')).toBeTruthy();
      expect(screen.getByText('Semi-Autonomous')).toBeTruthy();
      expect(screen.getByText('Autonomous')).toBeTruthy();
    });
  });

  it('should show command input for interactive mode', async () => {
    const Wrapper = createTestWrapper(['/agent']);
    render(<AgentPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Send Command')).toBeTruthy();
    });
  });

  it('should show stop button when agent is running', async () => {
    const Wrapper = createTestWrapper(['/agent']);
    render(<AgentPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Stop')).toBeTruthy();
    });
  });

  it('should show start button when agent is stopped', async () => {
    const wikiApi = await import('../api/wiki');
    vi.mocked(wikiApi.getAgentStatus).mockResolvedValueOnce({ 
      running: false, 
      mode: 'interactive' 
    });

    const Wrapper = createTestWrapper(['/agent']);
    render(<AgentPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Start')).toBeTruthy();
    });
  });

  it('should display activity log', async () => {
    const Wrapper = createTestWrapper(['/agent']);
    render(<AgentPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeTruthy();
    });
  });
});

describe('Responsive Design', () => {
  it('should use responsive grid classes', async () => {
    const Wrapper = createTestWrapper(['/sources']);
    const { container } = render(<SourcesPage />, { wrapper: Wrapper });

    // Check for Tailwind responsive classes
    const uploadSection = container.querySelector('.grid-cols-1');
    expect(uploadSection).toBeTruthy();
  });

  it('should use sm breakpoint for cards', async () => {
    const Wrapper = createTestWrapper(['/lint']);
    const { container } = render(<LintPage />, { wrapper: Wrapper });

    // Check for sm breakpoint classes
    const summaryCards = container.querySelector('.sm\\:grid-cols-2');
    expect(summaryCards).toBeTruthy();
  });

  it('should use lg breakpoint for layouts', async () => {
    const Wrapper = createTestWrapper(['/sources']);
    const { container } = render(<SourcesPage />, { wrapper: Wrapper });

    // Check for lg breakpoint classes
    const lgGrid = container.querySelector('.lg\\:grid-cols-2');
    expect(lgGrid).toBeTruthy();
  });
});
