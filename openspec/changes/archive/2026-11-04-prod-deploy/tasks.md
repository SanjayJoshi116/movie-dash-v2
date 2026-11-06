## 1. Production serving

- [x] 1.1 In `server/server.ts`, resolve `distDir` from `process.cwd()`, and enable static serving when `NODE_ENV === 'production'` and `dist/index.html` exists
- [x] 1.2 Serve `/assets/*` with immutable long-term caching and everything else with `no-cache`
- [x] 1.3 Add a JSON 404 for unknown `/api/*` paths, then an SPA fallback sending `index.html` for other GETs, registered after the API routes
- [x] 1.4 Set `NODE_ENV=production` for `server:prod`, using a cross-platform approach (no POSIX-only `VAR=x` syntax)
- [x] 1.5 Add `npm start` running `build`, `build:server` and `server:prod`

## 2. Security headers

- [x] 2.1 Configure the helmet CSP directives: `img-src` with `https://image.tmdb.org` and `data:`; `style-src 'unsafe-inline'` for antd
- [x] 2.2 Click through Dashboard, Movies (table and grid), drawer, Add Movie, every Stats tab and chart PNG download under `server:prod`, and confirm there are no CSP violations in the console

## 3. Network exposure

<!-- 3.1 (Express bind host) and 3.2 (Vite localhost + dev:lan) moved to `harden-server-entry`. -->
- [x] 3.3 Add the `TRUST_PROXY` env handling (`app.set('trust proxy', …)` only when set)

## 4. Cleanup and docs

- [x] 4.1 Delete the unused `public/index.html`, and confirm `npm run build` output is unchanged
- [x] 4.2 Rewrite the README Deployment section:
  - the single-process model
  - Node `>=22.22.0`
  - env vars `PORT`, `HOST`, `CLIENT_ORIGIN`, `TMDB_API_KEY` and `TRUST_PROXY` (`HOST`/`dev:lan` already documented by `harden-server-entry`; keep them consistent)
- [x] 4.3 README fixes: `/movies` → `/api/movies` in Performance (and its new `no-cache` policy, if `csv-write-safety` has landed); remove the dead "Live Demo note" link
- [x] 4.4 Update `.env.example` with the new optional vars, commented out
- [x] 4.5 Update the CLAUDE.md server paragraph (static serving; bind host and `dev:lan` are already documented)

## 5. Verification

- [x] 5.1 `npm start`: open `http://localhost:5000/`, deep-link `/stats?tab=people`, reload, check posters render, check `/api/nope` returns JSON 404
<!-- 5.2 (LAN reachability check) moved to `harden-server-entry` (its task 3.4). -->
- [x] 5.3 Confirm `npm run lint`, `npm run build` and `npm run test:server` pass. No local e2e run: e2e exercises dev mode, not the production serving this change adds (covered by 5.1); CI runs the e2e suite on push and catches any dev-host regression
