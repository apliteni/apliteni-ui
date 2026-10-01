/* Rule: every badge and pill tone paints ONE soft family. On each ground the kit draws a
 * chip on, every tone's fill leaves that ground in the same direction — lighter in dark,
 * darker in light — by a comparable amount, draws no edge, and keeps its ink above AA.
 *
 * Three grounds and four accents, because the #485 review found a 4.06:1 chip that this
 * gate had passed while it measured the card alone, under three accents of four.
 * why: docs/specification.md#colour-and-contrast, #453
 *
 * Limits: it resolves the source cascade in JSDOM, so no layout and no real pixels. Ink is
 * measured against the chip's own composited fill and the fill against the ground that
 * composites it. Rendered-pixel measurement of the same pairs stays with
 * stories/contrast.test.js (page) and stories/dropdown-state-contrast.test.js (panel).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { AA_TEXT, effectiveBackground, kitCssFor, luminance, parseColour, ratio } from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (p) => readFileSync(path.join(root, p), 'utf8');
const badgeCss = readSrc('src/styles/badge.css').replace(/\/\*[\s\S]*?\*\//g, '');

/** Discovered from the stylesheet, so a tone added there is measured without
 *  anyone remembering to list it here. The bare `.ui-badge` and `.ui-pill` count:
 *  badge('Neutral') renders no modifier at all. */
