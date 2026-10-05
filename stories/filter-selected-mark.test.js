/* Rule: the chosen value in a filter menu is never marked by colour alone.
 *
 * The wash is a ~1.2:1 step, so on its own it is what WCAG 2.2 SC 1.4.1 forbids;
 * the kit's 16px check is the non-colour cue, and SC 1.4.11 asks 3:1 of it. This
 * measures the pair, and what hover, the keyboard cursor and focus may not take
 * away — each sets an opaque `--surface`, and focus has to be the kit ring rather
 * than a native outline (#457). Hover is measured, not declared: its step off the
 * wash is read as a ratio. Subjects are swept from the stories, not listed, and a
 * sweep that finds none fails.
 * why: docs/specification.md#a-filter-row-holds-its-panels,
 *      guidelines/accessibility-floor.md#status-labels
 */

/* State what this test cannot measure.
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - Pixels. JSDOM lays nothing out and anti-aliases nothing, so a 16px glyph
 *     is measured as a colour on a ground, not as a drawn mark. The slot check
 *     below reads what the cascade gives the mark in each of a chip panel's three
 *     geometries; the width that slot comes out as in a browser, at four
 *     viewports, is scripts/evidence/filter-bar-fit.mjs's measurement.
 *   - Colour-vision simulation. It measures luminance contrast, which is what
 *     1.4.11 is written in; that a dichromat cannot separate the two hues is the
 *     reason the check exists and is not itself computed here.
 *   - The React half. The rule is one kit declaration both faces load;
 *     react/src/Dropdown.test.tsx matches it against React's rendered tree, and
 *     the browser gate measures both halves.
 *   - The default accent only. The other five accents redefine --glow-purple
 *     and are walked by `CONTRAST_ACCENTS=1 stories/contrast.test.js`.
 *   - `:focus-visible` as a browser decides it: the state is driven by the
 *     attribute `desugar()` rewrites it to.
 *   - A shut menu. The gate opens every chip's menu, because a shut panel hides
 *     everything in it and the mark has nothing to say there.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AA_LARGE,
  AA_TEXT,
  composite,
  desugar,
  effectiveBackground,
  installDomGlobals,
  kitCssFor,
  parseColour,
  ratio,
  rgbOf,
  serialize,
  storyFiles,
  substitute,
} from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES = ['light', 'dark'];
const CHOSEN = '.ui-filter-bar .ui-dropdown__item.is-selected';
/* Three story files draw a filter bar today — Components/Finance cells,
 * Showcases/Stock screener and Guidelines/Component choice — and between them
 * nine chosen rows per theme. The floor is the count, so a story that drops its
 * filter bar fails here. */
const ROW_FLOOR = 9;
const STORY_FLOOR = 3;

/** Every story that renders a chosen row in a filter menu, as live DOM.
 *  One window per matching story, because each story's rows are measured after
 *  the sweep has moved on and a shared body would have replaced them.
 *
 *  Each chip's menu is opened first. A shut panel is `visibility: hidden`, which
 *  inherits, so every mark inside one reads as not drawn whatever it declares —
 *  and a mark nobody can see is not what this gate is about. Opening it is the
 *  one state in which the question has an answer. */
