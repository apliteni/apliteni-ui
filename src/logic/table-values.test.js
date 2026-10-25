// The shared value logic behind every table cell that prints a figure or a change:
// a missing figure says so, zero is a value, and a change that is zero is never judged,
// whatever unit the caller wrote after it. The vanilla cells and the React
// NumericValue and DeltaValue both ask these.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumericValue, formatDeltaValue } from './table-values.js';

test('a figure keeps zero, and a missing one says so', () => {
  assert.deepEqual(formatNumericValue({ value: 0, unit: 'USD' }), { text: '0', unit: 'USD', missing: undefined });
  assert.deepEqual(formatNumericValue(), { text: '—', unit: '', missing: 'Not available' });
  assert.equal(formatNumericValue({ value: '' }).missing, 'Not available', 'an empty string is no figure');
});

test('a missing or flat change is never judged', () => {
  assert.equal(formatDeltaValue({ value: null, tone: 'danger' }).className, 'ui-delta');
  assert.equal(formatDeltaValue({ value: null }).text, 'No earlier figure');
  assert.equal(formatDeltaValue({ value: '0.00%', tone: 'success' }).className, 'ui-delta');
  assert.equal(formatDeltaValue({ value: '−2%', tone: 'success' }).className, 'ui-delta ui-delta--success');
  assert.equal(formatDeltaValue({ value: '+2%' }).className, 'ui-delta', 'no tone, no judgement');
});

test('zero changes stay neutral with currency and other unit suffixes', () => {
  for (const value of ['+0 EUR', '+0 €', '−0.00 %', '0', 0, '-0', '0.00%', '0,00 %', '+00.000 kg', '  +0 USD  ', '0ms', '0 m2']) {
    for (const tone of ['success', 'danger']) {
      const out = formatDeltaValue({ value, tone });
      assert.equal(out.className, 'ui-delta', `${JSON.stringify(value)}: ${tone}`);
      assert.equal(out.text, String(value), 'the caller formatting is kept');
    }
  }
});

test('non-zero changes keep the judgement the caller supplied, with unit suffixes', () => {
  for (const value of ['+0.5 EUR', '+10 EUR', '−0.01 %', '-0,5 €', '+00.001 kg', '0.0001', '10', '+0.5']) {
    for (const tone of ['success', 'danger']) {
      assert.equal(formatDeltaValue({ value, tone }).className, `ui-delta ui-delta--${tone}`, String(value));
    }
  }
});
