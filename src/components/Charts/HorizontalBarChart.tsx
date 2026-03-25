import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface HorizontalBarChartProps {
  data: ChartData<'bar'>;
  /** Height of the chart container in px. Defaults to 400. */
  height?: number;
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, height = 400 }) => {
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${typeof ctx.raw === 'number' ? ctx.raw.toFixed(2) : ctx.raw}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.07)' },
        ticks: { color: 'rgba(255,255,255,0.7)' },
      },
      y: {
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.8)', font: { size: 11 } },
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
