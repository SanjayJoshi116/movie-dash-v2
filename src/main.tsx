import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <App />
      </ConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
