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

const StatCard: React.FC<StatCardProps> = ({ label, value, color = '#38bdf8', suffix }) => {
  return (
    <MotionCard
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        background: 'linear-gradient(135deg, #2d3748 0%, #1e293b 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
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
