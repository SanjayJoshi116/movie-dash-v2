import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withAlpha } from '../../src/utils/chartTheme';

test('withAlpha: #RRGGBB', () => {
  assert.equal(withAlpha('#7C93E0', 0.5), 'rgba(124, 147, 224, 0.5)');
});

test('withAlpha: #RGB expands each digit', () => {
  assert.equal(withAlpha('#fff', 0.8), 'rgba(255, 255, 255, 0.8)');
  assert.equal(withAlpha('#0a3', 1), 'rgba(0, 170, 51, 1)');
});

test('withAlpha: rejects other formats (B150)', () => {
  assert.throws(() => withAlpha('#7C93E0FF', 0.5), TypeError);
  assert.throws(() => withAlpha('red', 0.5), TypeError);
});
