// The React half of stories/filter-selected-mark.test.js (#429): the subjects are the
// chosen rows of every filter menu a React story draws, read in a window that carries the
// kit's sheets, over the same measurements.
/* Rule: the chosen value in a filter menu is never marked by colour alone.
 *
 * Since #888 the chosen row takes the soft accent tint, `--float-row-selected`, a
 * step of about 1.1:1 on the panel, so on its own it is what WCAG 2.2
 * SC 1.4.1 forbids; the kit's 16px check, in neutral ink, is the non-colour cue, and
 * SC 1.4.11 asks 3:1 of it. This measures the pair, and what hover and focus may not
 * take away. Hover takes the tint one step up, `--float-row-selected-hover`
 * (rev_550b6502339f/d86), and draws no outline, and focus keeps the tint under the kit's band in the accent, an `outline` since #578,
 * rather than a native one (#457). Subjects are swept from the stories, not listed,
 * and a sweep that finds none fails.
 * why: docs/components.md#filter-bar,
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
 *   - The default accent only. The ground and the check carry no accent since
 *     #888, so only the focus band's ink changes with one.
 *   - `:focus-visible` as a browser decides it: the state is driven by the
 *     attribute `desugar()` rewrites it to.
 *   - A shut menu. The gate opens every chip's menu, because a shut panel hides
 *     everything in it and the mark has nothing to say there.
 */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
// @ts-expect-error -- shared, independently tested JS module.
import { AA_LARGE, AA_TEXT, colourOf, composite, desugar, effectiveBackground, kitCssFor, parseColour, ratio, rgbOf, substitute } from '../../stories/lib/contrast.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });
const THEMES = ['light', 'dark'];
const CHOSEN = '.ui-filter-bar .ui-dropdown__item.is-selected';
/* The stories that draw a filter bar today render 24 chosen rows between them
 * per theme, across 7 stories. The floor is the count, so a story that drops
 * its filter bar fails here. */
const ROW_FLOOR = 24;
const STORY_FLOOR = 7;

/** Every story that renders a chosen row in a filter menu, swept and kept as its
 *  story HTML, not as live DOM. The sweep mounts each story once and counts the
 *  chosen rows straight off that host — the `is-selected` class is written by React
 *  before the menu is opened, and `desugar`/`substitute` rewrite state and `var()`
 *  text, never a class name. A test re-parses a subject into a reusable window, so
 *  the sweep keeps no JSDOM window alive.
 *
 *  Each chip's menu is opened on re-parse. A shut panel is `visibility: hidden`,
 *  which inherits, so every mark inside one reads as not drawn whatever it declares —
 *  and a mark nobody can see is not what this gate is about. Opening it is the one
 *  state in which the question has an answer. */
async function sweepSubjects(theme: string) {
  const { vars } = themeCss.get(theme)!;
  const found: Any[] = [];
  for (const file of Object.keys(modules).sort()) {
    const mod = modules[file];
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = (story as Story).render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...(story as Story).args };
      const StoryRender = () => render(args, { globals: { theme }, args });
      const host = document.body.appendChild(document.createElement('div'));
      const reactRoot = createRoot(host);
      act(() => reactRoot.render(<StoryRender />));
      const raw = document.body.innerHTML;
      const chosen = host.querySelectorAll(CHOSEN).length;
      act(() => reactRoot.unmount());
      host.remove();
      if (chosen === 0) continue;
      const id = `${file}:${name}`;
      const body = desugar(substitute(raw, vars));
      for (let index = 0; index < chosen; index += 1) found.push({ id, body, index, theme, vars });
    }
  }
  return { found };
}

// One sweep per theme. Tests that mutate a row restore it before they end, and tests run in turn.
// They run at load, in turn, because each sweep installs DOM globals. The file pays for them and no test does.
const themeCss = new Map<string, Any>();
for (const theme of THEMES) themeCss.set(theme, kitCssFor(theme));
const sweeps = new Map();
for (const theme of THEMES) sweeps.set(theme, await sweepSubjects(theme));
const subjects = async (theme) => sweeps.get(theme);

// One window per theme, built on demand and reused. A JSDOM window keeps its parsed
// kit sheet alive for the life of the process, so one window per re-parse would leak
// a full stylesheet per subject; one per theme parses it once. The body is swapped
// per story before each reading, which is why a subject stores its story HTML.
const themeDom = new Map<string, Any>();
function windowFor(theme: string) {
  let win = themeDom.get(theme);
  if (!win) {
    const { css } = themeCss.get(theme)!;
    win = new JSDOM(
      `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head><body></body></html>`,
      { pretendToBeVisual: true },
    ).window;
    themeDom.set(theme, win);
  }
  return win;
}

