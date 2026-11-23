import React, { useMemo } from 'react';
import { Grid } from 'antd';
import { Doughnut } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { useClickHandlers, type ClickProps } from './chartHelpers';
import { chartInk } from '../../utils/chartTheme';

// Chart.js caps a bottom legend at half the chart height and drops rows past that, so on phones
// (where the legend wraps to many rows) every doughnut uses the compact sizing.
const LEGEND_SIZES = {
  compact: { size: 11, padding: 8, boxWidth: 10 },
  normal: { size: 12, padding: 20, boxWidth: 40 },
} as const;

interface DoughnutChartProps extends ClickProps {
  data: ChartData<'doughnut'>;
  isDark?: boolean;
}

const DoughnutChart: React.FC<DoughnutChartProps> = ({ data, isDark = true, onElementClick, isClickable }) => {
  // Strictly false (defensive): an unknown breakpoint must not count as "narrow".
  const compact = Grid.useBreakpoint().md === false;
  const click = useClickHandlers({ onElementClick, isClickable });

  const options: ChartOptions<'doughnut'> = useMemo(() => {
    const { text: textColor } = chartInk(isDark);
    const { size, padding, boxWidth } = LEGEND_SIZES[compact ? 'compact' : 'normal'];

    return {
      responsive: true,
      maintainAspectRatio: false,
      ...click,
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
  }, [isDark, click, compact]);

  return <Doughnut data={data} options={options} />;
};

export default DoughnutChart;
