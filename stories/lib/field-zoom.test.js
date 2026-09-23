import test from 'node:test';
import assert from 'node:assert/strict';
import { sizingRules } from './field-zoom.js';

test('the touch-field gate compares resolved pixel offsets with its safety floor', () => {
  const css = '.small { font-size: calc(13px - 0.5px); } .large { font-size: calc(15.5px + 1px); }';
  assert.deepEqual(sizingRules(css, 'fixture').map(r => r.px), [12.5, 16.5]);
  for (const value of ['calc(1rem + 1px)', 'calc(13px * 2)', 'var(--text-sm)']) {
    assert.equal(sizingRules(`.unknown { font-size: ${value}; }`, 'fixture')[0].px, null);
  }
});
