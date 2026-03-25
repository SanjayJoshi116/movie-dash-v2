import React from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface LineChartProps {
  data: ChartData<'line'>;
}

const lineOptions: ChartOptions<'line'> = {
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
      grid: { color: 'rgba(255,255,255,0.07)' },
      ticks: { color: 'rgba(255,255,255,0.7)' },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.07)' },
      ticks: { color: 'rgba(255,255,255,0.7)' },
    },
  },
  elements: {
    line: { tension: 0.4 },
    point: { radius: 3, hoverRadius: 6 },
  },
};

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  return <Line data={data} options={lineOptions} />;
};

export default LineChart;