/** The live subject a measurement reads: the story re-parsed into its theme's
 *  window with its menus opened, its row found by the sweep's recorded index. */
function materialize(subject: Any) {
  const win = windowFor(subject.theme);
  win.document.body.innerHTML = subject.body;
  for (const dd of win.document.querySelectorAll('.ui-filter-bar .ui-dropdown')) dd.classList.add('open');
  const rows = win.document.querySelectorAll(CHOSEN);
  const row = rows[subject.index];
  assert.ok(row, `${subject.id}: re-parsed ${rows.length} chosen rows, but the sweep recorded index ${subject.index}`);
  return { id: subject.id, row, win, vars: subject.vars };
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
    step: ground === 'IMAGE' || under === 'IMAGE' ? null : ratio(ground, under),
    tickShown: tickStyle.display !== 'none' && tickStyle.visibility !== 'hidden',
    tickInk: parseColour(tickStyle.color),
    labelInk: win.getComputedStyle(label).color,
    text: rgbOf(substitute(vars.get('--text'), vars)),
    labelRatio: ground === 'IMAGE' ? null : ratio(parseColour(win.getComputedStyle(label).color), ground),
  };
}

/** The two cues, and the reason there have to be two. */
function measureMark(subject) {
  const r = readRow(subject);
  assert.notEqual(r.ground, 'IMAGE', `${subject.id}: a chosen row's ground must be measurable`);
  assert.ok(r.step > 1.02, `${subject.id}: the ground is not painted (${r.step?.toFixed(3)}:1)`);
  assert.ok(r.step < AA_LARGE, `${subject.id}: the ground is a hard fill, not a quiet ground (${r.step.toFixed(3)}:1)`);
  assert.ok(r.tickShown, `${subject.id}: the ground is under 3:1, so the check may not be hidden`);
  const tickRatio = ratio(r.tickInk, r.ground);
  assert.ok(tickRatio >= AA_LARGE, `${subject.id}: the check is ${tickRatio.toFixed(2)}:1 over the ground, under 1.4.11's 3:1`);
  assert.deepEqual(r.tickInk.slice(0, 3), parseColour(r.text).slice(0, 3), `${subject.id}: the check is not the neutral --text ink`);
  assert.equal(r.labelInk, r.text, `${subject.id}: the chosen label is not --text`);
  assert.ok(r.labelRatio >= AA_TEXT, `${subject.id}: the chosen label is ${r.labelRatio.toFixed(2)}:1 on the ground`);
  return { step: r.step, tick: tickRatio, label: r.labelRatio };
}

/** The outline, read from its longhands. jsdom 31 reports them faithfully:
 *  `outlineStyle` is `solid` where a band is drawn and `none` where it is not,
 *  and `outlineColor` is the band's ink. */
function outlineOf(cs) {
  return {
    width: parseFloat(cs.outlineWidth) || 0,
    style: cs.outlineStyle,
    ink: parseColour(cs.outlineColor),
  };
}

/** Two grounds are one colour when no channel differs by half a level: the token
 *  mix and the cascade's mix round apart in the fifth decimal. */
const sameGround = (a, b) => a !== 'IMAGE' && b !== 'IMAGE' && [0, 1, 2, 3].every((i) => Math.abs(a[i] - b[i]) < 0.5);

/** The ground the sheet promises this row, composited onto the panel under it.
 *
 *  Read from the tokens rather than from the row as it stands, so a mutation that
 *  repaints the row cannot also move the expectation it is measured against. */
function rowGround(subject, token = '--float-row-selected') {
  const panel = subject.row.closest('.ui-dropdown__panel');
  const fill = colourOf(`var(${token})`, subject.vars);
  assert.ok(fill, `${subject.id}: ${token} does not resolve to a colour`);
  return composite(fill, effectiveBackground(panel, subject.win));
}

/** What hover and focus may not take away, and what hover owes.
 *
 *  The state marker is taken off in a `finally`: a failed assertion is thrown out
 *  of the middle of the walk, and a row left carrying `data-ui-state` would answer
 *  the next reading in a state nobody asked for.
 *
 *  The arrow keys are not a state here. `filterBar()` builds every chip's panel
 *  without a search field, and `ddSetActive()` returns before it writes
 *  `.is-active` when there is none — React gates it on the same thing — so an
 *  arrow key moves real focus onto the row and the `focus-visible` reading below
 *  is what it draws. A browser probe of a wired chip is in #590's evidence. */
