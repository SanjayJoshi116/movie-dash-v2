import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface DoughnutChartProps {
  data: ChartData<'doughnut'>;
  isDark?: boolean;
  onElementClick?: (index: number) => void;
  /** Elements for which this returns false (e.g. "Other"/"Unknown") get no pointer cursor and no click. */
  isClickable?: (index: number) => boolean;
}

const DoughnutChart: React.FC<DoughnutChartProps> = ({ data, isDark = true, onElementClick, isClickable }) => {
  const options: ChartOptions<'doughnut'> = useMemo(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,63,0.85)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      onClick: onElementClick
        ? (_evt, elements) => { if (elements.length && (isClickable?.(elements[0].index) ?? true)) onElementClick(elements[0].index); }
        : undefined,
      onHover: onElementClick
        ? (evt, elements) => { (evt.native?.target as HTMLElement)?.style.setProperty('cursor', elements.length && (isClickable?.(elements[0].index) ?? true) ? 'pointer' : 'default'); }
        : undefined,
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
  }, [isDark, onElementClick, isClickable]);

  return <Doughnut data={data} options={options} />;
};

export default DoughnutChart;
