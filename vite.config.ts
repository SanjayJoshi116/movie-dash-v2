import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-charts': ['chart.js', 'react-chartjs-2', 'chartjs-chart-matrix'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
})
