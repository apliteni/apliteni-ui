// Scroll arithmetic only; the browser evidence check measures real 390px layouts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { revealCurrentNav } from './nav.js';

/** A row whose current link sits at `rect`, in a row `scrollWidth` wide. */
const row = ({ scrollWidth, clientWidth = 310, rect }) => ({
  scrollLeft: 0, scrollWidth, clientWidth,
  ownerDocument: { defaultView: { getComputedStyle: () => ({ paddingLeft: '4px', paddingRight: '4px' }) } },
  querySelector: () => (rect ? { getBoundingClientRect: () => rect } : null),
  getBoundingClientRect: () => ({ left: 40, right: 350 }),
});

test('reveals the current link at either edge without changing an already visible link', () => {
  let rect = { left: 360, right: 450 };
  const nav = { ...row({ scrollWidth: 600 }), querySelector: () => ({ getBoundingClientRect: () => rect }) };
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 104);
  rect = { left: 30, right: 120 };
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 90);
  rect = { left: 50, right: 140 };
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 90);
});

test('a row with no current link is left alone', () => {
  // Overflowing, so `!current` is the only half of the guard that can stop it.
  const nav = row({ scrollWidth: 600, rect: null });
  revealCurrentNav(nav);
  assert.equal(nav.scrollLeft, 0);
});

test('a row that fits is left alone even when its current link measures outside it', () => {
  // A row short enough to need no scrolling cannot be scrolled: scrollLeft stays
  // at 0 whatever the rects say. The rect is deliberately past the right edge, so
  // only the fits-in-row half of the guard keeps this row still — see the mutation
  // below, which is what proves that.
  const nav = row({ scrollWidth: 200, rect: { left: 360, right: 450 } });
  revealCurrentNav(nav);
  assert.equal(
    nav.scrollLeft, 0,
    'a row no wider than its viewport was scrolled anyway, which in a browser moves '
    + 'nothing and in a stale layout moves the row to a position it cannot hold',
  );
});

/* -- The mutation that kills the case above ---------------------------------- */

const GUARD = ' || nav.scrollWidth <= nav.clientWidth';

test('the fitting-row case fails when the fits-in-row guard is removed', async () => {
  const source = readFileSync(new URL('./nav.js', import.meta.url), 'utf8');
  assert.equal(
    source.split(GUARD).length - 1, 1,
    `the mutation found no single copy of \`${GUARD.trim()}\` — the guard moved or was reworded, `
    + 'so move the mutation with it rather than deleting this test',
  );
  const mutated = `data:text/javascript,${encodeURIComponent(source.replace(GUARD, ''))}`;
  const { revealCurrentNav: unguarded } = await import(mutated);
  const nav = row({ scrollWidth: 200, rect: { left: 360, right: 450 } });
  unguarded(nav);
  assert.notEqual(
    nav.scrollLeft, 0,
    'without the guard the fitting row is still left at 0, so the case above would pass '
    + 'with the guard deleted and is measuring nothing',
  );
});
