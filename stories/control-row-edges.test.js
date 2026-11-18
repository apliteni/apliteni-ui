/* Rule: a button and a field that stand in one row share one top and one bottom
 * edge. The kit's row for that is `.ui-toolbar`, which gives every control on a
 * line the line's height. A default button is about 36px and a default field
 * 45px, so a hand-made row that centres them leaves both edges apart. #825
 *
 * Browser only, off unless CONTROL_ROWS=1, because Playwright is deliberately not
 * a dependency. It opens every story in storybook-static at 1280 and 390, finds
 * each painted button and each field, select, input group, dropdown trigger or
 * filter chip that share a flex row and a line, and compares their edges.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_CHROME=… CONTROL_ROWS=1 node --test stories/control-row-edges.test.js
 *
 * WHAT THIS DOES NOT REACH: a ghost or link button, because it paints no edge at
 * rest; a button and a field in a grid or on two lines; a state a story does not
 * render, such as a closed panel; the default accent and the light theme only.
 * The source half, which boxes a toolbar stretches, is filter-bar.test.js.
 *
 * why: docs/components.md#a-toolbar-at-one-column
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { env } from 'node:process';
import { playwright } from './lib/tap-zone.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN = env.CONTROL_ROWS === '1';
const WIDTHS = [1280, 390];
const PAGES = 6;

/** Each button and field on one line of one flex row whose edges differ by more than half a pixel. */
const PROBE = (scope) => {
  const FIELD = 'input.ui-input:not([type=checkbox]):not([type=radio]):not([type=range]), select, .ui-input-group, .ui-dropdown__trigger';
  const within = scope ? document.querySelector(scope) : document.body;
  const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const clear = (c) => c === 'transparent' || /,\s*0\)$/.test(c);
  const painted = (el) => { const cs = getComputedStyle(el); return !clear(cs.backgroundColor) || (parseFloat(cs.borderTopWidth) > 0 && !clear(cs.borderTopColor)); };
  // A filter chip is the box a reader sees; its trigger is a label inside it.
  const fields = [...new Set([...within.querySelectorAll(FIELD)]
    .filter((f) => shown(f) && !f.parentElement.closest('.ui-input-group, .ui-dropdown__trigger'))
    .map((f) => f.closest('.ui-filter-bar__chip') || f))];
  const buttons = [...within.querySelectorAll('.ui-btn')]
    .filter((b) => shown(b) && painted(b) && !b.closest('.ui-input-group, .ui-dropdown__trigger, .ui-dropdown__panel, [role=menu], [role=listbox]'));
  const name = (el) => el.getAttribute('aria-label') || el.querySelector('[aria-label]')?.getAttribute('aria-label')
    || el.textContent.trim().slice(0, 40) || String(el.className).split(' ')[0];
  const pairs = [];
  for (const b of buttons) for (const f of fields) {
    if (b.contains(f) || f.contains(b)) continue;
    let row = b.parentElement;
    while (!row.contains(f)) row = row.parentElement;
    const cs = getComputedStyle(row);
    if (!/flex/.test(cs.display) || cs.flexDirection.startsWith('column')) continue;
    if (row === document.body || row.id === 'storybook-root' || /(^|\s)sb-/.test(String(row.className))) continue;
    const rb = b.getBoundingClientRect(), rf = f.getBoundingClientRect();
    if (rb.bottom <= rf.top || rf.bottom <= rb.top) continue;
    const top = +(rb.top - rf.top).toFixed(2), bottom = +(rb.bottom - rf.bottom).toFixed(2);
    pairs.push({ button: name(b), field: name(f), row: String(row.className).split(' ')[0] || row.tagName.toLowerCase(), top, bottom });
  }
  return pairs;
};

const apart = (p) => Math.abs(p.top) > 0.5 || Math.abs(p.bottom) > 0.5;

