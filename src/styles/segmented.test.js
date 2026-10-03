// Source CSS contracts. Nothing here lays anything out: the rendered outcome —
// two rows at a phone width, one at 1280, no tab past the strip's edge — is
// measured in a browser by stories/segmented-wrap.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./segmented.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
const valueOf = (selector, prop) => {
  const matches = rules.filter(rule => rule.selector === selector);
  assert.equal(matches.length, 1, `expected one rule for ${selector}`);
  return new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(matches[0].body)?.[1].trim();
};

test('pill strips wrap within their container', () => {
  assert.equal(valueOf('.ui-seg', 'flex-wrap'), 'wrap', 'long pill strips must wrap rather than widen the page');
});

// The claim this sheet makes about the chosen tab is that it IS the sidebar's
// selected row. That is checkable rather than describable: both sheets are read
// and the declarations compared. nav.css carries the row, layout.css the height
// the shell's rail gives its accent bar — which is the rail on the page #527 was
// reported from.
// Top-level rules only: an @media block holds rules with the same selectors —
// the forced-colours restatement below, the shell's folded rail — and reading
// them as one would compare a rule against its own exception.
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
const sheet = (name) => topLevel(readFileSync(new URL(`./${name}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));
const baseCss = topLevel(css);
const navCss = sheet('nav.css');
const layoutCss = sheet('layout.css');
const ruleBody = (text, selector) => {
  const found = [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, sel]) => sel.split(',').map(part => part.trim()).includes(selector));
  assert.equal(found.length, 1, `expected one rule for ${selector}`);
  return found[0][2];
};
const decl = (body, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim();

test('the chosen tab is the sidebar\'s selected row, declaration for declaration', () => {
  const tab = ruleBody(baseCss, '.ui-seg--underline button.is-active');
  const row = ruleBody(navCss, '.ui-nav--side .ui-nav__item.is-active');
  const rowInk = ruleBody(navCss, '.ui-nav__item.is-active');
  assert.equal(decl(tab, 'background'), 'var(--surface)', 'the plate is the reading surface, as the row\'s is');
  assert.equal(decl(tab, 'background'), decl(rowInk, 'background'));
  assert.equal(decl(tab, 'color'), decl(rowInk, 'color'), 'the ink steps to --strong, as the row\'s does');
  assert.equal(decl(tab, 'box-shadow'), decl(row, 'box-shadow'), 'the hairline is the row\'s hairline');
  // The pill rule above paints an accent outline on every chosen button. Left
  // standing it would be a second accent mark on a tab that already has one.
  assert.equal(decl(tab, 'outline'), '0', 'the pill rule\'s accent outline is cancelled here');

  const bar = ruleBody(baseCss, '.ui-seg--underline button.is-active::before');
  const rowBar = ruleBody(navCss, '.ui-nav--side .ui-nav__item.is-active::before');
  for (const prop of ['left', 'width', 'border-radius', 'background', 'transform']) {
    assert.equal(decl(bar, prop), decl(rowBar, prop), `the accent bar's ${prop} is the sidebar's`);
  }
  // Height is the one number the standalone rail and the shell's rail disagree
  // on; the shell's is the rail on the page the issue was reported from.
  assert.equal(decl(bar, 'height'), decl(ruleBody(layoutCss, '.ui-app__rail .ui-nav__item.is-active::before'), 'height'));
});

test('the underline strip draws no rule under its tabs', () => {
  // Artur, on #545: the line under the strip reads as noise. The selection is
  // the chosen tab's own box now, so the rule marked nothing.
  const strip = ruleBody(baseCss, '.ui-seg--underline');
  assert.equal(decl(strip, 'border-bottom'), undefined, 'the strip declares no bottom rule');
  assert.equal(decl(strip, 'border'), undefined);
  assert.equal(decl(ruleBody(baseCss, '.ui-seg--underline button'), 'border-bottom'), undefined, 'no tab reserves a rail');
  // The rows close back to the track's own gap, because a contained highlight
  // belongs to no row but its own. stories/segmented-wrap.test.js measures it.
  assert.equal(decl(strip, 'row-gap'), 'var(--space-1)');
});

test('underline strips wrap and clip nothing', () => {
  // Both declarations are read, so dropping either one fails here rather than in
  // a screenshot. `overflow: visible` is the initial value, so this catches the
  // declaration going missing and NOT clipping reintroduced by a parent or a
  // later rule; stories/segmented-wrap.test.js measures the rendered outcome.
  assert.equal(valueOf('.ui-seg--underline', 'flex-wrap'), 'wrap', 'underline tabs must wrap rather than hide the ones past the fold');
  assert.equal(valueOf('.ui-seg--underline', 'overflow'), 'visible', 'a scroll box would clip the focus ring against the strip padding');
});
