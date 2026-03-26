import React from 'react';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';

ChartJS.register(TreemapController, TreemapElement);

const PALETTE = [
  '#818cf8', '#e879f9', '#38bdf8', '#34d399', '#f472b6',
  '#fb923c', '#fbbf24', '#a3e635', '#22d3ee', '#f87171',
  '#4ade80', '#facc15', '#60a5fa', '#c084fc', '#fb7185',
  '#6ee7b7', '#93c5fd', '#d8b4fe', '#fca5a5', '#fdba74',
];

export interface TreemapDataPoint {
  label: string;
  value: number;
}

interface TreemapChartProps {
  data: TreemapDataPoint[];
  height?: number;
}

const TreemapChart: React.FC<TreemapChartProps> = ({ data, height = 400 }) => {
  const chartData = {
    datasets: [
      {
        label: 'Genre Distribution',
        tree: data.map(d => d.value),
        key: 'v',
        data: data.map((d, i) => ({ x: 0, y: 0, v: d.value, label: d.label, _idx: i })),
        labels: {
          display: true,
          formatter: (ctx: any) => {
            const raw = ctx.raw as any;
            return raw?.label ?? '';
          },
          color: '#fff',
          font: { size: 12, weight: 'bold' as const },
        },
        backgroundColor: (ctx: any) =>
          PALETTE[(ctx.dataIndex ?? 0) % PALETTE.length] + 'cc',
        borderColor: (ctx: any) =>
          PALETTE[(ctx.dataIndex ?? 0) % PALETTE.length],
        borderWidth: 1,
        spacing: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: any[]) => (items[0]?.raw as any)?.label ?? '',
          label: (item: any) => `Count: ${(item.raw as any)?.v ?? 0}`,
        },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Chart type={'treemap' as any} data={chartData as any} options={options as any} />
    </div>
  );
};

export default TreemapChart;
