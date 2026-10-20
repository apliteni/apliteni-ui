/* Rule: a foreground/background pair the kit renders as text must clear WCAG AA,
 * or be named in stories/lib/contrast-ledger.js by a person who decided it is acceptable.
 *
 * The first part of the light half of the walk, plus every self-check in the old
 * stories/contrast.test.js that does not depend on the shared `walk` and so needed no second copy:
 * the toast/success-panel/chip self-checks, the alternate-accent ledger (CONTRAST_ACCENTS=1), and
 * the accent discovery check. See stories/contrast-dark.test.js for why the walk is split by theme
 * and stories/lib/contrast-part.js for how each theme is dealt over several files.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { card, successPanel } from '../src/components/index.js';
import { success } from '../src/components/success.js';
import {
  AA_TEXT,
  catalogueIds,
  composite,
  effectiveBackground,
  groupFindings,
  kitCssFor,
  parseColour,
  ratio,
  rgbOf,
  substitute,
  walkStoriesParallel,
} from './lib/contrast.js';
import {
  ACCENT_LEDGER, ALTERNATE_CAUSES, bucketsFor, show,
} from './lib/contrast-ledger.js';
import { walkPart } from './lib/contrast-part.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const THEME = 'light';
const THEMES = ['dark', 'light'];
const ACCENT = 'default';
const accentCss = readFileSync(path.join(root, 'src/tokens/accents.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const ACCENTS = ['default', ...new Set([...accentCss.matchAll(/\[data-accent="([^"]+)"\]/g)]
  .map((match) => match[1]))];

// The light walk is dealt over the part files (stories/lib/contrast-parts.js). This file is part 0:
// it owns the ledger, and it holds the self-checks below.
await walkPart('light', 0);

// ---- self-checks that do not depend on `walk`, so one copy covers both themes ----

test('the five toast statuses resolve to five different accents and five different action inks', () => {
  // Guards the A1 rewrite. Before it, --toast-accent flattened first-wins and
  // all five statuses reported the success green.
  const accents = {
    success: '--green', danger: '--pink', warn: '--amber', info: '--cyan', neutral: '--muted',
  };
  const inks = {
    success: '--chip-success-ink',
    danger: '--chip-danger-ink',
    warn: '--chip-warn-ink',
    info: '--chip-info-ink',
    neutral: '--text',
  };
  for (const theme of THEMES) {
    const { vars, css } = kitCssFor(theme, ACCENT);
    const html = Object.keys(accents)
      .map((s) => `<div class="ui-toast ui-toast--${s}" id="t-${s}">`
        + '<div class="ui-toast__timer"></div><button class="ui-toast__action">Go</button></div>')
      .join('');
    const win = new JSDOM(
      `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
      + `<body>${html}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    const probes = [
      ['accent', '.ui-toast__timer', 'backgroundColor', accents],
      ['action ink', '.ui-toast__action', 'color', inks],
    ];
    for (const [what, sel, prop, tokens] of probes) {
      const seen = new Set();
      for (const [status, token] of Object.entries(tokens)) {
        const el = win.document.querySelector(`#t-${status} ${sel}`);
        const got = win.getComputedStyle(el)[prop];
        assert.equal(
          got, rgbOf(substitute(vars.get(token), vars)),
          `in ${theme}, the ${status} toast's ${what} resolved to ${got}, not ${token}. `
          + 'A contextual custom property has flattened — every toast is reporting one status\'s colour.',
        );
        seen.add(got);
      }
      assert.equal(
        seen.size, 5,
        `the five toast ${what}s collapsed to ${seen.size} colour(s) in ${theme}`,
      );
    }
    win.close();
  }
});

// #429 took the tinted disc out from behind the tick, so the mark now paints straight
// onto the panel wash and there is one ground to measure rather than two.
// This measures solid paint; browser pixel evidence covers the mark's size and animation.
test('the success-panel tick clears 3:1 against the panel wash in both themes', () => {
  for (const theme of THEMES) {
    const { css } = kitCssFor(theme, ACCENT);
    const win = new JSDOM(
      `<!doctype html><html data-theme="${theme}"><head><style>${css}</style></head>`
      + `<body>${card({ body: successPanel() })}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    try {
      const tick = win.document.querySelector('.ui-success__check .ui-sx__tick');
      assert.ok(tick, `${theme}: the panel must render its tick`);
      assert.equal(
        win.document.querySelector('.ui-success__check .ui-sx__disc'), null,
        `${theme}: a tinted disc is back behind the tick — the ground this measures is the wash alone`,
      );
      const ink = parseColour(win.getComputedStyle(tick).stroke);
      const wash = effectiveBackground(tick, win);
      assert.ok(ink && Array.isArray(wash), `${theme}: check paint must resolve`);
      assert.ok(ink[3] === 1, `${theme}: tick is opaque`);
      const measured = ratio(ink, wash);
      assert.ok(measured >= 3, `${theme}: success-panel tick on the panel wash is ${measured.toFixed(2)}:1`);
    } finally {
      win.close();
    }
  }
});

/* The page-sized mark, on every ground it actually reaches.
 *
 * why: docs/components.md#success-confirmations
 */
