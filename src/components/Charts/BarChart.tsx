import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { useClickHandlers, type ClickProps } from './chartHelpers';
import { chartInk } from '../../utils/chartTheme';

interface BarChartProps extends ClickProps {
  data: ChartData<'bar'>;
  isDark?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({ data, isDark = true, onElementClick, isClickable }) => {
  const click = useClickHandlers({ onElementClick, isClickable });
  // A legend with one entry only lets the user hide all the data (B142).
  const multiSeries = data.datasets.length > 1;

  const options: ChartOptions<'bar'> = useMemo(() => {
    const { text: textColor, gridStrong: gridColor, tick: tickColor } = chartInk(isDark);

    return {
      responsive: true,
      maintainAspectRatio: false,
      ...click,
      plugins: {
        legend: {
          display: multiSeries,
          position: 'bottom' as const,
          labels: {
            color: textColor,
            font: { family: 'Segoe UI', size: 12 },
            padding: 20,
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor },
        },
      },
    };
  }, [isDark, click, multiSeries]);

  return <Bar data={data} options={options} />;
};

export default BarChart;
