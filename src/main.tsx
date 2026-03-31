import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import { Chart as ChartJS, registerables } from 'chart.js';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import App from './App';

ChartJS.register(...registerables);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary:     '#818cf8',
            colorInfo:        '#818cf8',
            colorSuccess:     '#34d399',
            colorWarning:     '#fbbf24',
            colorError:       '#f87171',
            colorBgBase:      '#0d0d1a',
            colorBgContainer: '#1a1030',
            colorBgElevated:  '#2d1b69',
            colorBorder:      'rgba(255, 255, 255, 0.12)',
            borderRadius:     12,
            fontFamily:       'Segoe UI, Roboto, sans-serif',
          },
          components: {
            Menu: {
              darkItemSelectedBg:    'rgba(129, 140, 248, 0.12)',
              darkItemSelectedColor: '#818cf8',
            },
            Tabs: {
              inkBarColor:      '#818cf8',
              itemActiveColor:  '#818cf8',
              itemSelectedColor:'#818cf8',
            },
            Drawer: {
              colorBgElevated: '#1a1030',
            },
          },
        }}
      >
        <App />
      </ConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
