/* Rule: every badge and pill tone paints ONE soft family. On a card, each tone's fill
 * leaves the card in the same direction — lighter in dark, darker in light — by a
 * comparable amount, draws no edge, and keeps its ink above the AA text floor.
 *
 * The direction check is the point: before #453 the tones with no status painted the
 * opaque --surface, which failed no ratio and still read as a different family.
 * why: docs/specification.md#elevation, #453
 *
 * Limits: it resolves the source cascade in JSDOM, so no layout and no real pixels. It
 * measures the card ground only — the page belongs to stories/contrast.test.js and the
 * floating panel to stories/dropdown-state-contrast.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { effectiveBackground, kitCssFor, luminance, parseColour, ratio } from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const badgeCss = readFileSync(path.join(root, 'src/styles/badge.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** Discovered from the stylesheet, so a tone added there is measured without
 *  anyone remembering to list it here. The bare `.ui-badge` and `.ui-pill` count:
 *  badge('Neutral') renders no modifier at all. */
const TONES = [...new Set([...badgeCss.matchAll(/^\.(ui-(?:badge|pill))(--[\w-]+)?\s*\{/gm)]
  .map(([, base, mod]) => `${base}${mod || ''}`))];

// The direction each theme's soft fill has to travel off the card it sits on.
const UP = { dark: true, light: false };
// A fill that no longer separates is invisible; one that separates like a solid
// block is no longer soft. Both ends are measured, not asserted — the widest real
// pair on a card today is the dark success glow.
const BAND = [1.1, 1.6];

function measure(theme) {
  const { css } = kitCssFor(theme);
  const html = TONES.map((tone) => {
    const base = tone.startsWith('ui-pill') ? 'ui-pill' : 'ui-badge';
    const cls = tone === base ? base : `${base} ${tone}`;
    return `<span class="${cls}" data-tone="${tone}">Tone</span>`;
  }).join('');
  const win = new JSDOM(`<!doctype html><html lang="en" data-theme="${theme}">`
    + `<head><style>${css}</style></head><body><div class="ui-card" id="panel">${html}</div></body></html>`,
    { pretendToBeVisual: true }).window;
  const panel = effectiveBackground(win.document.getElementById('panel'), win);
  const rows = [...win.document.querySelectorAll('[data-tone]')].map((el) => {
    const cs = win.getComputedStyle(el);
    const fill = effectiveBackground(el, win);
    return {
      tone: el.dataset.tone,
      fill,
      lighter: luminance(fill) > luminance(panel),
      separation: ratio(fill, panel),
      ink: ratio(parseColour(cs.color), fill),
      edges: ['Top', 'Right', 'Bottom', 'Left'].filter((side) => {
        const style = cs[`border${side}Style`];
        return !['none', 'hidden', ''].includes(style) && parseFloat(cs[`border${side}Width`]) > 0;
      }),
    };
  });
  win.close();
  return { panel, rows };
}

test('the tone list is discovered from the stylesheet and covers every shipped tone', () => {
  assert.ok(TONES.length >= 10, `only ${TONES.length} badge tones discovered; the regex has stopped `
    + 'matching src/styles/badge.css and this gate would silently measure a subset');
  for (const expected of ['ui-badge', 'ui-pill', 'ui-badge--soon', 'ui-badge--archive',
    'ui-badge--neutral', 'ui-badge--live', 'ui-badge--success', 'ui-badge--warn',
    'ui-badge--pending', 'ui-badge--info', 'ui-badge--danger', 'ui-pill--soon', 'ui-pill--live']) {
    assert.ok(TONES.includes(expected), `${expected} is in badge.css but not in the discovered set`);
  }
});

for (const theme of ['dark', 'light']) {
  test(`every badge tone leaves the card the same way in ${theme}`, () => {
    const { rows } = measure(theme);
    assert.equal(rows.length, TONES.length, 'a discovered tone rendered nothing to measure');
    const wrong = rows.filter((r) => r.lighter !== UP[theme]);
    assert.deepEqual(
      wrong.map((r) => `${r.tone} → rgb(${r.fill.slice(0, 3).map(Math.round)})`), [],
      `in ${theme} a soft fill goes the wrong way off the card: every tone must be `
      + `${UP[theme] ? 'lighter' : 'darker'} than the panel, so the set reads as one family.`,
    );
  });

  test(`every badge tone is a soft, edgeless fill with legible ink in ${theme}`, () => {
    const { rows } = measure(theme);
    const problems = [];
    for (const r of rows) {
      if (r.separation < BAND[0] || r.separation > BAND[1]) {
        problems.push(`${r.tone} separates from the card by ${r.separation.toFixed(2)}, outside ${BAND.join('–')}`);
      }
      if (r.edges.length) problems.push(`${r.tone} draws an edge on ${r.edges.join(', ')}`);
      if (r.ink < 4.5) problems.push(`${r.tone} ink measures ${r.ink.toFixed(2)} on its own fill`);
    }
    assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
  });
}

test('the direction check rejects a tone put back on the opaque card surface', () => {
  // The #453 mutation: one tone re-pointed at --surface, which is what every
  // neutral tone painted before. In dark that lands it below the card it sits on.
  const { css } = kitCssFor('dark');
  const win = new JSDOM(`<!doctype html><html lang="en" data-theme="dark">`
    + `<head><style>${css}</style></head>`
    + '<body><div class="ui-card" id="panel"><span class="ui-badge ui-badge--soon">Soon</span></div></body></html>',
    { pretendToBeVisual: true }).window;
  const panel = effectiveBackground(win.document.getElementById('panel'), win);
  const chip = win.document.querySelector('.ui-badge--soon');
  assert.ok(luminance(effectiveBackground(chip, win)) > luminance(panel), 'the shipped tone is lighter');
  chip.style.background = 'var(--surface)';
  assert.ok(!(luminance(effectiveBackground(chip, win)) > luminance(panel)),
    'a chip painted with the opaque card surface must not read as lighter than the card — '
    + 'if this holds, the direction check above cannot fail and proves nothing');
  win.close();
});
