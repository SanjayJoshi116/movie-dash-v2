## Why

The production setup the README describes doesn't work, and the dev setup exposes destructive routes to the local network (audit findings S5, S10, S16 and the README drift in `docs/audit-findings-2026-10-08.md`):
- `npm run server:prod` serves only `/api`.
- The built frontend calls a relative `/api`, so the README's "deploy `dist/` to Vercel/Netlify" leaves an app with no data.
- In dev, Vite's `host: true` plus its `/api` proxy lets anyone on the same Wi-Fi call the unauthenticated `DELETE /api/movies/:id`.

## What Changes

- **One production process.** `server:prod` serves the built SPA from `dist/` as well as `/api`, on a single port:
  - an index fallback for client routes like `/movies` and `/stats?tab=…`
  - long-lived caching for hashed assets, and no caching for `index.html`
- **Security headers.** The Content-Security-Policy allows what the SPA actually loads: TMDB poster images (`image.tmdb.org`) and Ant Design's runtime styles. Otherwise posters are blocked in production.
- **Localhost by default.** Vite and Express bind to localhost. A single opt-in env flag (`DEV_LAN=1`) re-enables LAN access, for example to test the mobile layout on a phone. Express also takes a `HOST` override for deployment.
- **Proxy-aware rate limiting.** A configurable `TRUST_PROXY` setting means a reverse proxy doesn't collapse all clients into one rate-limit bucket.
- **Single start command.** Add `npm start` (build both, then serve) or document the two-step `build` + `build:server` + `server:prod` sequence.
- **Docs.**
  - Rewrite the README's Deployment section for the single-process model.
  - Fix the stated Node version to match `engines` (`>=22.22.0`).
  - List `TMDB_API_KEY`, `HOST`, `DEV_LAN` and `TRUST_PROXY`.
  - Fix the `/movies` → `/api/movies` route name.
  - Remove the dead "Live Demo note" anchor.
- **Leftover file.** Remove the unused CRA-era `public/index.html` (Vite uses the root `index.html`).

Out of scope: user authentication or accounts. Split static/API hosting via a `VITE_API_URL` was considered and not chosen.

## Capabilities

### New Capabilities
- `app-hosting`: how the application is served in development and production, which network interfaces it's reachable on, and the HTTP-level behaviour of the served SPA (routing fallback, caching, security headers).

### Modified Capabilities
<!-- None -->

## Impact

- `server/server.ts`: static serving, SPA fallback, helmet CSP config, bind host, `trust proxy`.
- `vite.config.ts`: `server.host` driven by `DEV_LAN`.
- `package.json`: `start` script; possibly `cross-env`, or a tiny Node launcher for setting env on Windows.
- `README.md`, `CLAUDE.md`, `.env.example`: deployment and env documentation.
- `public/index.html`: deleted.