function measureStates(subject) {
  const { row, win } = subject;
  const rest = rowGround(subject);
  const accent = substitute(subject.vars.get('--accent'), subject.vars).trim();
  assert.ok(sameGround(effectiveBackground(row, win), rest), `${subject.id}: at rest the chosen row is not the soft tint on the panel`);
  const out = {};
  try {
    for (const state of ['hover', 'focus-visible']) {
      row.setAttribute('data-ui-state', state);
      const cs = win.getComputedStyle(row);
      const edge = outlineOf(cs);
      if (state === 'hover') {
        measureHover(subject, { rest, edge, cs });
      } else {
        assert.ok(sameGround(effectiveBackground(row, win), rest), `${subject.id}: ${state} takes the ground off the chosen row`);
        // Since #578 the band is a real `outline` in the accent, carried out by
        // --ring-offset, so the outline is where the band is read rather than the
        // shadow. A solid edge in any other ink is the browser's own. #457, #578
        assert.ok(edge.width > 0 && edge.style === 'solid',
          `${subject.id}: focus draws no kit ring (${cs.outlineStyle})`);
        assert.deepEqual(edge.ink, parseColour(accent),
          `${subject.id}: focus falls back to a native outline (${cs.outline})`);
      }
      out[state] = cs.boxShadow;
      row.removeAttribute('data-ui-state');
    }
  } finally {
    row.removeAttribute('data-ui-state');
  }
  return out;
}

/** Hover on the chosen row, measured rather than declared.
 *
 *  The hovered row and the chosen row share one ground (rev_92b7f8a56703/d79), so
 *  hovering the chosen row changes nothing: the ground stays, and the check and the
 *  label keep their contrast on it. Hover draws no outline since #595, because an
 *  outline belongs to focus. The outline is read as its parsed parts, because
 *  `cs.outline` is the truthy string `none` when nothing draws one. */
function measureHover(subject, { rest, edge, cs }) {
  const { row, win } = subject;
  const ground = effectiveBackground(row, win);
  assert.notEqual(ground, 'IMAGE', `${subject.id}: hover's ground must be measurable`);
  assert.ok(sameGround(ground, rowGround(subject, '--float-row-selected-hover')), `${subject.id}: hover does not take the chosen row one tint step up`);
  assert.ok(!sameGround(ground, rest), `${subject.id}: hover leaves the chosen row's ground as it is`);
  const tick = ratio(parseColour(win.getComputedStyle(row.querySelector('.ui-dropdown__tick')).color), ground);
  assert.ok(tick >= AA_LARGE, `${subject.id}: hovered, the check is ${tick.toFixed(2)}:1, under 1.4.11's 3:1`);
  const label = ratio(parseColour(win.getComputedStyle(row.querySelector('.ui-dropdown__label')).color), ground);
  assert.ok(label >= AA_TEXT, `${subject.id}: hovered, the chosen label is ${label.toFixed(2)}:1`);
  assert.ok(!(edge.width > 0 && edge.style !== 'none' && edge.ink && edge.ink[3] > 0),
    `${subject.id}: hover draws an outline (${cs.outline})`);
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
    for (const meta of found) measureSlot(materialize(meta));
  }, 30_000); // It mounts a filter menu per theme: 3s alone, past the 5s default on a loaded host.
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
    const subject = materialize(found[0]);
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
  test(`a chosen filter-menu row carries the soft tint and a neutral check in ${theme}`, async () => {
    const { found } = await subjects(theme);
    assert.ok(found.length >= ROW_FLOOR,
      `swept ${found.length} chosen filter-menu rows, floor ${ROW_FLOOR}: a story stopped drawing one`);
    const seen = new Set();
    for (const meta of found) {
      const subject = materialize(meta);
      measureMark(subject);
      measureStates(subject);
      seen.add(subject.id);
    }
    assert.ok(seen.size >= STORY_FLOOR,
      `the sweep reached ${seen.size} stories, floor ${STORY_FLOOR}: every filter-bar story must be measured`);
  }, 30_000);
}

/* Each mutation re-breaks exactly one guarantee, and the gate has to reject it.
 * A mutation is an inline style or a class on the measured row, so the kit's own
 * sheet is what the rest of the measurement still reads. */
/* An opaque fill a long way from the ground, in the direction the theme leaves room
 * for: a hard fill is the mutation, so it has to clear 3:1 over the panel. */
const HARD_FILL = { light: 'rgb(28, 16, 54)', dark: 'rgb(226, 212, 255)' };

/** The row's own ground, written back as an opaque colour. A mark painted this is
 *  the colour-only mark the rule exists to forbid. */
const asOpaque = (ground) => `rgb(${ground.slice(0, 3).map(Math.round).join(', ')})`;

