import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface HorizontalBarChartProps {
  data: ChartData<'bar'>;
  height?: number;
  isDark?: boolean;
  formatValue?: (n: number) => string;
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, height = 400, isDark = true, formatValue }) => {
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.14)';
  const tickColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,63,0.75)';
  const labelColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const raw = ctx.raw as number;
            if (formatValue) return ` ${formatValue(raw)}`;
            return ` ${typeof raw === 'number' ? raw.toFixed(2) : raw}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: {
          color: tickColor,
          ...(formatValue ? { callback: (value) => formatValue(value as number) } : {}),
        },
      },
      y: {
        grid: { display: false },
        ticks: { color: labelColor, font: { size: 11 } },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default HorizontalBarChart;
