// Accessibility gate — a real lifesaver, not noise.
//
// Renders EVERY story in stories/ — in both themes — and runs axe-core over the
// result. It fails CI on genuine WCAG 2.0/2.1 A + AA violations: a control with
// no accessible name, an ARIA attribute on a role that forbids it, an unlabelled
// field, and so on.
//
// Two things this gate refuses to do, because it used to do both:
//
//  1. Skip quietly. A story that threw (anything calling document.createElement
//     blew up in bare Node) or returned a DOM node instead of a string was
//     silently `continue`d — five stories, including the whole Feedback file,
//     were "covered" by a test that checked nothing. Stories now render inside a
//     JSDOM, DOM output is serialised, and a story that still can't be rendered
//     is a FAILURE, not a skip. The per-file tests also assert that the number of
//     checks run equals stories discovered × themes, and a tally test at the end
//     re-checks that across every file — so a story cannot fall out unnoticed.
//
//  2. Gate one theme. Light mode had never been checked. Both themes run now;
//     accents stay out (they only repaint tokens, and the matrix costs runtime).
//     One JSDOM is created for the whole file and axe is evaluated into it once,
//     so covering the second theme costs a rerun, not a fresh browser each time.
//
// Deliberately NOT gated (kept quiet, on purpose):
//  - best-practice heuristics like `region` — they flag story content sitting
//    outside a landmark inside the Storybook iframe, which is framing, not a bug.
//  - `color-contrast` — owned by the design tokens and verified visually; axe
//    can't compute real contrast in a headless DOM, so it would only add flake.
//
// This is the same rule set the Storybook panel runs (see .storybook/preview.js),
// so the panel and CI never disagree.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const require = createRequire(import.meta.url);
const axeSrc = readFileSync(path.join(path.dirname(require.resolve('axe-core')), 'axe.min.js'), 'utf8');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const AXE_OPTS = {
  runOnly: { type: 'tag', values: WCAG },
  resultTypes: ['violations'],
  rules: { 'color-contrast': { enabled: false } },
};
// Both deck themes. The theme lives on <html data-theme>, exactly as
// .storybook/preview.js applies it, so stories that branch on it see the truth.
const THEMES = ['dark', 'light'];
const ACCENT = 'default';

// Swallow jsdom's "Not implemented: HTMLCanvasElement" chatter so CI logs stay clean.
const quietConsole = new VirtualConsole();
quietConsole.on('jsdomError', () => {});

// One window for the whole file: axe is a ~1MB script and evaluating it per
// story is what made the old single-theme run expensive.
const dom = new JSDOM(
  '<!doctype html><html lang="en"><head><title>kit</title></head><body></body></html>',
  { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: quietConsole },
);
dom.window.eval(axeSrc);
after(() => dom.window.close());

// Plenty of stories build their markup with document.createElement (the feedback
// demo, the icon grid, the motion playground). Give them a real DOM to build in
// instead of letting them throw and vanish from the gate.
for (const key of [
  'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'matchMedia', 'getSelection',
  'Node', 'Element', 'HTMLElement', 'SVGElement', 'DocumentFragment', 'Event', 'CustomEvent',
  'MutationObserver', 'DOMParser', 'NodeFilter',
]) {
  let value;
  // Some of these (localStorage on an opaque origin) throw on read — the kit
  // already guards those call sites, so just don't hand the global over.
  try { value = dom.window[key]; } catch { continue; }
  if (value === undefined) continue;
  // Methods need the window as their receiver; constructors must stay unbound.
  const bound = typeof value === 'function' && /^[a-z]/.test(key) ? value.bind(dom.window) : value;
  // defineProperty, not assignment: Node ships some of these (navigator) as
  // getter-only globals that a plain `=` would throw on.
  Object.defineProperty(globalThis, key, { value: bound, configurable: true, writable: true });
}

