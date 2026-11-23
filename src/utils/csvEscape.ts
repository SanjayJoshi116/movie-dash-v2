// CSV writing helpers shared by the server (src/movies.csv writes) and the browser (Export CSV).
// Pure string functions with no DOM or Node imports, so both builds can include this file.

// Tab and CR too (OWASP): some importers trim leading whitespace before deciding a cell is a formula (B181).
// catalogue_io.py FORMULA_PREFIX_CHARS must list the same characters; a Python test compares them.
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

// Prevent CSV/formula injection: Excel/Sheets can execute a cell starting with =, +, -, @ (or a tab/CR)
// when the file is opened later, so such a value gets a leading `'`. Mirrors sanitize_csv_value()
// in catalogue_io.py. Leading apostrophes before the formula character count too ('-ism is stored
// as ''-ism), which makes unsanitizeCsvValue() an exact inverse: a real apostrophe is never lost.
export function sanitizeCsvValue(value: string): string {
  return startsWithFormula(value.replace(/^'+/, '')) ? `'${value}` : value;
}

// Inverse of sanitizeCsvValue(), for values read back from the file: drops the guard `'` so the UI
// shows the original value and the next write escapes it exactly once.
export function unsanitizeCsvValue(value: string): string {
  return value.startsWith("'") && startsWithFormula(value.replace(/^'+/, '')) ? value.slice(1) : value;
}

function startsWithFormula(value: string): boolean {
  return FORMULA_PREFIXES.some((p) => value.startsWith(p));
}

export function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
