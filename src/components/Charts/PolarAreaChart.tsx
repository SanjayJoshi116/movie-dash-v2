import React, { useMemo } from 'react';
import { PolarArea } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface PolarAreaChartProps {
  data: ChartData<'polarArea'>;
  isDark?: boolean;
  onElementClick?: (index: number) => void;
}

const PolarAreaChart: React.FC<PolarAreaChartProps> = ({ data, isDark = true, onElementClick }) => {
  const options: ChartOptions<'polarArea'> = useMemo(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.14)';
    const tickColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(30,30,63,0.7)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      onClick: onElementClick
        ? (_evt, elements) => { if (elements.length) onElementClick(elements[0].index); }
        : undefined,
      onHover: onElementClick
        ? (evt, elements) => { (evt.native?.target as HTMLElement)?.style.setProperty('cursor', elements.length ? 'pointer' : 'default'); }
        : undefined,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: textColor,
            font: { family: 'Segoe UI', size: 11 },
            padding: 16,
            boxWidth: 12,
          },
        },
      },
      scales: {
        r: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            backdropColor: 'transparent',
            font: { size: 10 },
          },
        },
      },
    };
  }, [isDark, onElementClick]);

  return <PolarArea data={data} options={options} />;
};

export default PolarAreaChart;
