/** Strips trailing slashes so `/movies/` highlights the same nav item as `/movies` (root stays `/`). */
export function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}
