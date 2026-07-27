import React from 'react';
import { Link, useLocation } from 'react-router';
import { DashboardOutlined, BarChartOutlined, UnorderedListOutlined } from '@ant-design/icons';

const ACCENT = '#818cf8';

const ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/movies', icon: <UnorderedListOutlined />, label: 'Movies' },
  { key: '/stats', icon: <BarChartOutlined />, label: 'Stats' },
];

const BottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      className="glass-panel"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {ITEMS.map((item) => {
        const active = location.pathname === item.key;
        return (
          <Link
            key={item.key}
            to={item.key}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '10px 0',
              color: active ? ACCENT : 'var(--text-secondary)',
              fontSize: 20,
              textDecoration: 'none',
            }}
          >
            {item.icon}
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 400 }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
