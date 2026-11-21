import React, { useMemo } from 'react';
import { PolarArea } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { useClickHandlers, type ClickProps } from './chartHelpers';

interface PolarAreaChartProps extends ClickProps {
  data: ChartData<'polarArea'>;
  isDark?: boolean;
}

const PolarAreaChart: React.FC<PolarAreaChartProps> = ({ data, isDark = true, onElementClick, isClickable }) => {
  const click = useClickHandlers({ onElementClick, isClickable });
  const options: ChartOptions<'polarArea'> = useMemo(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.14)';
    const tickColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(30,30,63,0.7)';

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
