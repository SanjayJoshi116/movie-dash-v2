# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.1] - 2026-07-14

### Fixed
- Overview stat cards (Total Movies, Average/Longest/Shortest Runtime, Total Time Spent, Hours/Days/Years Watched) could get stuck at `0` and never animate. React 18 StrictMode's dev-only mount → cleanup → remount cycle cleared the count-up `setInterval`s and left a stale "already animated" ref, so the remount saw no change and never restarted the animation. Cleanup now resets that ref, so remounts re-arm correctly. (`src/components/StatsTabs/OverviewTab.tsx`)

### Added
- `CLAUDE.md` — repo guidance for Claude Code sessions (stack, commands, architecture, gotchas).
- `CHANGELOG.md` (this file).
- `features.txt` — plain-text feature list.
- `Thumbs.db` / `desktop.ini` added to `.gitignore`.

## [0.1.0] - 2026-07-03

Initial tracked baseline: React 19 + TypeScript + Vite dashboard with filterable movie table, detail drawer, CSV export, 6-tab statistics page (Overview, People, Ratings, Runtime & Geography, Box Office, Explore), light/dark theme, Express/CSV backend, ESLint, and 40 Playwright E2E tests.
