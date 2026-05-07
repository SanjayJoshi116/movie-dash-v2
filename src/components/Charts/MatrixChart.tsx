import React from 'react';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';

ChartJS.register(MatrixController, MatrixElement);

export interface MatrixDataPoint {
  x: string;
  y: string;
  v: number;
}

interface ScriptableCtx {
  raw: MatrixDataPoint;
  chart: { chartArea: { width: number; height: number } };
}

interface MatrixChartProps {
  data: MatrixDataPoint[];
  xLabels: string[];
  yLabels: string[];
  height?: number;
  isDark?: boolean;
}

const MatrixChart: React.FC<MatrixChartProps> = ({ data, xLabels, yLabels, height = 400, isDark = true }) => {
  const maxVal = Math.max(...data.map(d => d.v), 1);
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.14)';
  const tickColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,63,0.75)';
  const labelColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(129,140,248,0.25)';

  const chartData = {
    datasets: [
      {
        label: 'Movies',
        data,
        backgroundColor: (ctx: ScriptableCtx) => {
          const v = ctx.raw?.v ?? 0;
          const alpha = 0.1 + (v / maxVal) * 0.85;
          return `rgba(129, 140, 248, ${alpha})`;
        },
        borderColor,
        borderWidth: 1,
        width: (ctx: ScriptableCtx) => {
          const area = ctx.chart?.chartArea;
          return area ? (area.width / xLabels.length) - 2 : 30;
        },
        height: (ctx: ScriptableCtx) => {
          const area = ctx.chart?.chartArea;
          return area ? (area.height / yLabels.length) - 2 : 30;
        },
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<'matrix'>[]) => {
            const raw = items[0]?.raw as MatrixDataPoint;
            return raw ? `${raw.y} — ${raw.x}` : '';
          },
          label: (item: TooltipItem<'matrix'>) => `Movies: ${(item.raw as MatrixDataPoint)?.v ?? 0}`,
        },
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        labels: xLabels,
        grid: { color: gridColor },
        ticks: { color: tickColor },
      },
      y: {
        type: 'category' as const,
        labels: yLabels,
        offset: true,
        grid: { color: gridColor },
        ticks: { color: labelColor, font: { size: 11 } },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Chart type={'matrix' as any} data={chartData as any} options={options as any} />
    </div>
  );
};

export default MatrixChart;