async function walk() {
  const built = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(built, 'iframe.html')), 'storybook-static is not built: run `npm run build-storybook` first');
  const pw = await playwright();
  assert.ok(pw, 'CONTROL_ROWS=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const index = JSON.parse(readFileSync(path.join(built, 'index.json'), 'utf8'));
  const ids = Object.entries(index.entries).filter(([, e]) => e.type === 'story').map(([id]) => id).sort();
  const serve = spawn(process.execPath, [path.join(root, 'scripts/evidence/serve.mjs'), built], { stdio: ['ignore', 'pipe', 'inherit'] });
  const port = await new Promise((resolve) => serve.stdout.once('data', (d) => resolve(Number(String(d).trim()))));
  const browser = await pw.chromium.launch({ executablePath: env.UI_CHROME });
  const open = async (id, width) => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const r = document.getElementById('storybook-root');
      return (r && r.childElementCount > 0) || [...document.body.children].some((el) => el !== r
        && !['SCRIPT', 'STYLE'].includes(el.tagName) && !(el.id || '').startsWith('storybook') && !/(^|\s)sb-/.test(String(el.className)));
    }, { timeout: 10000 });
    await page.evaluate(() => document.fonts.ready.then(() => new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(d)))));
    return page;
  };
  const jobs = WIDTHS.flatMap((width) => ids.map((id) => ({ id, width })));
  const measured = [], problems = [];
  let fixture;
  try {
    // The mutation, in the same browser and sheet: a hand-made centred row must be
    // refused, and the same two controls in a toolbar must pass.
    const page = await open(ids[0], 1280);
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'control-row-fixture';
      host.innerHTML = '<div style="display:flex;align-items:center;gap:8px"><button class="ui-btn ui-btn--primary">Save</button><input class="ui-input" aria-label="URL"></div>'
        + '<div class="ui-toolbar"><button class="ui-btn ui-btn--primary">Save</button><input class="ui-input" aria-label="URL"></div>';
      document.body.append(host);
    });
    fixture = await page.evaluate(PROBE, '#control-row-fixture');
    await page.close();
    let next = 0;
    await Promise.all(Array.from({ length: PAGES }, async () => {
      while (next < jobs.length) {
        const { id, width } = jobs[next++];
        try {
          const p = await open(id, width);
          for (const pair of await p.evaluate(PROBE)) measured.push({ id, width, ...pair });
          await p.close();
        } catch (err) {
          problems.push(`${id} at ${width}px → ${err && err.message}`);
        }
      }
    }));
  } finally {
    await browser.close();
    serve.kill();
  }
  return { ids, fixture, measured, problems };
}

test('a button and a field in one row share their top and bottom edges', { skip: !RUN && 'set CONTROL_ROWS=1' }, async (t) => {
  const { ids, fixture, measured, problems } = await walk();
  t.diagnostic(`${ids.length} stories at ${WIDTHS.join(' and ')}px, ${measured.length} button and field pairs measured`);

  assert.equal(fixture.length, 2, 'the fixture rows were not both measured');
  assert.ok(apart(fixture[0]), `the probe passed a centred hand-made row: ${JSON.stringify(fixture[0])}`);
  assert.ok(!apart(fixture[1]), `the probe refused a toolbar row: ${JSON.stringify(fixture[1])}`);

  assert.deepEqual(problems, [], 'a story could not be measured');
  // Coverage: the two rows #825 fixed must still be found, at the desktop width.
  for (const [id, button] of [['guidelines-the-full-state-set--state-set', 'Save changes'], ['guidelines-component-choice--component-choice', 'Export']]) {
    assert.ok(measured.some((p) => p.id === id && p.width === 1280 && p.button === button), `${id}: the ${button} row was not measured`);
  }
  const off = measured.filter(apart).map((p) => `${p.id} at ${p.width}px: “${p.button}” beside “${p.field}” in ${p.row}, top ${p.top}px, bottom ${p.bottom}px`);
  assert.deepEqual(off, [], 'a button and a field in one row have different edges; put them in .ui-toolbar');
});
