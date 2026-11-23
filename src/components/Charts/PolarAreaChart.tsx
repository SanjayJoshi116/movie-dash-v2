import React, { useMemo } from 'react';
import { PolarArea } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { useClickHandlers, type ClickProps } from './chartHelpers';
import { chartInk } from '../../utils/chartTheme';

interface PolarAreaChartProps extends ClickProps {
  data: ChartData<'polarArea'>;
  isDark?: boolean;
}

const PolarAreaChart: React.FC<PolarAreaChartProps> = ({ data, isDark = true, onElementClick, isClickable }) => {
  const click = useClickHandlers({ onElementClick, isClickable });
  const options: ChartOptions<'polarArea'> = useMemo(() => {
    const { text: textColor, gridStrong: gridColor, tickMuted: tickColor } = chartInk(isDark);

    return {
      responsive: true,
      maintainAspectRatio: false,
      ...click,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: textColor,
            font: { family: 'Segoe UI', size: 11 },
            padding: 16,
            boxWidth: 12,
          },
        },
      },
      scales: {
        r: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            backdropColor: 'transparent',
            font: { size: 10 },
          },
        },
      },
    };
  }, [isDark, click]);

  return <PolarArea data={data} options={options} />;
};

export default PolarAreaChart;