// Storybook's HTML renderer accepts a string or a DOM node. Accept exactly those
// two; anything else is a gap in coverage and must be loud.
function serialize(out) {
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') {
    if (typeof out.outerHTML === 'string') return out.outerHTML;
    if (out.nodeType === 11) return [...out.childNodes].map((n) => n.outerHTML ?? n.textContent).join('');
    if (out.nodeType === 3) return out.textContent;
  }
  return null;
}

async function violationsFor(html, theme) {
  const { document: doc, axe } = dom.window;
  doc.documentElement.setAttribute('data-theme', theme);
  if (ACCENT === 'default') doc.documentElement.removeAttribute('data-accent');
  else doc.documentElement.setAttribute('data-accent', ACCENT);
  doc.body.innerHTML = html;
  const res = await axe.run(doc.body, AXE_OPTS);
  return res.violations;
}

const fmt = (story, theme, v) =>
  `  ${story} [${theme}] → [${v.impact}] ${v.id}: ${v.help}\n     ${(v.nodes[0]?.html || '').slice(0, 140)}`;

// Recursive, Node-20-safe story discovery (no fs.globSync).
const storyFiles = readdirSync(path.join(root, 'stories'), { recursive: true })
  .map((p) => String(p))
  .filter((p) => p.endsWith('.stories.js'))
  .sort();

// Running tally, asserted at the end so a whole FILE can't drop out either.
const tally = { files: 0, discovered: 0, checked: 0 };

for (const rel of storyFiles) {
  test(`a11y: stories/${rel}`, async () => {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    const problems = [];
    let discovered = 0;
    let checked = 0;

    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      discovered += 1;
      const args = { ...def.args, ...story.args };

      for (const theme of THEMES) {
        let out;
        try {
          out = render(args, { globals: { theme, accent: ACCENT }, args });
        } catch (err) {
          // A story that won't render is not covered. Say so instead of skipping.
          problems.push(`  ${name} [${theme}] → render threw: ${err && err.message}`);
          continue;
        }
        const html = serialize(out);
        if (html == null) {
          problems.push(
            `  ${name} [${theme}] → render returned ${Object.prototype.toString.call(out)};`
            + ' the gate can only check a string or a DOM node',
          );
          continue;
        }
        checked += 1;
        for (const v of await violationsFor(html, theme)) problems.push(fmt(name, theme, v));
      }
    }

    tally.files += 1;
    tally.discovered += discovered;
    tally.checked += checked;

    assert.ok(discovered > 0, `no stories found in stories/${rel} — did the export shape change?`);
    assert.equal(problems.length, 0, `\nAccessibility violations:\n${problems.join('\n')}\n`);
    assert.equal(
      checked, discovered * THEMES.length,
      `stories/${rel}: ${discovered} stories × ${THEMES.length} themes should be `
      + `${discovered * THEMES.length} checks, ran ${checked}`,
    );
  });
}

test('a11y: feedback widget markup', async () => {
  const { feedbackWidget } = await import(path.join(root, 'src/components/feedback.js'));
  const problems = [];
  for (const theme of THEMES) {
    for (const v of await violationsFor(feedbackWidget(), theme)) problems.push(fmt('feedbackWidget()', theme, v));
  }
  assert.equal(problems.length, 0, `\nAccessibility violations:\n${problems.join('\n')}\n`);
});

// The gate's own gate. If a story file stops exporting stories, if a story stops
// rendering, or if someone re-introduces a silent `continue`, these numbers move
// and this fails — which is the whole point: coverage you can count.
test('a11y: every discovered story was actually checked, in every theme', () => {
  assert.equal(tally.files, storyFiles.length, 'every story file ran');
  assert.ok(tally.discovered > 0, 'stories were discovered');
  assert.equal(
    tally.checked, tally.discovered * THEMES.length,
    `${tally.discovered} stories × ${THEMES.length} themes = ${tally.discovered * THEMES.length} `
    + `checks expected, ran ${tally.checked}`,
  );
});
