// Rule: every change a stat band shows says what it is measured against, in
// text a reader can reach — beside the change, or in the band's caption that
// the change points at. A hover `title` is not that: it is the rejected shape
// in #267, which makes this an accessibility gate, and the Accessibility
// minimums page names it as one.
//
// Second: the caption is read BEFORE the figures it explains, the way a table's
// caption is. The default layout is tiles, and a caption under a row of
// separate cards is one a reader takes for a note on the last card.
//
// Third: a figure adds what it has to add in one row. Two rows drop the changes
// beside it a line lower — 26.2px, measured on #512.
//
// Every story is walked, so a band added anywhere is a subject without being
// listed. why: docs/components.md#stat-bands
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { installDomGlobals, storyFiles } from './lib/contrast.js';
import { statBand } from '../src/components/stat.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});
const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true, virtualConsole: quiet });
installDomGlobals(dom.window);
const doc = dom.window.document;

/** The changes under `root` whose comparison a reader cannot reach. */
export const unexplained = (root) => [...root.querySelectorAll('.ui-stat__delta')]
  .filter((d) => {
    if (d.querySelector('.ui-stat__basis')?.textContent.trim()) return false;
    const ids = (d.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    return !ids.some((id) => root.querySelector(`[id="${id}"]`)?.textContent.trim());
  });

/** The captions under `root` that do not lead the figures they caption. */
export const misplaced = (root) => [...root.querySelectorAll('.ui-stats__basis')]
  .filter((p) => {
    const band = p.closest('.ui-stats');
    if (!band) return true;
    const list = band.querySelector('.ui-stats__list');
    return p.closest('.ui-stat') !== null || !list || !(p.compareDocumentPosition(list) & 4);
  });

/** The figures under `root` that stack more than one row under their value. */
export const overloaded = (root) => [...root.querySelectorAll('.ui-stat')]
  .filter((f) => [...f.children]
    .filter((c) => c.tagName === 'DD'
      && !c.classList.contains('ui-stat__value')
      && !c.classList.contains('ui-stat__trend')).length > 1);

const mount = (html) => {
  const box = doc.createElement('div');
  if (typeof html === 'string') box.innerHTML = html;
  else if (html instanceof dom.window.Node) box.append(html);
  doc.body.append(box);
  return box;
};

test('the check finds a change with nothing to say what it is measured against', () => {
  const figures = [{ label: 'Income', value: '€ 1', delta: { value: '+4%' } }];
  assert.equal(unexplained(mount(statBand({ stats: figures }))).length, 1);
  assert.equal(unexplained(mount(statBand({ stats: figures, basis: 'Against last year' }))).length, 0);
  assert.equal(unexplained(mount(statBand({ stats: [{ ...figures[0], delta: { value: '+4%', basis: 'against plan' } }] }))).length, 0);
});

test('the check finds a caption that has slipped under or into its figures', () => {
  const stats = [{ label: 'Income', value: '€ 1', delta: { value: '+4%' } }];
  const band = statBand({ stats, basis: 'Against last year', id: 'ok' });
  assert.equal(misplaced(mount(band)).length, 0);
  // The shape this rule refuses: the same band with its caption moved back under
  // the list, which is where #267 shipped it before tiles became the default.
  const under = band.replace(/(<p class="ui-stats__basis"[^>]*>[^<]*<\/p>)(<dl[\s\S]*<\/dl>)/, '$2$1');
  assert.notEqual(under, band, 'the mutation did not land — the caption markup moved');
  assert.equal(misplaced(mount(under)).length, 1);
  const inside = band.replace('<dt class="ui-stat__label">', '<p class="ui-stats__basis">Against last year</p><dt class="ui-stat__label">');
  assert.equal(misplaced(mount(inside)).length, 1);
});

test('the check finds a figure that stacks a second row under its value', () => {
  const band = statBand({ stats: [{ label: 'Margin', value: '36.1%', caption: 'of income', delta: { value: '+1.2 pts' } }] });
  assert.equal(overloaded(mount(band)).length, 0, 'a caption and a change already cost two rows');
  // The shape this rule refuses: the caption drawn as its own row above the
  // change, which is what #512 reviewed and what the row model replaced.
  const split = band.replace(/<span class="ui-stat__caption">([^<]*)<\/span> /, '<\/dd><dd class="ui-stat__caption">$1<\/dd><dd class="ui-stat__delta">');
  assert.notEqual(split, band, 'the mutation did not land — the caption markup moved');
  assert.equal(overloaded(mount(split)).length, 1);
});

test('every change in every story says what it is measured against, and no figure says it twice over', async () => {
  let subjects = 0;
  let captions = 0;
  let figures = 0;
  const failures = [];
  // No filter on the file's source: a guidelines story renders its bands through
  // a content module and names neither the factory nor the class.
  for (const rel of storyFiles) {
    const mod = await import(path.join(here, rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      let box;
      try {
        box = mount(render(args, { globals: { theme: 'dark', accent: 'default' }, args }));
      } catch (err) {
        failures.push(`${rel}:${name} did not render — ${err.message}`);
        continue;
      }
      subjects += box.querySelectorAll('.ui-stat__delta').length;
      captions += box.querySelectorAll('.ui-stats__basis').length;
      figures += box.querySelectorAll('.ui-stat').length;
      for (const d of unexplained(box)) {
        failures.push(`${rel}:${name} — "${d.textContent.trim()}" under "${d.parentElement.querySelector('dt')?.textContent}"`);
      }
      for (const p of misplaced(box)) {
        failures.push(`${rel}:${name} — the caption "${p.textContent.trim()}" does not lead its figures`);
      }
      for (const f of overloaded(box)) {
        failures.push(`${rel}:${name} — "${f.querySelector('dt')?.textContent}" stacks two rows under its value`);
      }
      box.remove();
    }
  }
  assert.ok(subjects >= 20, `walked ${subjects} changes — the walk stopped finding the bands`);
  assert.ok(captions >= 10, `walked ${captions} captions — the walk stopped finding the bands' captions`);
  assert.ok(figures >= 50, `walked ${figures} figures — the walk stopped finding them`);
  assert.deepEqual(failures, []);
});