async function subjects(theme) {
  const { vars, css } = kitCssFor(theme);
  const probe = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  installDomGlobals(probe.window);
  const found = [];
  for (const rel of storyFiles) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      const raw = serialize(render(args, { globals: { theme }, args }));
      if (raw == null || !raw.includes('ui-filter-bar')) continue;
      const dom = new JSDOM(
        `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
        + `<body>${desugar(substitute(raw, vars))}</body></html>`,
        { pretendToBeVisual: true },
      );
      for (const dd of dom.window.document.querySelectorAll('.ui-filter-bar .ui-dropdown')) dd.classList.add('open');
      for (const row of dom.window.document.querySelectorAll(CHOSEN)) {
        found.push({ id: `${rel}:${name}`, row, win: dom.window, vars });
      }
    }
  }
  probe.window.close();
  return { found };
}

/** What one chosen row paints, read off the resolved cascade. */
function readRow({ row, win, vars }) {
  const panel = row.closest('.ui-dropdown__panel');
  assert.ok(panel, 'a chosen row must sit in a panel');
  const ground = effectiveBackground(row, win);
  const under = effectiveBackground(panel, win);
  const tick = row.querySelector('.ui-dropdown__tick');
  const label = row.querySelector('.ui-dropdown__label');
  assert.ok(tick, 'a chosen listbox row must render a check');
  assert.ok(label, 'a chosen row must render a label');
  const tickStyle = win.getComputedStyle(tick);
  return {
    ground,
    under,
    wash: ground === 'IMAGE' || under === 'IMAGE' ? null : ratio(ground, under),
    tickShown: tickStyle.display !== 'none' && tickStyle.visibility !== 'hidden',
    tickInk: parseColour(tickStyle.color),
    labelInk: win.getComputedStyle(label).color,
    strong: rgbOf(substitute(vars.get('--strong'), vars)),
    labelRatio: ground === 'IMAGE' ? null : ratio(parseColour(win.getComputedStyle(label).color), ground),
  };
}

/** The two cues, and the reason there have to be two. */
function measureMark(subject) {
  const r = readRow(subject);
  assert.notEqual(r.ground, 'IMAGE', `${subject.id}: a chosen row's ground must be measurable`);
  assert.ok(r.wash > 1.02, `${subject.id}: the wash is not painted (${r.wash?.toFixed(3)}:1)`);
  assert.ok(r.wash < AA_LARGE, `${subject.id}: the wash is a hard fill, not a wash (${r.wash.toFixed(3)}:1)`);
  assert.ok(r.tickShown, `${subject.id}: the wash is under 3:1, so the check may not be hidden`);
  const tickRatio = ratio(r.tickInk, r.ground);
  assert.ok(tickRatio >= AA_LARGE, `${subject.id}: the check is ${tickRatio.toFixed(2)}:1 over the wash, under 1.4.11's 3:1`);
  assert.equal(r.labelInk, r.strong, `${subject.id}: the chosen label holds --strong under the wash`);
  assert.ok(r.labelRatio >= AA_TEXT, `${subject.id}: the chosen label is ${r.labelRatio.toFixed(2)}:1 on the wash`);
  return { wash: r.wash, tick: tickRatio, label: r.labelRatio };
}

/** The `outline` shorthand, read as its three parts.
 *
 *  JSDOM resolves the shorthand but leaves `outlineStyle` at `none` and
 *  `outlineWidth` at `medium` on every element, drawn or not, so the longhands
 *  cannot answer whether a row has an edge. `outlineColor` is likewise
 *  `rgba(0, 0, 0, 0)` whether a rule set it or nothing did. */
function outlineOf(cs) {
  const parts = /^(\S+)\s+(\S+)\s+(.+)$/.exec((cs.outline || '').trim());
  if (!parts) return { width: 0, style: 'none', ink: null };
  return { width: parseFloat(parts[1]) || 0, style: parts[2], ink: parseColour(parts[3]) };
}

/** The wash the sheet promises this row, composited onto the panel under it.
 *
 *  Read from the tokens rather than from the row as it stands, so a mutation that
 *  repaints the row cannot also move the expectation it is measured against. */
function washGround(subject) {
  const panel = subject.row.closest('.ui-dropdown__panel');
  const wash = parseColour(substitute(subject.vars.get('--glow-purple'), subject.vars));
  assert.ok(wash, `${subject.id}: --glow-purple does not resolve to a colour`);
  return composite(wash, effectiveBackground(panel, subject.win));
}

/** The step hover owes the chosen row, as a contrast ratio over the wash it is
 *  drawn on.
 *
 *  Not the kit's own step, because the kit's hover fill is `--surface` and in light
 *  that IS the panel: every other row in the panel steps 1.11:1 in dark and not at
 *  all in light, leaning on its 1px `--control-edge`. On the wash that edge is
 *  1.06:1 (dark) and 1.31:1 (light), which is the whole of #550's round-two defect,
 *  so the floor has to be one the edge alone fails. The deepened wash clears it in
 *  both themes and all six accents — 1.135:1 is the quietest of them, measured in
 *  the walk `CONTRAST_ACCENTS=1` runs. */
const HOVER_STEP = 1.1;

/** What hover, the keyboard cursor and focus may not take away, and what hover owes.
 *
 *  The state markers are taken off in a `finally`: a failed assertion is thrown
 *  out of the middle of the walk, and a row left carrying `is-active` or
 *  `data-ui-state` would answer the next reading in a state nobody asked for. */
function measureStates(subject) {
  const { row, win } = subject;
  const rest = washGround(subject);
  const panel = effectiveBackground(row.closest('.ui-dropdown__panel'), win);
  const accent = substitute(subject.vars.get('--accent'), subject.vars).trim();
  assert.deepEqual(effectiveBackground(row, win), rest, `${subject.id}: at rest the chosen row is not the wash on the panel`);
  const out = {};
  try {
    for (const state of ['hover', 'focus-visible']) {
      row.setAttribute('data-ui-state', state);
      const cs = win.getComputedStyle(row);
      const edge = outlineOf(cs);
      if (state === 'hover') {
        out.hoverStep = measureHover(subject, { rest, panel, edge, cs });
      } else {
        assert.deepEqual(effectiveBackground(row, win), rest, `${subject.id}: ${state} takes the wash off the chosen row`);
        // The ring is an outward band in the accent; the cursor's bar is inset and
        // in the same accent, so the direction is what separates them. #457
        assert.ok(!/inset/.test(cs.boxShadow) && cs.boxShadow.includes(accent),
          `${subject.id}: focus draws no kit ring (${cs.boxShadow || 'none'})`);
        assert.ok(!edge.ink || edge.ink[3] === 0, `${subject.id}: focus falls back to a native outline (${cs.outline})`);
      }
      out[state] = cs.boxShadow;
      row.removeAttribute('data-ui-state');
    }
    row.classList.add('is-active');
    assert.deepEqual(effectiveBackground(row, win), rest, `${subject.id}: the keyboard cursor takes the wash off the chosen row`);
    assert.match(win.getComputedStyle(row).boxShadow, /inset/, `${subject.id}: the keyboard cursor loses its bar`);
  } finally {
    row.removeAttribute('data-ui-state');
    row.classList.remove('is-active');
  }
  return out;
}

/** Hover's signal, measured rather than declared.
 *
 *  Selection is a background highlight and an outline belongs to focus, so hover
 *  deepens the highlight: the ground it paints has to step HOVER_STEP off the
 *  resting wash, stay on the same side of the panel so the row goes on reading as
 *  chosen, and stay under 3:1 of it so it is still a tint and not a fill. The two
 *  cues measured at rest are re-measured on that deeper ground, because deepening
 *  it is what could put the check under 1.4.11's 3:1.
 *
 *  The kit's 1px edge has to still be drawn, read as its parsed parts: `cs.outline`
 *  is the truthy string `none` when nothing draws one. Its ratio over the ground is
 *  reported, not floored — the step is what makes hover readable, not the edge. */
function measureHover(subject, { rest, panel, edge, cs }) {
  const { row, win } = subject;
  const ground = effectiveBackground(row, win);
  assert.notEqual(ground, 'IMAGE', `${subject.id}: hover's ground must be measurable`);
  const step = ratio(ground, rest);
  const edgeRatio = edge.ink && edge.ink[3] > 0 ? ratio(composite(edge.ink, ground), ground) : null;
  assert.ok(step >= HOVER_STEP,
    `${subject.id}: hover steps ${step.toFixed(3)}:1 off the wash, under ${HOVER_STEP}:1`
    + ` — all it leaves the pointer is the 1px edge at ${edgeRatio == null ? 'no edge at all' : `${edgeRatio.toFixed(3)}:1`}`);
  const deeper = ratio(ground, panel);
  assert.ok(deeper > ratio(rest, panel),
    `${subject.id}: hover steps ${step.toFixed(3)}:1 the wrong way — ${deeper.toFixed(3)}:1 over the panel, under the resting wash's ${ratio(rest, panel).toFixed(3)}:1`);
  assert.ok(deeper < AA_LARGE, `${subject.id}: hover deepens the wash into a hard fill (${deeper.toFixed(3)}:1 over the panel)`);
  const tick = ratio(parseColour(win.getComputedStyle(row.querySelector('.ui-dropdown__tick')).color), ground);
  assert.ok(tick >= AA_LARGE, `${subject.id}: hovered, the check is ${tick.toFixed(2)}:1 over the deeper wash, under 1.4.11's 3:1`);
  const label = ratio(parseColour(win.getComputedStyle(row.querySelector('.ui-dropdown__label')).color), ground);
  assert.ok(label >= AA_TEXT, `${subject.id}: hovered, the chosen label is ${label.toFixed(2)}:1 over the deeper wash`);
  assert.ok(edge.width > 0 && edge.style !== 'none' && edge.ink && edge.ink[3] > 0,
    `${subject.id}: hover loses the kit's 1px edge (${cs.outline || 'none'})`);
  return { step, edge: edgeRatio, overPanel: deeper, tick, label };
}

/* The three geometries a chip's panel has, and what each one may do to the mark.
 *
 * Shut, a chip's panel is its trigger's width — 48px where the chip prints `All`
 * — and a 16px mark beside an 11px gap does not fit it, so inside a chip the mark
 * is allowed to give way and is clipped. That is #467, and shut is the state
 * nothing is painted in. Open, and through the fade `is-closing` holds the open
 * geometry for, the menu is at the kit's 240px floor and the mark keeps
 * `flex: none`: the label is what wraps. Written for every panel in a chip, the
 * clip reached the open menu too and left 9.8px of the check — a tick drawn as a
 * small chevron. #550 */
const SHUT = { shrink: '1', clipped: true };
const OPEN = { shrink: '0', clipped: false };

/** What one geometry gives the mark, read off the resolved cascade. */
function slot(subject, { open, closing }) {
  const { row, win } = subject;
  const dd = row.closest('.ui-filter-bar__chip .ui-dropdown');
  assert.ok(dd, `${subject.id}: a chip's chosen row must sit in a chip's dropdown`);
  const panel = row.closest('.ui-dropdown__panel');
  const tick = row.querySelector('.ui-dropdown__tick');
  dd.classList.toggle('open', open);
  panel.classList.toggle('is-closing', closing);
  const cs = win.getComputedStyle(tick);
  return { shrink: cs.flexShrink, clipped: cs.overflow === 'hidden' || cs.minWidth === '0px' };
}

/** The mark keeps its whole slot wherever the menu is painted, and gives way only
 *  where nothing is drawn. Each geometry is put back afterwards, so a failed
 *  assertion cannot leave the next reading in a state nobody asked for. */
function measureSlot(subject) {
  const was = {
    open: subject.row.closest('.ui-dropdown').classList.contains('open'),
    closing: subject.row.closest('.ui-dropdown__panel').classList.contains('is-closing'),
  };
  try {
    for (const [what, geometry, want] of [
      ['open', { open: true, closing: false }, OPEN],
      ['closing', { open: false, closing: true }, OPEN],
      ['shut', { open: false, closing: false }, SHUT],
    ]) {
      const got = slot(subject, geometry);
      assert.equal(got.shrink, want.shrink,
        `${subject.id}: ${what}, the check's flex-shrink is ${got.shrink} and has to be ${want.shrink}`);
      assert.equal(got.clipped, want.clipped, want.clipped
        ? `${subject.id}: ${what}, the check no longer gives way in a panel bounded to a 48px trigger`
        : `${subject.id}: ${what}, the check is still clipped in a menu that is being painted`);
    }
  } finally {
    slot(subject, was);
  }
}

for (const theme of THEMES) {
  test(`a chosen filter-menu row's check is whole wherever the menu is painted, in ${theme}`, async () => {
    const { found } = await subjects(theme);
    assert.ok(found.length >= ROW_FLOOR,
      `swept ${found.length} chosen filter-menu rows, floor ${ROW_FLOOR}: a story stopped drawing one`);
    for (const subject of found) measureSlot(subject);
  });
}

/* Each mutation re-breaks one half of that: the clip reaching a painted menu,
 * which is #550, and the clip gone from the shut panel, which is #467. */
const SLOT_MUTATIONS = [
  // Each one moves one declaration, so the assertion it is rejected by is the one
  // written for it rather than whichever fires first.
  ['the clip let back over a painted menu', (tick) => {
    tick.style.minWidth = '0'; tick.style.overflow = 'hidden';
  }, /still clipped in a menu that is being painted/],
  ['the mark allowed to shrink in a painted menu', (tick) => {
    tick.style.flexShrink = '1';
  }, /flex-shrink is 1 and has to be 0/],
  ['the shut panel\'s clip taken away', (tick) => {
    tick.style.overflow = 'visible'; tick.style.minWidth = 'auto';
  }, /no longer gives way in a panel bounded to a 48px trigger/],
];

for (const theme of THEMES) {
  test(`the ${theme} gate rejects a check that gives way where it is painted`, async () => {
    const { found } = await subjects(theme);
    assert.ok(found.length >= ROW_FLOOR, 'the slot mutation pass needs the same subjects');
    const subject = found[0];
    for (const [what, mutate, rejects] of SLOT_MUTATIONS) {
      const tick = subject.row.querySelector('.ui-dropdown__tick');
      const before = tick.getAttribute('style');
      mutate(tick);
      assert.throws(() => measureSlot(subject), rejects, `${what} must be rejected`);
      if (before == null) tick.removeAttribute('style'); else tick.setAttribute('style', before);
      measureSlot(subject);
    }
  });
}

for (const theme of THEMES) {
  test(`a chosen filter-menu row carries a wash and a check in ${theme}`, async () => {
    const { found } = await subjects(theme);
    assert.ok(found.length >= ROW_FLOOR,
      `swept ${found.length} chosen filter-menu rows, floor ${ROW_FLOOR}: a story stopped drawing one`);
    const seen = new Set();
    for (const subject of found) {
      measureMark(subject);
      measureStates(subject);
      seen.add(subject.id);
    }
    assert.ok(seen.size >= STORY_FLOOR,
      `the sweep reached ${seen.size} stories, floor ${STORY_FLOOR}: every filter-bar story must be measured`);
  });
}

/* Each mutation re-breaks exactly one guarantee, and the gate has to reject it.
 * A mutation is an inline style or a class on the measured row, so the kit's own
 * sheet is what the rest of the measurement still reads. */
/* An opaque fill a long way from the wash, in the direction the theme leaves room
 * for: a hard fill is the mutation, so it has to clear 3:1 over the panel. */
const HARD_FILL = { light: 'rgb(28, 16, 54)', dark: 'rgb(226, 212, 255)' };

/** The row's own ground, written back as an opaque colour. A mark painted this is
 *  the colour-only mark the rule exists to forbid. */
const asOpaque = (ground) => `rgb(${ground.slice(0, 3).map(Math.round).join(', ')})`;

const MUTATIONS = [
  ['the wash removed', (row) => { row.style.background = 'transparent'; }, /wash is not painted/],
  ['the wash made a hard fill', (row, ctx) => { row.style.background = HARD_FILL[ctx.theme]; }, /hard fill, not a wash/],
  ['the check hidden', (row) => { row.querySelector('.ui-dropdown__tick').style.display = 'none'; }, /check may not be hidden/],
  ['the check painted the wash it sits on', (row, ctx) => { row.querySelector('.ui-dropdown__tick').style.color = asOpaque(ctx.ground); }, /under 1\.4\.11's 3:1/],
  ['the chosen label let back down to --text', (row) => { row.querySelector('.ui-dropdown__label').style.color = 'rgb(90, 90, 90)'; }, /holds --strong/],
];

const STATE_MUTATIONS = [
  ['the chosen row repainted off the wash', (row) => { row.setAttribute('style', 'background: rgb(255, 255, 255)'); }, /the chosen row is not the wash/],
  ['focus given a native outline', (row) => { row.style.outline = '2px solid rgb(0, 0, 0)'; row.style.boxShadow = 'none'; }, /native outline|draws no kit ring/],
  // One inline box-shadow reaches every state, so this breaks the cursor’s bar and
  // the ring together; either rejection is the gate doing its job.
  ['the cursor’s bar and the ring replaced by one flat shadow', (row) => { row.style.boxShadow = '0 0 0 1px rgb(0, 0, 0)'; }, /loses its bar|draws no kit ring/],
];

/* Hover is driven by the attribute `desugar()` rewrites `:hover` to, so an inline
 * style cannot reach it alone — it would repaint every state at once. Each of
 * these appends one rule for the hovered chosen row, in the same weight the kit's
 * own rule carries and after it, and is taken off again.
 *
 * The first is the defect this gate was written blind to: hover restated as the
 * resting wash, which leaves the pointer the kit's 1px edge and nothing else. The
 * last takes that edge away instead, which is the mutation `cs.outline` read as a
 * string could not reject: removed, the shorthand resolves to `none`, and `none`
 * is truthy. #550 */
const HOVER_MUTATIONS = [
  ['the wash restated for hover', (ctx) => `background: ${asOpaque(ctx.ground)}`, /hover steps 1\.00\d:1 off the wash, under 1\.1:1 — all it leaves the pointer is the 1px edge at 1\.\d+:1/],
  ['hover painting the panel instead of deepening the wash', (ctx) => `background: ${asOpaque(ctx.panel)}`, /hover steps [\d.]+:1 the wrong way/],
  ['hover deepened into a hard fill', (ctx) => `background: ${HARD_FILL[ctx.theme]}`, /hover deepens the wash into a hard fill/],
  ['the kit\'s 1px edge taken off the hovered row', () => 'outline: none', /hover loses the kit's 1px edge \(none\)/],
];

/** One rule for the hovered chosen row, appended after the kit's sheet. */
function overrideHover(subject, declarations) {
  const style = subject.win.document.createElement('style');
  style.textContent = `${CHOSEN}[data-ui-state~="hover"] { ${declarations}; }`;
  subject.win.document.head.append(style);
  return () => style.remove();
}

for (const theme of THEMES) {
  test(`the ${theme} gate rejects a hover the pointer cannot find on the chosen row`, async () => {
    const { found } = await subjects(theme);
    assert.ok(found.length >= ROW_FLOOR, 'the hover mutation pass needs the same subjects');
    const subject = found[0];
    const panel = effectiveBackground(subject.row.closest('.ui-dropdown__panel'), subject.win);
    for (const [what, declare, rejects] of HOVER_MUTATIONS) {
      const off = overrideHover(subject, declare({ theme, ground: washGround(subject), panel }));
      try {
        assert.throws(() => measureStates(subject), rejects, `${what} must be rejected`);
      } finally {
        off();
      }
      measureStates(subject);
    }
  });
}

for (const theme of THEMES) {
  test(`the ${theme} gate rejects every mark it is written for`, async () => {
    const { found } = await subjects(theme);
    assert.ok(found.length >= ROW_FLOOR, 'the mutation pass needs the same subjects');
    for (const [what, mutate, rejects] of MUTATIONS) {
      const subject = found[0];
      const before = subject.row.getAttribute('style');
      const tick = subject.row.querySelector('.ui-dropdown__tick').getAttribute('style');
      const label = subject.row.querySelector('.ui-dropdown__label').getAttribute('style');
      mutate(subject.row, { theme, ground: washGround(subject) });
      assert.throws(() => measureMark(subject), rejects, `${what} must be rejected`);
      restore(subject.row, before, tick, label);
      measureMark(subject);
    }
    for (const [what, mutate, rejects] of STATE_MUTATIONS) {
      const subject = found[0];
      const before = subject.row.getAttribute('style');
      mutate(subject.row, { theme, ground: washGround(subject) });
      assert.throws(() => measureStates(subject), rejects, `${what} must be rejected`);
      restore(subject.row, before, null, null);
      measureStates(subject);
    }
  });
}

function restore(row, style, tick, label) {
  if (style == null) row.removeAttribute('style'); else row.setAttribute('style', style);
  for (const [sel, value] of [['.ui-dropdown__tick', tick], ['.ui-dropdown__label', label]]) {
    const el = row.querySelector(sel);
    if (!el) continue;
    if (value == null) el.removeAttribute('style'); else el.setAttribute('style', value);
  }
}
