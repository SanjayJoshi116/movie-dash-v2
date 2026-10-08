## Purpose

Defines how the application is served in development and production. It covers which network interfaces it can be reached on, and how the single-page app behaves at the HTTP level: routing fallback, caching and security headers.

## ADDED Requirements

### Requirement: Production server serves the complete application
In production mode, a single server process SHALL serve both the built web application and the `/api` endpoints from the same origin.

#### Scenario: Open the root URL
- **WHEN** a user opens the production server's root URL in a browser
- **THEN** the Dashboard loads and shows catalogue data

#### Scenario: Deep link to a client route
- **WHEN** a user opens `/movies` or `/stats?tab=people` directly, or reloads on it
- **THEN** the application loads on that route instead of a 404 or raw JSON

#### Scenario: Unknown API path
- **WHEN** a request is made to an `/api/...` path that doesn't exist
- **THEN** the response is a JSON `404`, not the application's HTML

### Requirement: Static asset caching
The production server SHALL let browsers cache content-hashed build assets long-term. It SHALL require revalidation of the HTML entry document, so a new deployment takes effect on the next load.

#### Scenario: Redeploy
- **WHEN** a new build is deployed and a returning user reloads the page
- **THEN** the user receives the new application version

### Requirement: Security headers permit the application's own resources
The production server SHALL send a Content-Security-Policy that blocks unexpected origins. The policy SHALL still allow every resource the application needs, including movie poster images from TMDB.

#### Scenario: Posters load in production
- **WHEN** the Movies page grid is shown in production
- **THEN** TMDB poster images render, and the browser console shows no CSP violations

### Requirement: Development servers are local-only by default
In development, the web dev server and the API server SHALL accept connections only from the local machine, unless LAN access is explicitly enabled through configuration.

#### Scenario: Default dev start
- **WHEN** the developer runs the dev command without extra configuration
- **THEN** another device on the same network cannot reach the app or the `/api` routes

#### Scenario: LAN opt-in
- **WHEN** the developer starts dev with LAN access enabled
- **THEN** a phone on the same network can load the app by the machine's LAN address

### Requirement: Rate limiting identifies clients behind a proxy
When the server is configured as running behind a trusted reverse proxy, rate limiting SHALL be applied per original client, not per proxy.

#### Scenario: Two clients behind one proxy
- **WHEN** proxy trust is configured and two different clients send requests through the same proxy
- **THEN** each client's requests count against its own limit
