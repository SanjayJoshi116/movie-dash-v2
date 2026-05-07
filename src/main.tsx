import React from 'react';
import ReactDOM from 'react-dom/client';
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
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
