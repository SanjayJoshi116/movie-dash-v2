import React, { useEffect, useRef, useState } from 'react';
import { Typography, Button, Tooltip } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getCardStyle } from '../../utils/chartTheme';

const { Title } = Typography;

interface ChartBlockProps {
  title: string;
  height?: number;
  isDark: boolean;
  children: React.ReactNode;
}

const slugify = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chart';

const ChartBlock: React.FC<ChartBlockProps> = ({ title, height, isDark, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasCanvas, setHasCanvas] = useState(false);

  useEffect(() => {
    setHasCanvas(!!containerRef.current?.querySelector('canvas'));
  }, [children]);

  const handleExport = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${slugify(title)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{ ...getCardStyle(isDark), padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={5} style={{ color: 'var(--text-primary)', margin: 0 }}>{title}</Title>
        {hasCanvas && (
          <Tooltip title="Download chart as PNG">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              aria-label={`Download ${title} as PNG`}
              onClick={handleExport}
            />
          </Tooltip>
        )}
      </div>
      <div ref={containerRef} style={height !== undefined ? { height } : {}}>{children}</div>
    </div>
  );
};

export default ChartBlock;
