import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { useClickHandlers, type ClickProps } from './chartHelpers';

interface LineChartProps extends ClickProps {
  data: ChartData<'line'>;
  isDark?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({ data, isDark = true, onElementClick, isClickable }) => {
  const click = useClickHandlers({ onElementClick, isClickable });
  // A legend with one entry only lets the user hide all the data (B142).
  const multiSeries = data.datasets.length > 1;

  const options: ChartOptions<'line'> = useMemo(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.14)';
    const tickColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,63,0.75)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      // Hovering anywhere over a year's column targets that year, instead of an 8 px circle
      // around the point (B139). onClick/onHover get the same element list, so cursor = click.
      interaction: { mode: 'index' as const, intersect: false },
      ...click,
      plugins: {
        legend: {
          display: multiSeries,
          position: 'bottom' as const,
          labels: {
            color: textColor,
            font: { family: 'Segoe UI', size: 12 },
            padding: 20,
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor },
        },
      },
      elements: {
        // Monotone: smooth, but never above or below neighbouring points (B140).
        line: { tension: 0.4, cubicInterpolationMode: 'monotone' as const },
        point: { radius: 3, hoverRadius: 6 },
      },
    };
  }, [isDark, click, multiSeries]);

  return <Line data={data} options={options} />;
};

export default LineChart;
