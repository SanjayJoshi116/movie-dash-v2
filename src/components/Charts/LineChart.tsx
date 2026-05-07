import React from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface LineChartProps {
  data: ChartData<'line'>;
  isDark?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({ data, isDark = true }) => {
  const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.14)';
  const tickColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,63,0.75)';

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
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

  return <Line data={data} options={options} />;
};

export default LineChart;
