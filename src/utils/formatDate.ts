export function formatDateDDMMYYYY(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return y && m && d ? `${d}-${m}-${y}` : dateStr;
}