test('the page confirmation\'s mark clears 3:1 on every ground and mark it has', () => {
  const LAYOUTS = ['hero', 'split', 'compact'];
  const MARKS = ['line', 'circled'];
  let measured = 0;
  for (const theme of THEMES) {
    const { css } = kitCssFor(theme, ACCENT);
    const bodies = LAYOUTS.flatMap((layout) => MARKS.map((check) =>
      success({ layout, check, title: 'Saved', body: 'A receipt is on its way.' })));
    const win = new JSDOM(
      `<!doctype html><html data-theme="${theme}"><head><style>${css}</style></head>`
      + `<body>${bodies.join('')}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    try {
      const roots = [...win.document.querySelectorAll('.ui-sx')];
      assert.equal(roots.length, LAYOUTS.length * MARKS.length,
        `${theme}: expected one card per layout and mark, found ${roots.length}`);
      for (const root2 of roots) {
        const where = [...root2.classList].filter((c) => c.startsWith('ui-sx--')).join(' ');
        const strokes = [...root2.querySelectorAll('.ui-sx__tick, .ui-sx__circle')];
        assert.ok(strokes.length >= 1, `${theme} ${where}: the card drew no mark to measure`);
        assert.equal(root2.querySelector('.ui-sx__disc'), null,
          `${theme} ${where}: a tinted disc is back — the ground measured here is the surface alone`);
        for (const stroke of strokes) {
          const ink = parseColour(win.getComputedStyle(stroke).stroke);
          const ground = effectiveBackground(stroke, win);
          assert.ok(ink && Array.isArray(ground), `${theme} ${where}: mark paint must resolve`);
          assert.equal(ink[3], 1, `${theme} ${where}: the mark is opaque`);
          const r = ratio(ink, ground);
          assert.ok(r >= 3, `${theme} ${where}: the mark is ${r.toFixed(2)}:1 against its ground`);
          measured += 1;
        }
      }
    } finally {
      win.close();
    }
  }
  // 2 themes x 3 layouts x (1 line stroke + 2 circled strokes).
  assert.equal(measured, 2 * 3 * 3,
    `${measured} strokes measured, expected 18 — a layout or a mark stopped being covered`);
});

test('every chip ink/fill token pair clears AA, whether or not a story renders it', () => {
  const src = readFileSync(path.join(root, 'src/tokens/tokens.css'), 'utf8');
  const families = [...new Set([...src.matchAll(/--chip-([a-z]+)-ink\s*:/g)].map((m) => m[1]))];

  assert.ok(
    families.length >= 3,
    `only ${families.length} chip families were derived from src/tokens/tokens.css. A rename `
    + 'would make this test pass by matching nothing, which is the failure mode it exists to avoid.',
  );

  const problems = [];
  for (const theme of THEMES) {
    const { vars, css } = kitCssFor(theme, ACCENT);
    const probes = families
      .map((f) => `#chip-${f}{color:var(--chip-${f}-ink);background:var(--chip-${f}-fill)}`)
      .join('');
    const win = new JSDOM(
      `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style>`
      + `<style>${substitute(probes, vars)}</style></head><body>`
      + `${families.map((f) => `<span id="chip-${f}">x</span>`).join('')}</body></html>`,
      { pretendToBeVisual: true },
    ).window;
    const page = parseColour(substitute(vars.get('--bg'), vars));
    for (const family of families) {
      const cs = win.getComputedStyle(win.document.getElementById(`chip-${family}`));
      const ink = parseColour(cs.color);
      const fill = parseColour(cs.backgroundColor);
      if (!ink || !fill) {
        problems.push(`${theme} ${family}: ink or fill did not resolve (${cs.color} / ${cs.backgroundColor})`);
        continue;
      }
      const r = ratio(ink, composite(fill, page));
      if (r < AA_TEXT) problems.push(`${theme} --chip-${family}-ink on --chip-${family}-fill is ${r.toFixed(2)}`);
    }
    win.close();
  }
  assert.deepEqual(
    problems, [],
    `\n${problems.join('\n')}\n\nA chip pair is the ink and fill of a status badge. Both halves `
    + 'move together or neither does; fix the pair in src/tokens/tokens.css.',
  );
});

// ---- alternate accents: the same ledger causes, separately pinned cells ---
// Run locally: CONTRAST_ACCENTS=1 node --test --test-name-pattern='contrast ledger:' stories/contrast-light.test.js

test('the accent gate discovers every shipped accent', () => {
  assert.ok(ACCENTS.length >= 4, 'accent discovery lost a shipped accent');
  assert.deepEqual(Object.keys(ACCENT_LEDGER).sort(), ACCENTS.filter((a) => a !== ACCENT)
    .flatMap((accent) => THEMES.map((theme) => `${theme}/${accent}`)).sort(),
  'each shipped alternate cell needs a live ledger');
  for (const entry of ALTERNATE_CAUSES) {
    assert.ok(entry.why.length > 200, `ledger ${entry.id} needs a hand-written cause and owner`);
  }
});

for (const accent of ACCENTS.filter((a) => a !== ACCENT)) {
  for (const theme of THEMES) {
    test(`contrast ledger: ${theme}/${accent}`, {
      skip: process.env.CONTRAST_ACCENTS !== '1',
      // Allow for the shared setup and a full cell on busy local hosts.
      timeout: 600_000,
    }, async () => {
      const started = Date.now();
      const result = await walkStoriesParallel({ theme, accent, states: true });
      const findings = groupFindings(result.records);
      if (process.env.CONTRAST_LEDGER_REPORT === '1') {
        const measured = Object.fromEntries(ALTERNATE_CAUSES.flatMap((entry) => {
          const rows = findings.filter((f) => bucketsFor(f, ALTERNATE_CAUSES).includes(entry));
          return rows.length ? [[entry.id, [rows.length,
            Number(Math.min(...rows.map((f) => f.ratio)).toFixed(2))]]] : [];
        }));
        console.log(`CONTRAST_LEDGER ${JSON.stringify({
          cell: `${theme}/${accent}`, measured,
          unassigned: findings.filter((f) => bucketsFor(f, ALTERNATE_CAUSES).length !== 1).map(show),
        })}`);
      }
      console.log(`contrast alternate: ${theme}/${accent}, ${((Date.now() - started) / 1000).toFixed(2)} added seconds, ${result.stats.judged} pairs, ${findings.length} findings`);
      assert.deepEqual(result.problems, [], 'every alternate-accent story must render');
      // storyIds does not vary by theme — every story mounts regardless of which theme's CSS
      // it is read against — so the whole catalogue is the right baseline for a dark-accent cell too.
      assert.deepEqual([...result.stats.storyIds].sort(), [...await catalogueIds()].sort(),
        'each cell must reach the default catalogue');
      assert.ok(result.stats.judged > 2500, 'each cell must judge real pairs');
      assert.deepEqual(result.stats.uaBlue, [], 'alternate styles must resolve link colours');
      const expected = ACCENT_LEDGER[`${theme}/${accent}`] || {};
      for (const finding of findings) {
        const hits = bucketsFor(finding, ALTERNATE_CAUSES);
        assert.equal(hits.length, 1, `unledgered or ambiguous ${show(finding)}`);
        assert.ok(expected[hits[0].id], `new cause in ${theme}/${accent}: ${show(finding)}`);
      }
      for (const [id, [count, worst]] of Object.entries(expected)) {
        const rows = findings.filter((f) => bucketsFor(f, ALTERNATE_CAUSES).some((e) => e.id === id));
        assert.equal(rows.length, count, `${theme}/${accent} bucket ${id}:\n${rows.map(show).join('\n')}`);
        assert.ok(Math.min(...rows.map((f) => f.ratio)) >= worst - 0.005,
          `${theme}/${accent} bucket ${id} deepened below ${worst}:\n${rows.map(show).join('\n')}`);
      }
      assert.equal(findings.length, Object.values(expected).reduce((n, [count]) => n + count, 0));
    });
  }
}
