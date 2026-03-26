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
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Statistic
        title={<span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{label}</span>}
        value={value}
        suffix={suffix ? <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{suffix}</span> : undefined}
        valueStyle={{ color, fontWeight: 700, fontSize: 28 }}
      />
    </MotionCard>
  );
};

export default StatCard;
