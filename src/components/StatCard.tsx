import React from 'react';
import { Card, Statistic } from 'antd';
import { motion } from 'framer-motion';

const MotionCard = motion(Card);

interface StatCardProps {
  label: string;
  value: number | string;
  color?: string;
  suffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color = '#818cf8', suffix }) => {
  return (
    <MotionCard
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-panel"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      <Statistic
        title={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>}
        value={value}
        suffix={suffix ? <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{suffix}</span> : undefined}
        valueStyle={{ color, fontWeight: 700, fontSize: 28 }}
      />
    </MotionCard>
  );
};

export default StatCard;
