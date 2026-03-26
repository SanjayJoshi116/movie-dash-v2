import React from 'react';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';

ChartJS.register(MatrixController, MatrixElement);

export interface MatrixDataPoint {
  x: string;
  y: string;
  v: number;
}

interface MatrixChartProps {
  data: MatrixDataPoint[];
  xLabels: string[];
  yLabels: string[];
  height?: number;
}

const MatrixChart: React.FC<MatrixChartProps> = ({ data, xLabels, yLabels, height = 400 }) => {
  const maxVal = Math.max(...data.map(d => d.v), 1);

  const chartData = {
    datasets: [
      {
        label: 'Movies',
        data,
        backgroundColor: (ctx: any) => {
          const v = (ctx.raw as MatrixDataPoint)?.v ?? 0;
          const alpha = 0.1 + (v / maxVal) * 0.85;
          return `rgba(129, 140, 248, ${alpha})`;
        },
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        width: (ctx: any) => {
          const area = ctx.chart?.chartArea;
          return area ? (area.width / xLabels.length) - 2 : 30;
        },
        height: (ctx: any) => {
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
          title: (items: any[]) => {
            const raw = items[0]?.raw as MatrixDataPoint;
            return raw ? `${raw.y} — ${raw.x}` : '';
          },
          label: (item: any) => `Movies: ${(item.raw as MatrixDataPoint)?.v ?? 0}`,
        },
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        labels: xLabels,
        grid: { color: 'rgba(255,255,255,0.07)' },
        ticks: { color: 'rgba(255,255,255,0.7)' },
      },
      y: {
        type: 'category' as const,
        labels: yLabels,
        offset: true,
        grid: { color: 'rgba(255,255,255,0.07)' },
        ticks: { color: 'rgba(255,255,255,0.8)', font: { size: 11 } },
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
