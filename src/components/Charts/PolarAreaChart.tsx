import React from 'react';
import { PolarArea } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface PolarAreaChartProps {
  data: ChartData<'polarArea'>;
}

const polarOptions: ChartOptions<'polarArea'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: 'rgba(255,255,255,0.8)',
        font: { family: 'Segoe UI', size: 11 },
        padding: 16,
        boxWidth: 12,
      },
    },
  },
  scales: {
    r: {
      grid: { color: 'rgba(255,255,255,0.1)' },
      ticks: {
        color: 'rgba(255,255,255,0.5)',
        backdropColor: 'transparent',
        font: { size: 10 },
      },
    },
  },
};

const PolarAreaChart: React.FC<PolarAreaChartProps> = ({ data }) => {
  return <PolarArea data={data} options={polarOptions} />;
};

export default PolarAreaChart;
