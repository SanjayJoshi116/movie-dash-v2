// Bundle-size budget for the production web build (openspec frontend-performance spec).
// Run after `npm run build`: reads dist/.vite/manifest.json, collects the landing route's
// initial JS (the index.html entry plus everything it *statically* imports — never
// dynamicImports, which are the lazy Movies/Stats routes), gzips each chunk with Node's
// built-in zlib and fails if the total exceeds BUDGET_INITIAL_GZIP_KB, or if any .js
// chunk in dist/assets is over MAX_CHUNK_RAW_KB minified. Cross-platform, no network.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const BUDGET_INITIAL_GZIP_KB = 400;
const MAX_CHUNK_RAW_KB = 500;

const distDir = path.resolve(process.argv[2] ?? 'dist');
const manifestPath = path.join(distDir, '.vite', 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`check-bundle: ${manifestPath} not found — run \`npm run build\` first (build.manifest must be enabled).`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry && k.endsWith('index.html'));
if (!entryKey) {
  console.error('check-bundle: no index.html entry in the Vite manifest.');
  process.exit(1);
}

const kb = (bytes) => bytes / 1000; // Vite reports kB as 1000 bytes; match it.
const fmt = (n) => n.toFixed(2).padStart(9);
const sizeOf = (file) => {
  const buf = fs.readFileSync(path.join(distDir, file));
  return { raw: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length };
};

// Walk static imports only.
const initial = new Set();
const walk = (key) => {
  const chunk = manifest[key];
  if (!chunk || initial.has(chunk.file)) return;
  initial.add(chunk.file);
  for (const dep of chunk.imports ?? []) walk(dep);
};
walk(entryKey);

const assetsDir = path.join(distDir, 'assets');
const rows = fs.readdirSync(assetsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => {
    const file = `assets/${f}`;
    return { file, initial: initial.has(file), ...sizeOf(file) };
  })
  .sort((a, b) => b.gzip - a.gzip);

console.log(`${'chunk'.padEnd(44)} ${'raw kB'.padStart(9)} ${'gzip kB'.padStart(9)}  landing`);
for (const r of rows) {
  const tooBig = kb(r.raw) > MAX_CHUNK_RAW_KB ? '  <-- over chunk limit' : '';
  console.log(`${r.file.padEnd(44)} ${fmt(kb(r.raw))} ${fmt(kb(r.gzip))}  ${r.initial ? 'yes' : ''}${tooBig}`);
}

const initialRows = rows.filter((r) => r.initial);
const initialRaw = initialRows.reduce((s, r) => s + r.raw, 0);
const initialGzip = initialRows.reduce((s, r) => s + r.gzip, 0);
console.log(`\nLanding-route initial JS (${initialRows.length} chunks): ${kb(initialRaw).toFixed(2)} kB raw, ${kb(initialGzip).toFixed(2)} kB gzip (budget ${BUDGET_INITIAL_GZIP_KB} kB gzip)`);

let failed = false;
if (kb(initialGzip) > BUDGET_INITIAL_GZIP_KB) {
  failed = true;
  console.error(`FAIL: landing-route initial JS is ${kb(initialGzip).toFixed(2)} kB gzip, over the ${BUDGET_INITIAL_GZIP_KB} kB budget. Chunks: ${initialRows.map((r) => r.file).join(', ')}`);
}
const oversized = rows.filter((r) => kb(r.raw) > MAX_CHUNK_RAW_KB);
if (oversized.length) {
  failed = true;
  console.error(`FAIL: chunk(s) over ${MAX_CHUNK_RAW_KB} kB minified: ${oversized.map((r) => `${r.file} (${kb(r.raw).toFixed(2)} kB)`).join(', ')}`);
}
if (failed) process.exit(1);
console.log('check-bundle: OK');
