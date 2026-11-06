## Purpose

Keeps the development web server and the API server reachable only from the local machine by default, so nobody on a shared network can read or change the user's catalogue.

## ADDED Requirements

### Requirement: Servers are local-only by default
The web dev server and the API server SHALL accept connections only from the local machine unless network access is explicitly enabled. The API server SHALL accept a configured listen address for deployments that need external access.

#### Scenario: Default dev start
- **WHEN** the developer runs the dev command without extra configuration
- **THEN** another device on the same network can reach neither the app nor the `/api` routes, on either port

#### Scenario: App still works locally
- **WHEN** the developer runs the dev command and opens the app on the same machine
- **THEN** the app loads and its `/api` requests succeed through the dev proxy

#### Scenario: LAN opt-in for the web app
- **WHEN** the developer starts dev with LAN access enabled
- **THEN** a phone on the same network can load the app by the machine's LAN address, while the API port itself stays local-only

#### Scenario: Deployment listen address
- **WHEN** the API server is started with an explicit listen address
- **THEN** it accepts connections on that address
