import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface DoughnutChartProps {
  data: ChartData<'doughnut'>;
  isDark?: boolean;
}

const DoughnutChart: React.FC<DoughnutChartProps> = ({ data, isDark = true }) => {
  const options: ChartOptions<'doughnut'> = useMemo(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';

    return {
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
    };
  }, [isDark]);

  return <Doughnut data={data} options={options} />;
};

export default DoughnutChart;
