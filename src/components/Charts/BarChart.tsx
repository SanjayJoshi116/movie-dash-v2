import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface BarChartProps {
  data: ChartData<'bar'>;
  isDark?: boolean;
  onElementClick?: (index: number) => void;
  /** Elements for which this returns false (e.g. "Other"/"Unknown") get no pointer cursor and no click. */
  isClickable?: (index: number) => boolean;
}

const BarChart: React.FC<BarChartProps> = ({ data, isDark = true, onElementClick, isClickable }) => {
  const options: ChartOptions<'bar'> = useMemo(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.14)';
    const tickColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,63,0.75)';

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
  }, [isDark, onElementClick, isClickable]);

  return <Bar data={data} options={options} />;
};

export default BarChart;
