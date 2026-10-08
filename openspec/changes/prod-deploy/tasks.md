## 1. Production serving

- [ ] 1.1 In `server/server.ts`, resolve `distDir` from `process.cwd()`, and enable static serving when `NODE_ENV === 'production'` and `dist/index.html` exists
- [ ] 1.2 Serve `/assets/*` with immutable long-term caching and everything else with `no-cache`
- [ ] 1.3 Add a JSON 404 for unknown `/api/*` paths, then an SPA fallback sending `index.html` for other GETs, registered after the API routes
- [ ] 1.4 Set `NODE_ENV=production` for `server:prod`, using a cross-platform approach (no POSIX-only `VAR=x` syntax)
- [ ] 1.5 Add `npm start` running `build`, `build:server` and `server:prod`

## 2. Security headers

- [ ] 2.1 Configure the helmet CSP directives: `img-src` with `https://image.tmdb.org` and `data:`; `style-src 'unsafe-inline'` for antd
- [ ] 2.2 Click through Dashboard, Movies (table and grid), drawer, Add Movie, every Stats tab and chart PNG download under `server:prod`, and confirm there are no CSP violations in the console

## 3. Network exposure

- [ ] 3.1 Express: `app.listen(PORT, HOST)` with `HOST` defaulting to `127.0.0.1`
- [ ] 3.2 `vite.config.ts`: `server.host: 'localhost'`; add an `npm run dev:lan` script that starts Vite with `--host`
- [ ] 3.3 Add the `TRUST_PROXY` env handling (`app.set('trust proxy', …)` only when set)

## 4. Cleanup and docs

- [ ] 4.1 Delete the unused `public/index.html`, and confirm `npm run build` output is unchanged
- [ ] 4.2 Rewrite the README Deployment section:
  - the single-process model
  - Node `>=22.22.0`
  - env vars `PORT`, `HOST`, `CLIENT_ORIGIN`, `TMDB_API_KEY` and `TRUST_PROXY`
  - `dev:lan`
- [ ] 4.3 README fixes: `/movies` → `/api/movies` in Performance (and its new `no-cache` policy, if `csv-write-safety` has landed); remove the dead "Live Demo note" link
- [ ] 4.4 Update `.env.example` with the new optional vars, commented out
- [ ] 4.5 Update the CLAUDE.md server and Vite paragraphs (static serving, bind host, `dev:lan`)

## 5. Verification

- [ ] 5.1 `npm start`: open `http://localhost:5000/`, deep-link `/stats?tab=people`, reload, check posters render, check `/api/nope` returns JSON 404
- [ ] 5.2 Default `npm run dev`: from another device on the LAN, the app isn't reachable; with `npm run dev:lan` it is
- [ ] 5.3 Confirm `npm run lint`, `npm run build` and `npm run test:server` pass. No local e2e run: e2e exercises dev mode, not the production serving this change adds (covered by 5.1); CI runs the e2e suite on push and catches any dev-host regression
