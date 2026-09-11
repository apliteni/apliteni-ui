// Rule: every change a stat band shows says what it is measured against, in
// text a reader can reach — beside the change, or in the band's caption that
// the change points at. A hover `title` is not that: it is the rejected shape
// in #267, and nobody on a phone or a screen reader ever meets it. That makes
// this an accessibility gate, and the floor page names it as one: a comparison
// only a hovering pointer reaches is one a keyboard never reaches at all.
//
// Every story is walked, so a band added anywhere is a subject without being
// listed. why: docs/specification.md#stat-bands
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
export const unexplained = (root) => [...root.querySelectorAll('.ui-stat__delta:not(.ui-stat__delta--none)')]
  .filter((d) => {
    if (d.querySelector('.ui-stat__basis')?.textContent.trim()) return false;
    const ids = (d.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    return !ids.some((id) => root.querySelector(`[id="${id}"]`)?.textContent.trim());
  });

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

test('every change in every story says what it is measured against', async () => {
  let subjects = 0;
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
      subjects += box.querySelectorAll('.ui-stat__delta:not(.ui-stat__delta--none)').length;
      for (const d of unexplained(box)) {
        failures.push(`${rel}:${name} — "${d.textContent.trim()}" under "${d.parentElement.querySelector('dt')?.textContent}"`);
      }
      box.remove();
    }
  }
  assert.ok(subjects >= 20, `walked ${subjects} changes — the walk stopped finding the bands`);
  assert.deepEqual(failures, []);
});
