// B206: package.json's allowScripts names an exact esbuild version. A dependency update that moves
// esbuild in the lockfile would silently drop it from the allowlist (its install script then skipped),
// so this fails until the two are bumped together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = (file: string) => JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'));

test('allowScripts covers every esbuild version in the lockfile', () => {
  const allowed = Object.keys(readJson('package.json').allowScripts ?? {});
  const packages: Record<string, { version?: string }> = readJson('package-lock.json').packages ?? {};
  const locked = Object.entries(packages)
    .filter(([path]) => path === 'node_modules/esbuild' || path.endsWith('/node_modules/esbuild'))
    .map(([, pkg]) => pkg.version);
  assert.ok(locked.length > 0, 'esbuild is in package-lock.json');
  for (const version of locked) {
    assert.ok(allowed.includes(`esbuild@${version}`), `allowScripts has esbuild@${version} (has: ${allowed.join(', ')})`);
  }
});
