/**
 * LLM Wiki - Main Application Component
 * 
 * Sets up routing, providers, and layout for the wiki web UI.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Browse } from './pages/Browse';
import { PageView } from './pages/PageView';
import { SearchPage } from './pages/Search';
import { QueryPage } from './pages/Query';
import { GraphPage } from './pages/Graph';
import { SourcesPage } from './pages/Sources';
import { LintPage } from './pages/Lint';
import { SettingsPage } from './pages/Settings';
import { AgentPage } from './pages/Agent';
import { NotFound } from './pages/NotFound';
import { ThemeProvider, useTheme } from './hooks/useTheme';

// Create a client
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
        retry: 1,
      },
    },
  });

/**
 * Inner app component with routes - doesn't include Router wrapper
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="browse" element={<Browse />} />
        <Route path="browse/:type" element={<Browse />} />
        <Route path="page/:id" element={<PageView />} />
        <Route path="page/:type/:slug" element={<PageView />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="query" element={<QueryPage />} />
        <Route path="graph" element={<GraphPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="lint" element={<LintPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="agent" element={<AgentPage />} />
        <Route path="404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}

/**
 * Inner app component that uses theme hook
 */
function AppContent() {
  const { theme } = useTheme();
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <div className={theme}>
        <AppRoutes />
      </div>
    </QueryClientProvider>
  );
}

/**
 * Root App component with providers
 * This is the component that should be mounted - it includes BrowserRouter
 */
export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export { webVersion } from './version.js';
export default App;