const TONES = [...new Set([...badgeCss.matchAll(/^\.(ui-(?:badge|pill))(--[\w-]+)?\s*\{/gm)]
  .map(([, base, mod]) => `${base}${mod || ''}`))];

/** Discovered from accents.css the way stories/contrast.test.js discovers them, so a
 *  fifth accent is measured on the commit that adds it. */
const ACCENTS = ['default', ...new Set([...readSrc('src/tokens/accents.css')
  .matchAll(/\[data-accent="([^"]+)"\]/g)].map(([, a]) => a))];

/* The grounds the kit paints a chip on, in elevation order. Each names the real class
   whose background the chip composites against, so a token move under any of them is
   measured rather than approximated. `page` is bare body — src/styles/base.css paints it
   --bg; the other two carry the class that sets their surface. */
const GROUNDS = [
  { name: 'page', open: '<div id="panel">', close: '</div>' },
  { name: 'card', open: '<div class="ui-card" id="panel">', close: '</div>' },
  {
    name: 'floating panel',
    open: '<div class="ui-dropdown"><div class="ui-dropdown__panel" id="panel">',
    close: '</div></div>',
  },
];

// The direction each theme's soft fill has to travel off the ground it sits on.
const UP = { dark: true, light: false };
/* A fill that no longer separates is invisible; one that separates like a solid block is
 * no longer soft. The floor is per ground: a light glow wash sits close to --bg, so warn
 * and pending measure 1.043 on the light page — pre-existing, and legible because a status
 * chip is told apart by its ink too. The non-status tones this gate exists for measure
 * 1.222 there. Thinnest pairs and their grounds are tabulated in the spec.
 * why: docs/specification.md#colour-and-contrast */
const BAND_CEILING = 1.6;
const bandFloor = (theme, ground) => (theme === 'light' && ground === 'page' ? 1.03 : 1.1);

function measure(theme, accent, ground) {
  const { css } = kitCssFor(theme, accent);
  const html = TONES.map((tone) => {
    const base = tone.startsWith('ui-pill') ? 'ui-pill' : 'ui-badge';
    const cls = tone === base ? base : `${base} ${tone}`;
    return `<span class="${cls}" data-tone="${tone}">Tone</span>`;
  }).join('');
  const attrs = `data-theme="${theme}"${accent === 'default' ? '' : ` data-accent="${accent}"`}`;
  const win = new JSDOM(`<!doctype html><html lang="en" ${attrs}>`
    + `<head><style>${css}</style></head><body>${ground.open}${html}${ground.close}</body></html>`,
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

/** Every case this gate claims to cover, built once so the coverage count below is the
 *  same list the assertions walk rather than a number kept in step by hand. */
const CASES = ['dark', 'light'].flatMap((theme) => ACCENTS
  .flatMap((accent) => GROUNDS.map((ground) => ({ theme, accent, ground }))));

test('the tone list is discovered from the stylesheet and covers every shipped tone', () => {
  assert.ok(TONES.length >= 10, `only ${TONES.length} badge tones discovered; the regex has stopped `
    + 'matching src/styles/badge.css and this gate would silently measure a subset');
  for (const expected of ['ui-badge', 'ui-pill', 'ui-badge--soon', 'ui-badge--archive',
    'ui-badge--neutral', 'ui-badge--live', 'ui-badge--success', 'ui-badge--warn',
    'ui-badge--pending', 'ui-badge--info', 'ui-badge--danger', 'ui-pill--soon', 'ui-pill--live']) {
    assert.ok(TONES.includes(expected), `${expected} is in badge.css but not in the discovered set`);
  }
});

test('the measured set covers every theme, accent and ground, and nothing is skipped', () => {
  assert.ok(ACCENTS.length >= 4, `only ${ACCENTS.length} accents discovered in src/tokens/accents.css; `
    + 'the #485 defect passed under one accent and failed under three, so a short list proves little');
  assert.equal(GROUNDS.length, 3, 'a chip ground was added or dropped; page, card and floating panel '
    + 'are the three surfaces the kit puts a chip on, and the panel is the one #485 shipped a failure on');
  assert.equal(CASES.length, 2 * ACCENTS.length * GROUNDS.length,
    'the case list is no longer the product of themes, accents and grounds');
  /* Every ground has to resolve the surface its class actually paints, or a typo'd class
     would silently measure the page three times and still report full coverage.
     Dark has three distinct surfaces. Light has two: --surface and --bg-elevated are both
     #ffffff there by design, so a light card and a light floating panel ARE the same
     ground, and the case stays in the list because the chip's own fill still composites
     against it and a future light elevation would split them. What must never collapse is
     the page into either, since that is the pair the grounds exist to tell apart. */
  const resolved = Object.fromEntries(['dark', 'light'].map((theme) => [theme,
    GROUNDS.map((ground) => measure(theme, 'default', ground).panel.join(','))]));
  assert.equal(new Set(resolved.dark).size, 3,
    `dark's three grounds must composite to three different colours (${resolved.dark.join(' / ')}); `
    + 'a ground whose class no longer paints is not a measured case');
  const [lightPage, lightCard, lightPanel] = resolved.light;
  assert.equal(lightCard, lightPanel,
    'light --surface and --bg-elevated are both #ffffff; if they have split, give the light '
    + 'panel its own expected numbers rather than letting this note go stale');
  assert.notEqual(lightPage, lightCard,
    `the light page composited to the same colour as the light card (${lightPage}); the page `
    + 'is the thinnest ground in light and collapsing it would hide the pairs this gate added');
});

for (const { theme, accent, ground } of CASES) {
  const where = `${theme} / ${accent} / ${ground.name}`;

  test(`every badge tone leaves the ${ground.name} the same way — ${theme}, ${accent}`, () => {
    const { rows } = measure(theme, accent, ground);
    assert.equal(rows.length, TONES.length, 'a discovered tone rendered nothing to measure');
    const wrong = rows.filter((r) => r.lighter !== UP[theme]);
    assert.deepEqual(
      wrong.map((r) => `${r.tone} → rgb(${r.fill.slice(0, 3).map(Math.round)})`), [],
      `on the ${where} a soft fill goes the wrong way: every tone must be `
      + `${UP[theme] ? 'lighter' : 'darker'} than its ground, so the set reads as one family.`,
    );
  });

  test(`every badge tone is a soft, edgeless fill with legible ink — ${where}`, () => {
    const { rows } = measure(theme, accent, ground);
    const problems = [];
    for (const r of rows) {
      const floor = bandFloor(theme, ground.name);
      if (r.separation < floor || r.separation > BAND_CEILING) {
        problems.push(`${r.tone} separates from the ${ground.name} by ${r.separation.toFixed(3)}, outside ${floor}–${BAND_CEILING}`);
      }
      if (r.edges.length) problems.push(`${r.tone} draws an edge on ${r.edges.join(', ')}`);
      if (r.ink < AA_TEXT) problems.push(`${r.tone} ink measures ${r.ink.toFixed(2)} on its own fill`);
    }
    assert.deepEqual(problems, [], `on the ${where}:\n${problems.join('\n')}`);
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

test('the ink check rejects accent ink on the neutral fill, on the ground it actually fails', () => {
  // The #485 mutation, and the reason the ground loop exists. Soon shipped
  // `color: var(--accent)` on --chip-neutral-fill. On a card that passes under every
  // accent; on a floating panel in dark it reads 4.06–4.25:1 under three of the four.
  // If this ever stops failing, the loop above has lost either the panel or the accents.
  // JSDOM does not resolve var() in an inline style, so the accent arrives as the literal
  // the cascade would have produced — kitCssFor hands back the same resolved token map it
  // substituted into the stylesheet.
  const onPanel = (accent, inkCss) => {
    const { css, vars } = kitCssFor('dark', accent);
    const attrs = `data-theme="dark"${accent === 'default' ? '' : ` data-accent="${accent}"`}`;
    const resolvedInk = inkCss === null ? null : vars.get(inkCss);
    assert.ok(inkCss === null || /^#|^rgb|^hsl|^color/.test(resolvedInk || ''),
      `${inkCss} resolved to ${resolvedInk} for accent ${accent}; an unresolved token would `
      + 'make the mutation below paint nothing and pass for the wrong reason');
    const ink = resolvedInk === null ? '' : ` style="color: ${resolvedInk}"`;
    const win = new JSDOM(`<!doctype html><html lang="en" ${attrs}>`
      + `<head><style>${css}</style></head><body><div class="ui-dropdown">`
      + `<div class="ui-dropdown__panel"><span class="ui-badge ui-badge--soon"${ink}>Soon</span>`
      + '</div></div></body></html>', { pretendToBeVisual: true }).window;
    const chip = win.document.querySelector('.ui-badge--soon');
    const measured = ratio(parseColour(win.getComputedStyle(chip).color), effectiveBackground(chip, win));
    win.close();
    return measured;
  };

  const failures = [];
  for (const accent of ACCENTS) {
    const ink = onPanel(accent, '--accent');
    if (ink < AA_TEXT) failures.push(`${accent} ${ink.toFixed(2)}`);
  }
  assert.ok(failures.length >= 3,
    'accent ink on the neutral fill must still measure under the floor on a dark floating '
    + `panel under most accents — got ${failures.length} failing (${failures.join(', ') || 'none'}). `
    + 'If the tokens moved so this passes, say so here; until then the ink loop above is '
    + 'what stops it shipping, and this proves that loop can fail.');

  // And the shipped tone clears it on the same ground, under every accent.
  for (const accent of ACCENTS) {
    const ink = onPanel(accent, null);
    assert.ok(ink >= 7, `shipped Soon reads ${ink.toFixed(2)} on a dark panel under ${accent}; `
      + 'body ink is meant to clear the 7:1 body aim on every ground');
  }
});
