import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import cors from 'cors';
import compression from 'compression';
import type { Movie } from '../src/types/movie';

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());

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

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: ready ? 'ok' : 'loading', movies: movies.length });
});

app.use('/movies', (_req: Request, res: Response, next) => {
  if (!ready) {
    res.status(503).json({ error: 'Data still loading' });
    return;
  }
  next();
});

app.get('/movies', (_req: Request, res: Response<Movie[]>) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json(movies);
});

app.get('/movies/:id', (req: Request<{ id: string }>, res: Response) => {
  const movie = movies.find((m) => m['Movie ID'] === req.params.id);
  if (movie) {
    res.json(movie);
  } else {
    res.status(404).json({ error: 'Movie not found' });
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
