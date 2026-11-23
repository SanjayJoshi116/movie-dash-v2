import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useNavigationType } from 'react-router';
import { Layout, Result, Button, Spin, ConfigProvider, Grid, theme as antdTheme } from 'antd';
import { MoviesProvider, useMoviesContext } from './contexts/MoviesContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import PageTitle from './components/PageTitle';
import { noteNavigation } from './utils/firstPage';
import { retryableLazy, retryFailedLazies } from './utils/retryableLazy';

// Retryable: a failed chunk download is retried on the next render instead of cached (B10).
const Stats = retryableLazy(() => import('./pages/Stats'));
const Movies = retryableLazy(() => import('./pages/Movies'));

const PageLoader: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <Spin size="large" />
  </div>
);

const { Content } = Layout;

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Result
        status="404"
        // A real heading (it also names the tab and takes focus, like every page's title).
        title={<PageTitle title="Page not found" style={{ marginBottom: 0 }} />}
        subTitle="The page you're looking for doesn't exist."
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        }
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  // Track the first page here too: a route that crashes before its PageTitle renders still counts as leaving it.
  noteNavigation(location.pathname);
  const navigationType = useNavigationType();
  const { isDark } = useTheme();
  const { refetch } = useMoviesContext();
  const screens = Grid.useBreakpoint();
  // antd 6.7's useBreakpoint() reads matchMedia in its first snapshot, so `screens` is real on the
  // first render. `=== false` is still defensive: an unknown value is treated as neither layout, so
  // the mobile BottomNav never shows on desktop and a tablet-width load starts collapsed.
  const isMobile = screens.sm === false;
  const [collapsed, setCollapsed] = useState(() => screens.md === false);
  const [prevMd, setPrevMd] = useState(screens.md);

  // Later resizes across md: render-phase prev-value pattern (no effect).
  if (screens.md !== prevMd) {
    setPrevMd(screens.md);
    setCollapsed(!screens.md);
  }

  // The boundary is keyed on pathname (fresh per section). Within a section, a navigation (e.g.
  // clicking Stats while a crashed /stats?tab=people is shown) also resets it via resetKey. The one
  // exception is a REPLACE that only rewrites the query string (Stats' ?tab= sync), so switching
  // tabs never clears/remounts the page. A Link to the URL already shown is also a REPLACE (React
  // Router does that for same-URL links) but keeps the search, so clicking a crashed page's own nav
  // link still resets it.
  const [prevLocation, setPrevLocation] = useState(location);
  const [resetKey, setResetKey] = useState(location.key);
  if (location.key !== prevLocation.key) {
    setPrevLocation(location);
    const searchOnlyReplace = navigationType === 'REPLACE'
      && location.pathname === prevLocation.pathname
      && location.search !== prevLocation.search;
    if (!searchOnlyReplace) setResetKey(location.key);
  }

  return (
    <ConfigProvider
      // antd 6 made Tag `filled` by default and dropped its trailing 8px margin; keep the v5 look
      // (outlined, inline tags spaced) that the genre/rating/language tags were designed around.
      tag={{ variant: 'outlined', styles: { root: { marginInlineEnd: 8 } } }}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary:  '#818cf8',
          colorInfo:     '#818cf8',
          colorSuccess:  '#34d399',
          colorWarning:  '#fbbf24',
          colorError:    '#f87171',
          borderRadius:  12,
          fontFamily:    'Segoe UI, Roboto, sans-serif',
          ...(isDark ? {
            colorBgBase:      '#0d0d1a',
            colorBgContainer: '#1a1030',
            colorBgElevated:  '#2d1b69',
            colorBorder:      'rgba(255, 255, 255, 0.12)',
          } : {}),
        },
        components: {
          Tabs: {
            inkBarColor:       '#818cf8',
            itemActiveColor:   '#818cf8',
            itemSelectedColor: '#818cf8',
          },
          ...(isDark ? {
            Menu: {
              darkItemSelectedBg:    'rgba(129, 140, 248, 0.12)',
              darkItemSelectedColor: '#818cf8',
            },
            Drawer: {
              colorBgElevated: '#1a1030',
            },
          } : {}),
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: 'var(--bg-gradient)' }}>
        {screens.sm && <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />}
        <Layout style={{ background: 'transparent' }}>
          <TopBar />
          <Content style={isMobile ? { paddingBottom: 64 } : undefined}>
            <ErrorBoundary key={location.pathname} resetKey={resetKey} onReset={refetch} onClear={retryFailedLazies}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/movies" element={<Movies />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Content>
        </Layout>
        {isMobile && <BottomNav />}
      </Layout>
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <MoviesProvider>
          <ScrollToTop />
          <AppContent />
        </MoviesProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
