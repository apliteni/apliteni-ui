// Source CSS contract: the top bar's view switch is a view switch, so its
// current view takes the neutral selected fill — the strong ink on the surface,
// never the accent. The rendered half is stories/topbar-rows.test.js's; this
// file holds the declaration that half depends on, so deleting it fails here
// without a browser.
// why: guidelines/colour-and-theming.md, "Use the neutral form for a view switch"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

const css = readFileSync(new URL('./topbar.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Top-level rules only: the forced-colours restatement below repeats the
// selector, and reading the two as one would compare a rule against its own
// exception.
const topLevel = (text) => {
  let depth = 0, out = '', skipping = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    if (!skipping && ch === '{' && /@[a-z-]+[^{}]*$/i.test(out)) { skipping = depth; out = out.replace(/@[a-z-]+[^{}]*$/i, ''); }
    if (!skipping) out += ch;
    if (ch === '}') { depth -= 1; if (skipping && depth < skipping) skipping = 0; }
  }
  return out;
};

const ruleBody = (selector) => {
  const found = [...topLevel(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, sel]) => splitSelectorList(sel).includes(selector));
  assert.equal(found.length, 1, `expected one top-level rule for ${selector}`);
  return found[0][2];
};
const decl = (body, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim();

test('the view switch marks its current view with the strong ink on the surface, no accent', () => {
  const cur = ruleBody('.dtsw a.cur');
  assert.equal(decl(cur, 'color'), 'var(--surface)', 'the current view ink is the surface, not accent contrast');
  assert.equal(decl(cur, 'background'), 'var(--strong)', 'the current view fill is the strong ink, not the accent');
  assert.equal(decl(cur, 'box-shadow'), undefined, 'the current view draws no accent edge');
});
