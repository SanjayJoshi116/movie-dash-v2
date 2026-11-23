import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { useLatest } from '../../hooks/useLatest';
import { formatNumber, useClickHandlers, type ClickProps } from './chartHelpers';
import { chartInk } from '../../utils/chartTheme';

interface HorizontalBarChartProps extends ClickProps {
  data: ChartData<'bar'>;
  height?: number;
  isDark?: boolean;
  formatValue?: (n: number) => string;
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, height = 400, isDark = true, formatValue, onElementClick, isClickable }) => {
  const click = useClickHandlers({ onElementClick, isClickable });
  // Read at event time, so the options memo doesn't depend on the caller's function identity (B13).
  const latest = useLatest({ formatValue });
  const hasFormat = formatValue !== undefined;
  const options: ChartOptions<'bar'> = useMemo(() => {
    const { grid: gridColor, tick: tickColor, text: labelColor } = chartInk(isDark);

    return {
      indexAxis: 'y' as const,
      responsive: true,
      maintainAspectRatio: false,
      ...click,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const format = latest.current.formatValue;
              // A null/non-number value shows "—" instead of throwing inside the callback.
              if (format && typeof ctx.raw === 'number') return ` ${format(ctx.raw)}`;
              return ` ${formatNumber(ctx.raw)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            ...(hasFormat ? { callback: (value) => latest.current.formatValue?.(Number(value)) ?? String(value) } : {}),
          },
        },
        y: {
          grid: { display: false },
          ticks: { color: labelColor, font: { size: 11 } },
        },
      },
    };
  }, [isDark, click, hasFormat, latest]);

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default HorizontalBarChart;
