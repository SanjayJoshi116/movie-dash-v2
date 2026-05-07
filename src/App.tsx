import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Result, Button, ConfigProvider, theme as antdTheme } from 'antd';
import { MoviesProvider } from './contexts/MoviesContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Stats from './pages/Stats';
import ScrollToTop from './components/ScrollToTop';

const { Content } = Layout;

const PAGE_TITLES: Record<string, string> = {
  '/': 'Admin Dashboard',
  '/stats': 'Statistics Dashboard',
};

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Result
        status="404"
        title="404"
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
  const [collapsed, setCollapsed] = useState(false);
  const { isDark } = useTheme();

  return (
    <ConfigProvider
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
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout style={{ background: 'transparent' }}>
          <TopBar title={PAGE_TITLES[location.pathname] ?? 'MovieDash'} />
          <Content>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Content>
        </Layout>
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
