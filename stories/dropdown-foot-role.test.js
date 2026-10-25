// Rule: a head or a foot holds what its panel's role may hold — a menu takes
// menuitems and a listbox takes options, so a Save / Cancel pair goes in the
// search variant's dialog and nowhere else.
//
// It is a sentence in docs/components.md, so it is measured rather than asserted:
// the same foot goes into each panel the factory emits and axe says which it
// refuses. An axe that stops refusing turns this red rather than turning the
// sentence quietly false.
//
// why: docs/components.md#the-dropdown-panel
// Measure behavior instead of matching the source text.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { markup } from './lib/react-markup.js';

const require = createRequire(import.meta.url);
const axeSrc = readFileSync(path.join(path.dirname(require.resolve('axe-core')), 'axe.min.js'), 'utf8');

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});
const dom = new JSDOM(
  '<!doctype html><html lang="en"><head><title>kit</title></head><body></body></html>',
  { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: quiet },
);
dom.window.eval(axeSrc);
after(() => dom.window.close());

// The same rule set stories/a11y.test.js runs, so the two cannot disagree.
const AXE_OPTS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  resultTypes: ['violations'],
  rules: { 'color-contrast': { enabled: false } },
};

const ROWS = [{ label: 'Unpaid' }, { label: 'Paid this month' }];
const PICKS = [{ label: 'Unpaid', value: 'unpaid', selected: true }, { label: 'Paid', value: 'paid' }];
// A foot is the pinned block at the panel's bottom edge, `.ui-dropdown__foot`; the
// React Dropdown takes it whole through `footer`.
const foot = (h, ...children) => h('div', { className: 'ui-dropdown__foot' }, ...children);
const CONTROLS = (h) => foot(h, h('button', { className: 'ui-btn ui-btn--sm' }, 'Cancel'),
  h('button', { className: 'ui-btn ui-btn--sm ui-btn--primary' }, 'Save'));
const TEXT = (h) => foot(h, h('span', { className: 'ui-dropdown__desc' }, 'Counts refresh every 5 minutes.'));
const HEAD = (h) => h('div', { className: 'ui-dropdown__head' }, h('b', null, 'Filter payouts'));

/** The three panels the React Dropdown can draw, each named by the role it writes. Slots
 *  are built with the renderer's own createElement. */
const panel = (props) => ({ header, footer } = {}) => markup(({ h, kit }) => h(kit.Dropdown, {
  ariaLabel: 'Filter', defaultOpen: true, ...props, header: header?.(h), footer: footer?.(h),
}));
const PANELS = {
  menu: panel({ value: 'Filter', variant: 'menu', items: ROWS }),
  listbox: panel({ variant: 'select', items: PICKS }),
  dialog: panel({ value: 'Filter', items: ROWS, search: { placeholder: 'Search' } }),
};

async function violations(html) {
  const { document: doc, axe } = dom.window;
  doc.body.innerHTML = html;
  const res = await axe.run(doc.body, AXE_OPTS);
  // Array.from, not .map: axe's own array comes from the jsdom realm, and a
  // deepEqual against a plain [] fails on the prototype rather than the content.
  return Array.from(res.violations, (v) => v.id);
}

test('the component writes the role each panel is named for here', async () => {
  for (const [role, make] of Object.entries(PANELS)) {
    assert.match(
      await make({}), new RegExp(`data-dropdown-panel="" role="${role}"`),
      `the ${role} panel stopped writing role="${role}", so every case below is measuring something else`,
    );
  }
});

test('a head and a foot of text sit in any panel the component draws', async () => {
  // The head arrives as the page's own markup through the unwrapped slot, which
  // is how every head in this kit is written; the foot is the pinned block.
  for (const [role, make] of Object.entries(PANELS)) {
    assert.deepEqual(
      await violations(await make({ header: HEAD, footer: TEXT })), [],
      `a text head and foot are refused in the ${role} panel`,
    );
  }
});

test('a foot of controls belongs in the dialog panel, and axe refuses the other two', async () => {
  const refused = [];
  for (const [role, make] of Object.entries(PANELS)) {
    const ids = await violations(await make({ footer: CONTROLS }));
    if (ids.length) refused.push([role, ids]);
  }
  assert.deepEqual(
    refused.map(([role]) => role), ['menu', 'listbox'],
    'docs/components.md says a list panel takes rows and nothing else, and that the search '
    + 'variant\'s dialog is where a control-bearing foot goes. axe now disagrees: it refused '
    + `${JSON.stringify(refused.map(([role]) => role))}`,
  );
  for (const [role, ids] of refused) {
    assert.ok(
      ids.includes('aria-required-children'),
      `the ${role} panel is refused for some other reason (${ids.join(', ')}) than the one the `
      + 'specification names',
    );
  }
});
