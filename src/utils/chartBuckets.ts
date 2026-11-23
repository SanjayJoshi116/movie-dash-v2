import type { Bucket } from './statsHelpers';

/**
 * Bucket definitions shared by the charts that count with them, their drill-down clicks and the
 * e2e tests that check those counts — one copy, so the expectations can't drift from the app.
 */

/** Dashboard "Rating Distribution": half-open; the last bucket also takes 10.0. */
export const RATING_BUCKETS: Bucket[] = [
  { label: '0–2', min: 0, maxExclusive: 2 },
  { label: '2–4', min: 2, maxExclusive: 4 },
  { label: '4–6', min: 4, maxExclusive: 6 },
  { label: '6–8', min: 6, maxExclusive: 8 },
  { label: '8–10', min: 8, maxExclusive: Infinity },
];

/** Stats › Ratings "Vote Average Distribution": 0–1 … 9–10, half-open; the last bucket also takes 10.0. */
export const VOTE_BUCKETS: Bucket[] = Array.from({ length: 10 }, (_, i) => ({
  label: `${i}–${i + 1}`,
  min: i,
  maxExclusive: i === 9 ? Infinity : i + 1,
}));
