import React from 'react';
import { Button, Empty } from 'antd';
import { getCardStyle, SPACING } from '../utils/chartTheme';

interface EmptyStateProps {
  description: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  isDark: boolean;
}

/** A glass card with an antd `Empty` and one primary action — the empty catalogue / empty range states. */
const EmptyState: React.FC<EmptyStateProps> = ({ description, actionLabel, onAction, isDark }) => (
  <div style={{ ...getCardStyle(isDark), padding: `48px ${SPACING.xxl}px` }}>
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description}>
      <Button type="primary" onClick={onAction}>{actionLabel}</Button>
    </Empty>
  </div>
);

export default EmptyState;
