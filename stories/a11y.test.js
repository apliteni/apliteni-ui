// Accessibility gate — a real lifesaver, not noise.
//
// Renders every string-renderable story (exactly what the Storybook a11y panel
// checks) plus the feedback widget, and runs axe-core over each. It fails CI on
// genuine WCAG 2.0/2.1 A + AA violations: a control with no accessible name, an
// ARIA attribute on a role that forbids it, an unlabelled field, and so on.
//
// Deliberately NOT gated (kept quiet, on purpose):
//  - best-practice heuristics like `region` — they flag story content sitting
//    outside a landmark inside the Storybook iframe, which is framing, not a bug.
//  - `color-contrast` — owned by the design tokens and verified visually; axe
//    can't compute real contrast in a headless DOM, so it would only add flake.
//
// This is the same rule set the Storybook panel runs (see .storybook/preview.js),
// so the panel and CI never disagree.

import test from 'node:test';
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

// Swallow jsdom's "Not implemented: HTMLCanvasElement" chatter so CI logs stay clean.
const quietConsole = new VirtualConsole();
quietConsole.on('jsdomError', () => {});

async function violationsFor(html) {
  const dom = new JSDOM(
    `<!doctype html><html lang="en"><head><title>kit</title></head><body>${html}</body></html>`,
    { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: quietConsole },
  );
  dom.window.eval(axeSrc);
  const res = await dom.window.axe.run(dom.window.document.body, AXE_OPTS);
  dom.window.close();
  return res.violations;
}

const fmt = (story, v) =>
  `  ${story} → [${v.impact}] ${v.id}: ${v.help}\n     ${(v.nodes[0]?.html || '').slice(0, 140)}`;

// Recursive, Node-20-safe story discovery (no fs.globSync).
const storyFiles = readdirSync(path.join(root, 'stories'), { recursive: true })
  .map((p) => String(p))
  .filter((p) => p.endsWith('.stories.js'))
  .sort();

for (const rel of storyFiles) {
  test(`a11y: stories/${rel}`, async () => {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    const problems = [];
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      let html;
      try {
        html = render(args, { globals: { theme: 'dark', accent: 'default' }, args });
      } catch {
        // Stories that mount into a live document (e.g. the feedback demo) can't
        // render to a string here; the widget itself is covered separately below.
        continue;
      }
      if (typeof html !== 'string') continue;
      for (const v of await violationsFor(html)) problems.push(fmt(name, v));
    }
    assert.equal(problems.length, 0, `\nAccessibility violations:\n${problems.join('\n')}\n`);
  });
}

test('a11y: feedback widget markup', async () => {
  const { feedbackWidget } = await import(path.join(root, 'src/components/feedback.js'));
  const problems = (await violationsFor(feedbackWidget())).map((v) => fmt('feedbackWidget()', v));
  assert.equal(problems.length, 0, `\nAccessibility violations:\n${problems.join('\n')}\n`);
});
