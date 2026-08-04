import React from 'react';
import { Card, Statistic } from 'antd';
import { motion } from 'framer-motion';
import { SPACING, FONT_SIZE } from '../utils/chartTheme';

const MotionCard = motion(Card);

interface StatCardProps {
  label: string;
  value: number | string;
  color?: string;
  suffix?: string;
  icon?: React.ReactNode;
  hero?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color = '#818cf8', suffix, icon, hero, onClick }) => {
  return (
    <MotionCard
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-panel"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${label}: view details` : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      } : undefined}
      style={{
        background: hero ? `linear-gradient(135deg, ${color}14, var(--glass-bg))` : 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: hero ? `1px solid ${color}33` : '1px solid var(--glass-border)',
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        boxShadow: 'var(--glass-shadow)',
        height: '100%',
        cursor: onClick ? 'pointer' : undefined,
      }}
      styles={{ body: { display: 'flex', alignItems: 'center', gap: SPACING.lg } }}
    >
      {icon && (
        <span style={{ fontSize: hero ? FONT_SIZE.hero : FONT_SIZE.value, color, opacity: 0.85, flexShrink: 0 }}>{icon}</span>
      )}
      <Statistic
        title={<span style={{ color: 'var(--text-secondary)', fontSize: hero ? FONT_SIZE.body : FONT_SIZE.label }}>{label}</span>}
        value={value}
        suffix={suffix ? <span style={{ fontSize: hero ? 16 : FONT_SIZE.body, color: 'var(--text-muted)' }}>{suffix}</span> : undefined}
        valueStyle={{ color, fontWeight: 700, fontSize: hero ? FONT_SIZE.hero : FONT_SIZE.value }}
      />
    </MotionCard>
  );
};

export default StatCard;
