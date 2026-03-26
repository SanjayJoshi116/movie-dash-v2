import React from 'react';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, BarChartOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';

const { Sider } = Layout;

const ACCENT = '#818cf8';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const location = useLocation();

  const items: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
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
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        minHeight: '100vh',
        borderRight: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
      theme="dark"
    >
      {/* Logo */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px',
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          gap: 10,
          overflow: 'hidden',
        }}
      >
        <PlayCircleOutlined style={{ fontSize: 22, color: ACCENT, flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
            Movie<span style={{ color: ACCENT }}>Dash</span>
          </span>
        )}
      </div>

      <Menu
        theme="dark"
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
