import React, { useMemo } from 'react';
import { Grid } from 'antd';
import { Doughnut } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

// Chart.js caps a bottom legend at half the chart height and drops rows past that, so on phones
// (where the legend wraps to many rows) every doughnut uses the compact sizing.
const LEGEND_SIZES = {
  compact: { size: 11, padding: 8, boxWidth: 10 },
  normal: { size: 12, padding: 20, boxWidth: 40 },
} as const;

interface DoughnutChartProps {
  data: ChartData<'doughnut'>;
  isDark?: boolean;
  onElementClick?: (index: number) => void;
  /** Elements for which this returns false (e.g. "Other"/"Unknown") get no pointer cursor and no click. */
  isClickable?: (index: number) => boolean;
}

const DoughnutChart: React.FC<DoughnutChartProps> = ({ data, isDark = true, onElementClick, isClickable }) => {
  // Strictly false: useBreakpoint() is {} on the first render, which must not count as "narrow".
  const compact = Grid.useBreakpoint().md === false;

  const options: ChartOptions<'doughnut'> = useMemo(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';
    const { size, padding, boxWidth } = LEGEND_SIZES[compact ? 'compact' : 'normal'];

    return {
      responsive: true,
      maintainAspectRatio: false,
      onClick: onElementClick
        ? (_evt, elements) => { if (elements.length && (isClickable?.(elements[0].index) ?? true)) onElementClick(elements[0].index); }
        : undefined,
      onHover: onElementClick
        ? (evt, elements) => { (evt.native?.target as HTMLElement)?.style.setProperty('cursor', elements.length && (isClickable?.(elements[0].index) ?? true) ? 'pointer' : 'default'); }
        : undefined,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: textColor,
            font: { family: 'Segoe UI', size },
            padding,
            boxWidth,
          },
        },
      },
    };
  }, [isDark, onElementClick, isClickable, compact]);

  return <Doughnut data={data} options={options} />;
};

export default DoughnutChart;
