import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// antd components used on EVERY route: the app shell (App, Sidebar, TopBar, LoadingError,
// ErrorBoundary) plus Typography/Card, which Dashboard, Movies and Stats all import. Naming a
// component's public entry module here makes Rolldown move it *and its tree-shaken dependency
// closure* (rc-* helpers etc. not already in vendor-antd-core) into vendor-antd-shell, which keeps
// the entry chunk under the 500 kB limit without listing antd internals. Only add components every
// route loads: anything else here would be forced onto the landing page (scripts/check-bundle.mjs
// guards it).
const ANTD_EVERY_ROUTE = new RegExp(
  '[\\\\/]node_modules[\\\\/]antd[\\\\/]es[\\\\/](' +
    ['layout', 'menu', 'button', 'result', 'spin', 'grid', 'badge', 'tooltip',
      'alert', 'skeleton', 'typography', 'card'].join('|') +
    ')[\\\\/]index\\.js$',
)

export default defineConfig({
  plugins: [react()],
  server: {
    // localhost only: the /api proxy fronts an API with no auth. `npm run dev:lan` (vite --host)
    // opts in to LAN access for the web app; the API itself stays on loopback either way.
    host: 'localhost',
    port: 3000,
    proxy: {
      '/api': {
        // 127.0.0.1, not localhost: Node may resolve localhost to ::1 first, missing the IPv4-only API.
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // dist/.vite/manifest.json feeds scripts/check-bundle.mjs (landing-route budget).
    manifest: true,
    // Same 500 kB limit check-bundle.mjs enforces, so the Vite warning and the script agree.
    chunkSizeWarningLimit: 500,
    rolldownOptions: {
      output: {
        // React and Chart.js get stable vendor chunks (long-term caching). antd as a whole is
        // deliberately NOT force-chunked: the old single vendor-antd chunk shipped every component
        // (Table, Drawer, Slider, Modal...) on the Dashboard and defeated antd's per-component
        // tree-shaking + the lazy Movies/Stats routes. Anything no group captures is left to
        // Rolldown's automatic splitting, which puts it in the route chunk that uses it.
        //
        // Each group also captures its matched modules' dependency closure (Rolldown's default,
        // like Rollup's manualChunks). A module two groups could claim goes to the higher
        // `priority`, so the chunk graph stays react <- core <- shell with no cycles.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', priority: 4, test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
            { name: 'vendor-charts', priority: 3, test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|chartjs-chart-matrix|@kurkle[\\/]color)[\\/]/ },
            { name: 'vendor-antd-core', priority: 2, test: /[\\/]node_modules[\\/]antd[\\/]es[\\/]config-provider[\\/]index\.js$/ },
            { name: 'vendor-antd-shell', priority: 1, test: ANTD_EVERY_ROUTE },
          ],
        },
      },
    },
  },
})
