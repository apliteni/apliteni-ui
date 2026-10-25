// The kit's one page-size scale, which every pager starts on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_SIZES, DEFAULT_PAGE_SIZE } from './pagination.js';

test('the kit ships one page-size scale, and starts on a step of it', () => {
  assert.ok(Array.isArray(PAGE_SIZES) && PAGE_SIZES.length > 0);
  assert.ok(
    PAGE_SIZES.includes(DEFAULT_PAGE_SIZE),
    'the default page size is not one of the sizes offered, so the first render disagrees '
    + 'with the control that reports it',
  );
  assert.deepEqual([...PAGE_SIZES].sort((a, b) => a - b), PAGE_SIZES, 'the scale is not in order');
});
