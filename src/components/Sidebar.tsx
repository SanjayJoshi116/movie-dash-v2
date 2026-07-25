import React from 'react';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, BarChartOutlined, PlayCircleOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import type { MenuProps } from 'antd';

const { Sider } = Layout;

const ACCENT = '#818cf8';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const location = useLocation();
  const { isDark } = useTheme();

  const items: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: '/movies',
      icon: <UnorderedListOutlined />,
      label: <Link to="/movies">Movies</Link>,
    },
    {
      key: '/stats',
      icon: <BarChartOutlined />,
      label: <Link to="/stats">Stats</Link>,
    },
  ];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      className="glass-panel"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        minHeight: '100vh',
        borderRight: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        position: 'sticky',
        top: 0,
        left: 0,
        alignSelf: 'flex-start',
      }}
      theme={isDark ? 'dark' : 'light'}
    >
      <Link
        to="/"
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px',
          borderBottom: `1px solid var(--glass-border)`,
          gap: 10,
          overflow: 'hidden',
          color: 'inherit',
          textDecoration: 'none',
        }}
      >
        <PlayCircleOutlined style={{ fontSize: 22, color: ACCENT, flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 17, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
            Movie<span style={{ color: ACCENT }}>Dash</span>
          </span>
        )}
      </Link>

      <Menu
        theme={isDark ? 'dark' : 'light'}
        selectedKeys={[location.pathname]}
        items={items}
        style={{
          background: 'transparent',
          border: 'none',
          marginTop: 8,
        }}
      />
    </Sider>
  );
};

export default Sidebar;
