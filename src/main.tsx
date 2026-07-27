import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Chart as ChartJS,
  BarController,
  LineController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import App from './App';

ChartJS.register(
  BarController,
  LineController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler
);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
