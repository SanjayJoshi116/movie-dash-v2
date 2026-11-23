import React from 'react';
import { Button, Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlayCircleOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router';
import { normalizePath } from '../utils/path';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING } from '../utils/chartTheme';
import type { MenuProps } from 'antd';

const { Sider } = Layout;

const ACCENT = '#818cf8';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const location = useLocation();
  const path = normalizePath(location.pathname);
  const { isDark } = useTheme();

  const items: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/" aria-current={path === '/' ? 'page' : undefined}>Dashboard</Link>,
    },
    {
      key: '/movies',
      icon: <UnorderedListOutlined />,
      label: <Link to="/movies" aria-current={path === '/movies' ? 'page' : undefined}>Movies</Link>,
    },
    {
      key: '/stats',
      icon: <BarChartOutlined />,
      label: <Link to="/stats" aria-current={path === '/stats' ? 'page' : undefined}>Stats</Link>,
    },
  ];

  return (
    // trigger={null}: Ant's default trigger is a bare <div onClick> (no role, focus or name), so the
    // collapse toggle is a real Button below instead.
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
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
        aria-label="MovieDash – Dashboard"
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : `0 ${SPACING.xl}px`,
          borderBottom: `1px solid var(--glass-border)`,
          gap: 10,
          overflow: 'hidden',
          color: 'inherit',
          textDecoration: 'none',
        }}
      >
        <PlayCircleOutlined aria-hidden="true" style={{ fontSize: 22, color: ACCENT, flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 17, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
            Movie<span style={{ color: ACCENT }}>Dash</span>
          </span>
        )}
      </Link>

      {/* Sider renders an <aside> and Menu is role="menu", so wrap it for a desktop nav landmark
          (BottomNav is already a <nav> on phones). */}
      <nav aria-label="Main">
        <Menu
          theme={isDark ? 'dark' : 'light'}
          selectedKeys={[path]}
          items={items}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: SPACING.sm,
          }}
        />
      </nav>

      <Button
        type="text"
        block
        icon={collapsed ? <MenuUnfoldOutlined aria-hidden="true" /> : <MenuFoldOutlined aria-hidden="true" />}
        onClick={() => onCollapse(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 48,
          borderRadius: 0,
          borderTop: '1px solid var(--glass-border)',
          color: 'var(--text-secondary)',
        }}
      />
    </Sider>
  );
};

export default Sidebar;
