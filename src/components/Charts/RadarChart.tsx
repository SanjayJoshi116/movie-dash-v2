import React, { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { chartInk } from '../../utils/chartTheme';

interface RadarChartProps {
  data: ChartData<'radar'>;
  isDark?: boolean;
}

const RadarChart: React.FC<RadarChartProps> = ({ data, isDark = true }) => {
  const options: ChartOptions<'radar'> = useMemo(() => {
    const { text: textColor, gridStrong: gridColor, angle: angleColor, tickMuted: tickColor } = chartInk(isDark);

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
  }, [isDark]);

  return <Radar data={data} options={options} />;
};

export default RadarChart;
