const APP_NAME = 'MovieDash';

/** Names the browser tab "<page> · MovieDash" (PageTitle, and the error view of a page that never rendered one). */
export function setDocumentTitle(page: string): void {
  document.title = `${page} · ${APP_NAME}`;
}
