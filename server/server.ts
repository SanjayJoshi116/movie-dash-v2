import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Movie } from '../src/types/movie';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000' }));
app.use(compression());

const apiLimiter = rateLimit({ windowMs: 60000, limit: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

const movies: Movie[] = [];
let ready = false;

const csvPath = path.join(__dirname, '..', 'src', 'movies.csv');

fs.createReadStream(csvPath)
  .on('error', (err) => {
    console.error('Failed to read CSV:', err.message);
    ready = true;
  })
  .pipe(csv())
  .on('data', (data: Movie) => movies.push(data))
  .on('error', (err) => {
    console.error('Failed to parse CSV:', err.message);
    ready = true;
  })
  .on('end', () => {
    ready = true;
    console.log(`CSV loaded — ${movies.length} movies`);
  });

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: ready ? 'ok' : 'loading', movies: movies.length });
});

app.use('/api/movies', (_req: Request, res: Response, next) => {
  if (!ready) {
    res.status(503).json({ error: 'Data still loading' });
    return;
  }
  next();
});

app.get('/api/movies', (_req: Request, res: Response<Movie[]>) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json(movies);
});

app.get('/api/movies/:id', (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  if (!id || id.length > 32) {
    res.status(400).json({ error: 'Invalid movie id' });
    return;
  }
  const movie = movies.find((m) => m['Movie ID'] === id);
  if (movie) {
    res.json(movie);
  } else {
    res.status(404).json({ error: 'Movie not found' });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
