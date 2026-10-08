import path from 'path';
import { createApp } from './app';

try {
  process.loadEnvFile(path.join(process.cwd(), '.env'));
} catch {
  // .env is optional locally; TMDB routes degrade gracefully if the key is absent
}

// Resolved from process.cwd(), not __dirname: __dirname is server/ under `tsx watch` but
// server/dist/server/ once compiled, while both dev and server:prod run from the repo root.
const { app } = createApp({
  csvPath: path.join(process.cwd(), 'src', 'movies.csv'),
  tmdbApiKey: process.env.TMDB_API_KEY,
  clientOrigin: process.env.CLIENT_ORIGIN,
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
