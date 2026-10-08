## Context

See proposal.md, Why. Current state:
- `server/server.ts` has no static middleware and calls `app.listen(PORT)`, which binds to all interfaces.
- `helmet()` uses its defaults, so `img-src 'self' data:` would block `image.tmdb.org` posters once the SPA is served from Express.
- In dev, posters work only because Vite serves the HTML without that CSP.
- `vite.config.ts` hardcodes `host: true`.
- The CSV path already uses `process.cwd()` for compiled-vs-tsx portability. The `dist/` path should follow the same rule.

## Goals / Non-Goals

**Goals:** `npm run build && npm run build:server && npm run server:prod` gives a working app at `http://localhost:5000`. Dev isn't reachable from the LAN unless the developer asks for it.

**Non-Goals:**
- Docker images or platform-specific deploy configs.
- HTTPS termination (left to the reverse proxy).
- Authentication.

## Decisions

### 1. Static serving is enabled when `dist/index.html` exists
- Resolve `const distDir = path.join(process.cwd(), 'dist')`.
- If `dist/index.html` exists at boot, mount the static serving. In dev it doesn't run because Vite serves the app, and `dist/` from an old build may exist, so also require `NODE_ENV === 'production'`. `server:prod` sets that.
- Assets: `express.static(distDir, { index: false, setHeaders })`, with `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`. Everything else gets `no-cache`.
- Fallback: `app.get(/^(?!\/api\/).*/, sendFile(index.html))`, registered *after* the API routes. Unknown `/api/*` paths get a JSON 404 handler before the fallback.

*Alternative:* always serve `dist/` when present. Rejected because a stale local `dist/` would shadow nothing in dev (Vite owns :3000) but would confuse anyone hitting :5000 directly.

### 2. CSP
Configure helmet with these `contentSecurityPolicy.directives`:
- `img-src`: `'self'`, `data:` (POSTER_FALLBACK is a data URI), `https://image.tmdb.org`
- `style-src`: `'self'`, `'unsafe-inline'` (Ant Design v5 CSS-in-JS injects `<style>` tags)
- `script-src`: `'self'`
- `connect-src`: `'self'`

ChartBlock's PNG download uses `canvas.toDataURL` plus an anchor `download`, which CSP doesn't restrict.

Verify during implementation with a full click-through in the browser console. If Framer Motion or antd needs anything else, add it explicitly rather than turning CSP off.

### 3. Bind host
- Express: `const HOST = process.env.HOST ?? (process.env.DEV_LAN ? '0.0.0.0' : '127.0.0.1')`, then `app.listen(PORT, HOST)`.
  - Production deployments that need external access set `HOST=0.0.0.0` explicitly. This is safer by default, and the README says so.
- Vite: `server.host: process.env.DEV_LAN ? true : 'localhost'`.

In LAN mode, Vite's proxy target stays `localhost:5000`, which is correct because the proxy runs on the dev machine. Express itself doesn't need LAN exposure even in DEV_LAN mode, so the Express default stays `127.0.0.1` unless `HOST` is set. Simplified rule: **only Vite honours `DEV_LAN`, and Express honours only `HOST`.**

Setting env vars on Windows: `npm run dev:lan` uses `cross-env DEV_LAN=1 …` (one small devDependency). Alternatively, read `--host` from Vite's CLI (`vite --host`), which needs no dependency. **Choose `vite --host` in a `dev:lan` script**: zero dependencies, and Vite's CLI flag overrides the config.

### 4. Trust proxy
`if (process.env.TRUST_PROXY) app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY))`. The value accepts a hop count (`1`) or `true`. It is unset by default, because trusting `X-Forwarded-For` without a proxy lets clients spoof their IP and bypass the limit.

### 5. CORS
Same-origin production doesn't need CORS. Keep the existing `CLIENT_ORIGIN` behaviour, which is harmless and still useful for anyone who proxies differently.

## Risks / Trade-offs

- **A CSP that's too strict silently breaks some UI in production only.** Mitigation: a manual click-through under `server:prod` with the browser console open (task 2.2) before merging. No e2e run against `server:prod` — not worth a second Playwright config/CI job for one header policy.
- **Binding Express to `127.0.0.1` breaks an existing remote deployment on upgrade.** No such deployment exists ("local-first" per the README). Document `HOST=0.0.0.0` prominently.

## Migration Plan

No data migration is needed. Developers who relied on LAN access switch to `npm run dev:lan`.
