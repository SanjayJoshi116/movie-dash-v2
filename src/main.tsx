import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Chart as ChartJS,
  BarController,
  LineController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  ScatterController,
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
  ScatterController,
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
    {/* Outermost boundary: it sits outside the router, theme and providers, so re-rendering the same
        tree would just crash again. "Try Again" reloads the page instead, and its promise never
        settles so the error view stays up until the page unloads (no re-render of the crashed tree). */}
    <ErrorBoundary onReset={() => { window.location.reload(); return new Promise<never>(() => {}); }}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