const MUTATIONS = [
  ['the ground removed', (row) => { row.style.background = 'transparent'; }, /ground is not painted/],
  ['the ground made a hard fill', (row, ctx) => { row.style.background = HARD_FILL[ctx.theme]; }, /hard fill, not a quiet ground/],
  ['the check hidden', (row) => { row.querySelector('.ui-dropdown__tick').style.display = 'none'; }, /check may not be hidden/],
  ['the check painted the ground it sits on', (row, ctx) => { row.querySelector('.ui-dropdown__tick').style.color = asOpaque(ctx.ground); }, /under 1\.4\.11's 3:1/],
  ['the check painted in the accent', (row, ctx) => { row.querySelector('.ui-dropdown__tick').style.color = ctx.accent; }, /not the neutral --text ink/],
  ['the chosen label painted the ground it sits on', (row, ctx) => { row.querySelector('.ui-dropdown__label').style.color = asOpaque(ctx.ground); }, /is not --text/],
];

const STATE_MUTATIONS = [
  ['the chosen row repainted off the ground', (row, ctx) => { row.setAttribute('style', `background: ${HARD_FILL[ctx.theme]}`); }, /the chosen row is not the soft tint/],
];

/* Hover is driven by the attribute `desugar()` rewrites `:hover` to, so an inline
 * style cannot reach it alone — it would repaint every state at once. Each of
 * these appends one rule for the hovered chosen row, in the same weight the kit's
 * own rule carries and after it, and is taken off again. The last puts an outline
 * back on hover, which #595 removed; it is read as parsed parts because
 * `cs.outline` as a string is truthy even when it resolves to `none`. #595, #888 */
const HOVER_MUTATIONS = [
  ['hover painting the panel', (ctx) => `background: ${asOpaque(ctx.panel)}`, /hover does not take the chosen row one tint step up/],
  ['hover deepened into a hard fill', (ctx) => `background: ${HARD_FILL[ctx.theme]}`, /hover does not take the chosen row one tint step up/],
  ['an outline put back on the hovered row', () => 'outline: 1px solid rgb(120, 120, 120)', /hover draws an outline/],
];

/* Focus's own. Since #578 the band is an `outline`, which an inline style cannot take
 * off for focus alone — it would be rejected for hover too if hover drew one. Written as a rule, the rejection is the one being proved. */
const FOCUS_MUTATIONS = [
  ['the band taken off the focused chosen row', () => 'outline: none', /draws no kit ring \(none\)/],
  ['the band recoloured to the browser\'s own ink', () => 'outline: 2px solid rgb(0, 0, 0)', /falls back to a native outline/],
];

/** One rule for a state of the chosen row, appended after the kit's sheet. */
function overrideState(subject, match, declarations) {
  const style = subject.win.document.createElement('style');
  style.textContent = `${CHOSEN}${match} { ${declarations}; }`;
  subject.win.document.head.append(style);
  return () => style.remove();
}

for (const theme of THEMES) {
  test(`the ${theme} gate rejects a hover or a band the reader cannot find on the chosen row`, async () => {
    const { found } = await subjects(theme);
    assert.ok(found.length >= ROW_FLOOR, 'the hover mutation pass needs the same subjects');
    const subject = materialize(found[0]);
    const panel = effectiveBackground(subject.row.closest('.ui-dropdown__panel'), subject.win);
    for (const [match, mutations] of [['[data-ui-state~="hover"]', HOVER_MUTATIONS], ['[data-ui-state~="focus-visible"]', FOCUS_MUTATIONS]]) {
      for (const [what, declare, rejects] of mutations) {
        const off = overrideState(subject, match, declare({ theme, ground: rowGround(subject), panel }));
        try {
          assert.throws(() => measureStates(subject), rejects, `${what} must be rejected`);
        } finally {
          off();
        }
        measureStates(subject);
      }
    }
  });
}

for (const theme of THEMES) {
  test(`the ${theme} gate rejects every mark it is written for`, async () => {
    const { found } = await subjects(theme);
    assert.ok(found.length >= ROW_FLOOR, 'the mutation pass needs the same subjects');
    const subject = materialize(found[0]);
    for (const [what, mutate, rejects] of MUTATIONS) {
      const before = subject.row.getAttribute('style');
      const tick = subject.row.querySelector('.ui-dropdown__tick').getAttribute('style');
      const label = subject.row.querySelector('.ui-dropdown__label').getAttribute('style');
      mutate(subject.row, { theme, ground: rowGround(subject), accent: substitute(subject.vars.get('--accent'), subject.vars).trim() });
      assert.throws(() => measureMark(subject), rejects, `${what} must be rejected`);
      restore(subject.row, before, tick, label);
      measureMark(subject);
    }
    for (const [what, mutate, rejects] of STATE_MUTATIONS) {
      const before = subject.row.getAttribute('style');
      mutate(subject.row, { theme, ground: rowGround(subject) });
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
