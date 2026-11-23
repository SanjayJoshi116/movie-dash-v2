import React, { useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { formatNumber } from './chartHelpers';
import { chartInk } from '../../utils/chartTheme';

interface ScatterChartProps {
  data: ChartData<'scatter'>;
  isDark?: boolean;
  xLabel?: string;
  yLabel?: string;
  /** Tooltip name per point, indexed by `dataIndex` of the (single) dataset. */
  pointLabels?: string[];
}

const ScatterChart: React.FC<ScatterChartProps> = ({ data, isDark = true, xLabel, yLabel, pointLabels }) => {
  const options: ChartOptions<'scatter'> = useMemo(() => {
    const { grid: gridColor, tick: tickColor } = chartInk(isDark);

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
              // Named by the chart's own axis labels, not hardcoded units (B141).
              const values = `${xLabel ?? 'x'} ${formatNumber(x)} · ${yLabel ?? 'y'} ${formatNumber(y)}`;
              return name ? `${name}: ${values}` : values;
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
