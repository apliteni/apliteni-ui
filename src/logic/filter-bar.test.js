// The shared chip text: what a filter chip prints and what it is named. The vanilla
// filter bar and the React FilterBar both ask this pair.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterChipText, filterChipValue, filterChipName, filterChipUnset } from './filter-bar.js';

test('the shared pair never writes an absent field into a chip or its name', () => {
  assert.equal(filterChipText({}), '');
  assert.equal(filterChipName({ value: 'Tech' }), 'Tech');
  assert.equal(filterChipName({}), '');
  assert.equal(filterChipName({ label: 'Listing' }), 'Listing: Any');
  assert.equal(filterChipText({ label: 'Listing' }), 'Listing: Any');
  assert.equal(filterChipText({ label: 'Status', value: 'Active' }), 'Status: Active', 'the field name stands before the value');
  assert.equal(filterChipValue({ label: 'Status', value: 'Active' }), 'Active');
  assert.equal(filterChipText({ label: 'Listing', value: 0 }), 'Listing: 0', 'zero is a value');
  assert.equal(filterChipUnset({ value: '' }), true);
  assert.equal(filterChipUnset({ value: 0 }), false);
});
