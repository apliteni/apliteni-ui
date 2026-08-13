/* The loading and denied treatments, and the one thing that is easy to get
 * wrong about them: WHERE the announcement comes from.
 *
 * A live region announces when the text inside it changes. A live region that
 * arrives in the document already holding its text announces nothing on several
 * screen readers — which is why setBusy() writes into a node that is already
 * there rather than re-rendering the region, and why deniedState() carries no
 * region of its own. Both of those are behaviour a future edit can silently
 * undo, so both are gated here rather than described in a comment.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { skeleton, skeletonTable, busyRegion, setBusy, deniedState } from './loading.js';

const here = path.dirname(fileURLToPath(import.meta.url));

test('busyRegion carries the kit’s existing announcement pair, plus aria-busy', () => {
  const html = busyRegion({ label: 'Loading your report…' });
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /<span class="ui-sr" data-busy-msg>Loading your report…<\/span>/);
});

test('the skeleton is hidden from assistive tech — the message is the content', () => {
  assert.match(skeleton({ lines: 3 }), /aria-hidden="true"/);
  assert.match(skeletonTable({ rows: 2, cols: 3 }), /aria-hidden="true"/);
  // Three bars asked for, three bars rendered — a count that silently rounds to
  // one would still look like a skeleton and reserve the wrong height.
  assert.equal((skeleton({ lines: 3 }).match(/ui-skel__bar/g) || []).length, 3);
  // rows × cols, plus a head row.
  assert.equal((skeletonTable({ rows: 2, cols: 3 }).match(/ui-skel__bar/g) || []).length, 9);
});

test('skeleton({ lines: [...] }) uses the widths given, escaped', () => {
  const html = skeleton({ lines: ['100%', '62%'] });
  assert.match(html, /style="width:100%"/);
  assert.match(html, /style="width:62%"/);
  // Widths reach an inline style attribute, so a quote in one must not end it.
  assert.doesNotMatch(skeleton({ lines: 1, width: '1px" onload="x' }), /onload="x/);
});

test('deniedState ships no live region — the one it lands in owns the event', () => {
  const html = deniedState({ title: 'Nope', sub: 'Ask an owner.', need: 'reports.read' });
  assert.doesNotMatch(html, /aria-live/);
  assert.doesNotMatch(html, /role="status"/);
  assert.doesNotMatch(html, /role="alert"/);
  assert.match(html, /<code class="ui-code">reports\.read<\/code>/);
  // The lock is decoration; the title is the text.
  assert.match(html, /class="ui-denied__seal" aria-hidden="true"/);
});

test('deniedState escapes what a caller passes, including the scope name', () => {
  const html = deniedState({ title: '<b>x</b>', need: '<img src=x>' });
  assert.doesNotMatch(html, /<b>x<\/b>/);
  assert.doesNotMatch(html, /<img src=x>/);
});

// The mechanism. Build the region, put it in a document, THEN change it — the
// same order a real screen does it in.
test('setBusy rewrites the message node in place; the region element survives', () => {
  const dom = new JSDOM(`<div id="host">${busyRegion({ label: 'Loading payouts…' })}</div>`);
  const host = dom.window.document.getElementById('host');
  const before = host.querySelector('[data-busy]');

  const after = setBusy(host, { busy: false, message: '3 payouts', body: '<table></table>' });

  assert.equal(after, before, 'same element — a replaced region announces nothing');
  assert.equal(after.getAttribute('aria-busy'), 'false');
  assert.equal(after.querySelector('[data-busy-msg]').textContent, '3 payouts');
  assert.equal(after.querySelector('[data-busy-body]').innerHTML, '<table></table>');
  // Still a live region afterwards, so the next transition can announce too.
  assert.equal(after.getAttribute('aria-live'), 'polite');
});

test('setBusy falls back to the region’s own labels when given no message', () => {
  const dom = new JSDOM(`<div id="h">${busyRegion({ label: 'Fetching…', readyLabel: 'Report ready' })}</div>`);
  const host = dom.window.document.getElementById('h');
  assert.equal(setBusy(host, { busy: false }).querySelector('[data-busy-msg]').textContent, 'Report ready');
  assert.equal(setBusy(host, { busy: true }).querySelector('[data-busy-msg]').textContent, 'Fetching…');
});

test('setBusy accepts the region itself, and shrugs at a torn-down view', () => {
  const dom = new JSDOM(busyRegion({ label: 'x' }));
  const region = dom.window.document.querySelector('[data-busy]');
  assert.equal(setBusy(region, { busy: false, message: 'done' }), region);
  assert.equal(setBusy(dom.window.document.createElement('div'), { busy: false }), null);
  assert.equal(setBusy(null, {}), null);
});

// The brief for #128 was explicit that the kit gets ONE announcement mechanism,
// not a second one beside the toast/success pair. This is that promise as a
// gate: every aria-live in the kit's own components is the same polite
// role="status", so a reader learns one behaviour and hears one voice.
test('the kit announces one way — role="status" aria-live="polite", everywhere', () => {
  const dir = path.join(here);
  const files = readdirSync(dir).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));
  const seen = [];
  for (const f of files) {
    const src = readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/aria-live="(\w+)"/g)) seen.push([f, m[1]]);
    // No component reaches for the assertive twin: role="alert" interrupts, and
    // nothing the kit renders is urgent enough to earn that.
    assert.doesNotMatch(src, /role="alert"/, `${f} must not add a second, louder mechanism`);
  }
  assert.ok(seen.length >= 3, `expected the toast, success and busy regions, saw ${seen.length}`);
  for (const [f, v] of seen) assert.equal(v, 'polite', `${f} announces politely`);
});
