import React from 'react';
import { POSTER_FALLBACK } from '../utils/poster';
import type { Movie } from '../types/movie';

interface PosterThumbProps {
  movie: Movie;
  width: number;
  height: number;
  radius?: number;
  style?: React.CSSProperties;
}

const PosterThumb: React.FC<PosterThumbProps> = ({ movie, width, height, radius = 6, style }) => (
  <img
    src={movie['Poster URL'] || POSTER_FALLBACK}
    alt={`${movie.Name} poster`}
    loading="lazy"
    onError={(e) => { (e.target as HTMLImageElement).src = POSTER_FALLBACK; }}
    style={{ width, height, objectFit: 'cover', borderRadius: radius, flexShrink: 0, ...style }}
  />
);

export default PosterThumb;
