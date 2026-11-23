// The path the visit started on, read when the app shell loads, before any client-side navigation.
// A location key can't tell the first page apart: Stats' ?tab= REPLACE gives the first page a new
// key, and a reload keeps the key saved in history.state.
const firstPath = window.location.pathname;
let leftFirstPage = false;

/**
 * Records the current path (App on every navigation, PageTitle on mount) and returns whether the visit
 * has left its first page. Once true it stays true, so calling it during render is idempotent.
 */
export function noteNavigation(pathname: string): boolean {
  if (pathname !== firstPath) leftFirstPage = true;
  return leftFirstPage;
}
