import React from 'react';
import { Radar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface RadarChartProps {
  data: ChartData<'radar'>;
  isDark?: boolean;
}

const RadarChart: React.FC<RadarChartProps> = ({ data, isDark = true }) => {
  const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.14)';
  const angleColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)';
  const tickColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(30,30,63,0.7)';

  const options: ChartOptions<'radar'> = {
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
      r: {
        grid: { color: gridColor },
        angleLines: { color: angleColor },
        pointLabels: { color: textColor, font: { size: 11 } },
        ticks: {
          color: tickColor,
          backdropColor: 'transparent',
          font: { size: 10 },
        },
      },
    },
  };

  return <Radar data={data} options={options} />;
};

export default RadarChart;
