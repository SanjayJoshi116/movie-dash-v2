import React, { useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';

interface ScatterChartProps {
  data: ChartData<'scatter'>;
  isDark?: boolean;
  xLabel?: string;
  yLabel?: string;
  pointLabels?: string[];
}

const ScatterChart: React.FC<ScatterChartProps> = ({ data, isDark = true, xLabel, yLabel, pointLabels }) => {
  const options: ChartOptions<'scatter'> = useMemo(() => {
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.14)';
    const tickColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,63,0.75)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'scatter'>) => {
              const name = pointLabels?.[ctx.dataIndex];
              const { x, y } = ctx.parsed;
              return name ? `${name}: ${x.toLocaleString()} votes, ${y.toFixed(1)}/10` : `${x.toLocaleString()}, ${y.toFixed(1)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: xLabel ? { display: true, text: xLabel, color: tickColor } : undefined,
          grid: { color: gridColor },
          ticks: { color: tickColor },
        },
        y: {
          title: yLabel ? { display: true, text: yLabel, color: tickColor } : undefined,
          grid: { color: gridColor },
          ticks: { color: tickColor },
        },
      },
    };
  }, [isDark, xLabel, yLabel, pointLabels]);

  return <Scatter data={data} options={options} />;
};

export default ScatterChart;
