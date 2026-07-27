import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface LineChartProps {
  data: ChartData<'line'>;
  isDark?: boolean;
  onElementClick?: (index: number) => void;
}

const LineChart: React.FC<LineChartProps> = ({ data, isDark = true, onElementClick }) => {
  const options: ChartOptions<'line'> = useMemo(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.14)';
    const tickColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,63,0.75)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      onClick: onElementClick
        ? (_evt, elements) => { if (elements.length) onElementClick(elements[0].index); }
        : undefined,
      onHover: onElementClick
        ? (evt, elements) => { (evt.native?.target as HTMLElement)?.style.setProperty('cursor', elements.length ? 'pointer' : 'default'); }
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
      elements: {
        line: { tension: 0.4 },
        point: { radius: 3, hoverRadius: 6 },
      },
    };
  }, [isDark, onElementClick]);

  return <Line data={data} options={options} />;
};

export default LineChart;
