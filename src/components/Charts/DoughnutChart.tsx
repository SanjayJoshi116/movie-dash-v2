import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface DoughnutChartProps {
  data: ChartData<'doughnut'>;
}

const doughnutOptions: ChartOptions<'doughnut'> = {
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
};

const DoughnutChart: React.FC<DoughnutChartProps> = ({ data }) => {
  return <Doughnut data={data} options={doughnutOptions} />;
};

export default DoughnutChart;
