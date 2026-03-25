import React from 'react';
import { Radar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface RadarChartProps {
  data: ChartData<'radar'>;
}

const radarOptions: ChartOptions<'radar'> = {
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
    r: {
      grid: { color: 'rgba(255,255,255,0.1)' },
      angleLines: { color: 'rgba(255,255,255,0.15)' },
      pointLabels: { color: 'rgba(255,255,255,0.8)', font: { size: 11 } },
      ticks: {
        color: 'rgba(255,255,255,0.5)',
        backdropColor: 'transparent',
        font: { size: 10 },
      },
    },
  },
};

const RadarChart: React.FC<RadarChartProps> = ({ data }) => {
  return <Radar data={data} options={radarOptions} />;
};

export default RadarChart;
