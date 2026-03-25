import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface BarChartProps {
  data: ChartData<'bar'>;
}

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: 'rgba(255,255,255,0.8)',
        font: { family: 'Segoe UI', size: 12 },
        padding: 20,
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.1)' },
      ticks: { color: 'rgba(255,255,255,0.7)' },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.1)' },
      ticks: { color: 'rgba(255,255,255,0.7)' },
    },
  },
};

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  return <Bar data={data} options={barOptions} />;
};

export default BarChart;
