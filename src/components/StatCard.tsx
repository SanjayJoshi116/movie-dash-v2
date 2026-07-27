import React from 'react';
import { Card, Statistic } from 'antd';
import { motion } from 'framer-motion';

const MotionCard = motion(Card);

interface StatCardProps {
  label: string;
  value: number | string;
  color?: string;
  suffix?: string;
  icon?: React.ReactNode;
  hero?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color = '#818cf8', suffix, icon, hero }) => {
  return (
    <MotionCard
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-panel"
      style={{
        background: hero ? `linear-gradient(135deg, ${color}26, var(--glass-bg))` : 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: hero ? `1px solid ${color}55` : '1px solid var(--glass-border)',
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        boxShadow: 'var(--glass-shadow)',
        height: '100%',
      }}
      styles={{ body: { display: 'flex', alignItems: 'center', gap: 16 } }}
    >
      {icon && (
        <span style={{ fontSize: hero ? 40 : 28, color, opacity: 0.85, flexShrink: 0 }}>{icon}</span>
      )}
      <Statistic
        title={<span style={{ color: 'var(--text-secondary)', fontSize: hero ? 14 : 13 }}>{label}</span>}
        value={value}
        suffix={suffix ? <span style={{ fontSize: hero ? 16 : 14, color: 'var(--text-muted)' }}>{suffix}</span> : undefined}
        valueStyle={{ color, fontWeight: 700, fontSize: hero ? 40 : 28 }}
      />
    </MotionCard>
  );
};

export default StatCard;
