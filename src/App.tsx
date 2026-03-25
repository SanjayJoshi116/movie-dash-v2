import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Result, Button } from 'antd';
import { MoviesProvider } from './contexts/MoviesContext';
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

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #0f172a 0%, #1e293b 100%)' }}>
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
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <MoviesProvider>
        <ScrollToTop />
        <AppContent />
      </MoviesProvider>
    </Router>
  );
};

export default App;
