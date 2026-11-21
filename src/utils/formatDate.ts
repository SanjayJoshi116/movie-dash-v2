const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` → `DD-MM-YYYY`. Anything else (timestamps, unpadded dates) is returned trimmed but unchanged; a missing or blank value gives `''`. */
export function formatDateDDMMYYYY(dateStr: string | undefined): string {
  const trimmed = dateStr?.trim() ?? '';
  const match = ISO_DATE.exec(trimmed);
  if (!match) return trimmed;
  const [, y, m, d] = match;
  return `${d}-${m}-${y}`;
}
