// Accessibility gate — a real lifesaver, not noise.
//
// Renders EVERY story in stories/, in both themes but not every accent, and
// runs axe-core over the result — the same rule set the Storybook panel runs
// (.storybook/preview.js), so the two never disagree.
//
// A story that will not render is a failure rather than a skip, and the count is
// asserted so a story cannot fall out of the set unnoticed:
// why: CONTRIBUTING.md#a-subject-a-gate-cannot-check-is-a-failure-never-a-skip
//
// `region` and `color-contrast` stay deliberately quiet — the first flags story
// content outside a landmark inside the Storybook iframe, the second reads the
// kit's unresolved var() as no colour at all. stories/contrast.test.js gates
// contrast instead.

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
