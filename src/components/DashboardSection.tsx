import React from 'react';
import { Typography } from 'antd';
import { SPACING } from '../utils/chartTheme';

const { Title } = Typography;

interface DashboardSectionProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ title, action, children }) => (
  <section style={{ marginBottom: 32 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg, flexWrap: 'wrap', gap: SPACING.sm }}>
      {/* h4 under the page's h3; fontSize keeps antd's h5 size so the look is unchanged. */}
      <Title level={4} style={{ color: 'var(--text-primary)', margin: 0, fontSize: 16 }}>{title}</Title>
      {action}
    </div>
    {children}
  </section>
);

export default DashboardSection;
