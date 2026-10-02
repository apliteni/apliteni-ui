/* Rule: in forced-colors mode every current or selected state in the rail, the
 * page shell and the command palette stays distinguishable from the rows beside
 * it, in both themes, and normal rendering is untouched.
 *
 * Subjects are discovered from the three sheets, not listed, so a new
 * current-state paint rule fails here until it is answered or settled. The mode
 * is then emulated — tokens substituted, non-system colours forced to Chromium's
 * palette, box-shadow dropped, the mode's own rules flattened in — and the real
 * factories rendered under it.
 * why: docs/specification.md#the-page-shell  #523
 */

/* Six limits, each covered by a Chromium capture instead. Stated in full in
 * stories/guidelines/accessibility-coverage.json.
 *  1. Pseudo-element styles are read through a stand-in child (nav-cascade.test.js).
 *  2. No layout: size, position and stacking are unchecked.
 *  3. The `outline` shorthand is not expanded, so outlines are read whole.
 *  4. The forced palette is Chromium's, pinned below.
 *  5. A translucent background is collapsed to Canvas rather than kept at alpha.
 *  6. EVERY box-shadow is dropped, so the emulation is blind to whatever
 *     `forced-color-adjust: none` exempts — which is how a focused chosen pill
 *     kept the kit's ring on a pushed head. Those debts are asserted on source.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { leafRules, read } from './lib/motion-css.js';
import { desugar, substitute, tokensFor } from './lib/contrast.js';

const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}
const { sidebarNav, navTabs } = await import('../src/components/nav.js');
const { commandPalette } = await import('../src/components/command-palette.js');

const SHEETS = ['src/styles/nav.css', 'src/styles/layout.css', 'src/styles/command-palette.css'];
const BASE = ['src/styles/base.css', ...SHEETS];
const source = Object.fromEntries(BASE.map((f) => [f, read(f)]));
const sheetsAs = (overrides = {}) => BASE.map((f) => overrides[f] ?? source[f]).join('\n');

/* ---- the mode -------------------------------------------------------------
 * Chromium's forced palette, read off the browser while this issue's evidence
 * was captured. Pinned rather than computed, because the pairs below are what a
 * reader actually gets: Highlight under CanvasText is white on cyan in dark and
 * black on navy in light, which is why neither sheet puts a fill under
 * system-painted ink. A real Windows theme ships other values; all the kit
 * relies on is that Canvas/CanvasText and Highlight/HighlightText are each a
 * legible pair, which is the one thing the mode guarantees. */
const PALETTE = {
  dark: { Canvas: 'rgb(0, 0, 0)', CanvasText: 'rgb(255, 255, 255)', Highlight: 'rgba(0, 230, 255, 0.8)', HighlightText: 'rgb(0, 0, 0)' },
  light: { Canvas: 'rgb(255, 255, 255)', CanvasText: 'rgb(0, 0, 0)', Highlight: 'rgba(5, 0, 73, 0.8)', HighlightText: 'rgb(255, 255, 255)' },
};
const THEMES = ['dark', 'light'];
const SYSTEM = /^(?:Canvas|CanvasText|Highlight|HighlightText|GrayText|ButtonFace|ButtonText|ButtonBorder|LinkText|SelectedItem|SelectedItemText|Field|FieldText|Mark|MarkText|AccentColor|AccentColorText)$/i;
const FORCED_AT = /forced-colors\s*:\s*active/;
const TRANSPARENT = /^(?:none|transparent|rgba?\([^)]*,\s*0(?:\.0+)?\s*\))$/i;
/** JSDOM writes a transparent background as rgba(0, 0, 0, 0), whatever Canvas is. */
const CLEAR = 'rgba(0, 0, 0, 0)';

/** Every `(forced-colors: active)` rule in a sheet, with its query chain kept. */
const forcedRulesOf = (css) => leafRules(css).filter((r) => r.at.some((prelude) => FORCED_AT.test(prelude)));

/** `::before`/`::after` → a stand-in child, so their declarations resolve. */
const standIns = (css) => css
  .replace(/::before/g, ' > [data-pseudo="before"]')
  .replace(/::after/g, ' > [data-pseudo="after"]');

/**
 * The mode, as far as a resolved stylesheet can show it.
 *
 * A background that is already transparent stays transparent — the mode swaps a
 * background's hue and keeps its alpha, so nothing opaque appears where nothing
 * was. Any other background goes to Canvas. Ink, borders and outlines go to
 * CanvasText, `transparent` included: Chromium repaints a transparent outline
 * rather than preserving it, which is the mechanism the kit's ring rests on, so
 * an emulation that preserved it would prove the opposite of the browser.
 *
 * The mode's own rules are appended last, with their system colours resolved to
 * the palette, so what they name survives the forcing above them.
 */
function emulate(css, theme, { narrow = false } = {}) {
  const palette = PALETTE[theme];
  const { Canvas, CanvasText } = palette;
  const system = (value) => palette[Object.keys(palette).find((n) => n.toLowerCase() === value.trim().toLowerCase())];
  const forced = forcedRulesOf(css).filter((r) => narrow || !r.at.some((prelude) => /max-width/.test(prelude)));
  assert.ok(forced.length, 'no (forced-colors: active) rule left to emulate');
  const body = substitute(css, tokensFor(theme, 'default'))
    .replace(/box-shadow\s*:[^;}]+/g, 'box-shadow: none')
    .replace(/(^|[;{])(\s*)(background|background-color)(\s*:\s*)([^;}]+)/g,
      (m, lead, ws, prop, sep, value) => `${lead}${ws}${prop}${sep}${TRANSPARENT.test(value.trim()) ? 'transparent' : Canvas}`)
    .replace(/(^|[;{])(\s*)((?:border(?:-top|-right|-bottom|-left)?-)?color|outline-color)(\s*:\s*)([^;}]+)/g,
      (m, lead, ws, prop, sep) => `${lead}${ws}${prop}${sep}${CanvasText}`)
    // A shorthand carries its colour last, and the mode recolours that too.
    .replace(/(^|[;{])(\s*)(border|outline|border-bottom|border-left|border-right|border-top)(\s*:\s*)([^;}]+)/g,
      (m, lead, ws, prop, sep, value) => {
        const parts = value.trim().split(/\s+/);
        return parts.length < 3 ? m : `${lead}${ws}${prop}${sep}${parts.slice(0, -1).join(' ')} ${CanvasText}`;
      });
  const tail = forced.map((r) => `${r.selector} { ${r.decls
    .map((d) => `${d.prop}: ${d.value.replace(/[A-Za-z]+/g, (word) => system(word) ?? word)}`).join('; ')} }`);
  return standIns(desugar([body, ...tail].join('\n')));
}

/** Mount markup under the emulated mode, with a stand-in for every pseudo. */
function mount(html, theme, { css = sheetsAs(), ...opts } = {}) {
  const win = new JSDOM(`<style>${emulate(css, theme, opts)}</style>${html}`).window;
  for (const host of win.document.querySelectorAll('.ui-nav__item, .ui-nav__tab, .ui-cmdk__item')) {
    for (const [which, place] of [['before', 'prepend'], ['after', 'append']]) {
      const stub = win.document.createElement('i');
      stub.setAttribute('data-pseudo', which);
      host[place](stub);
    }
  }
  return win;
}
/** The stand-in for one element's pseudo-element. */
const pseudo = (win, el, which) => win.getComputedStyle(el.querySelector(`:scope > [data-pseudo="${which}"]`));

/* ---- fixtures ----------------------------------------------------------- */

const RAIL_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'gauge' },
  { id: 'campaigns', label: 'Campaigns', icon: 'megaphone', badge: { label: '3', tone: 'accent' } },
  { id: 'streams', label: 'Streams', icon: 'activity' },
];
const TAB_ITEMS = [{ id: 'a', label: 'Overview' }, { id: 'b', label: 'Clicks' }, { id: 'c', label: 'Revenue' }];
const rail = (opts) => sidebarNav({ items: RAIL_ITEMS, active: 'campaigns', ...opts });
const shell = (klass) => `<div class="ui-app${klass}"><div class="ui-app__rail">${rail()}</div></div>`;
const split = (win, selector) => {
  const all = [...win.document.querySelectorAll(selector)];
  const current = all.find((el) => el.classList.contains('is-active'));
  const other = all.find((el) => !el.classList.contains('is-active'));
  assert.ok(current && other, `${selector}: the fixture must render a current item and at least one other`);
  return { current, other };
};

/* ---- the checks ---------------------------------------------------------
 * Named, so the mutations below re-run the one they are meant to break instead
 * of a sweep whose failure could have come from anywhere.
 */
const CHECKS = {
  'the open rail\'s marker': (theme, css) => {
    const win = mount(rail(), theme, { css });
    const { current, other } = split(win, '.ui-nav__item');
    assert.equal(pseudo(win, current, 'before').backgroundColor, PALETTE[theme].Highlight,
      'the current row\'s marker must be painted in a colour the mode keeps');
    assert.equal(pseudo(win, other, 'before').backgroundColor, CLEAR, 'only the current row draws a marker');
    // The plate and the hairline are gone by design: a fill under system-painted
    // ink is the pair the palette does not promise. The weight step is the row's
    // other signal and it is not paint, so the mode leaves it alone.
    assert.equal(win.getComputedStyle(current).backgroundColor, PALETTE[theme].Canvas, 'the plate is not restored');
    assert.equal(win.getComputedStyle(current).boxShadow, 'none', 'nor the hairline, which the mode drops regardless');
    assert.equal(win.getComputedStyle(current).fontWeight, '500');
    assert.notEqual(win.getComputedStyle(other).fontWeight, '500', 'the weight step is the row\'s other signal');
    win.close();
  },
  'the folded rail\'s plate': (theme, css) => {
    const win = mount(rail({ collapsed: true }), theme, { css });
    const plate = pseudo(win, win.document.querySelector('.ui-nav__item.is-active'), 'before');
    assert.equal(plate.borderTopColor, PALETTE[theme].Highlight,
      'the plate on the glyph column must become an edge the mode keeps');
    assert.equal(plate.borderTopWidth, '1px');
    assert.equal(plate.backgroundColor, PALETTE[theme].Canvas,
      'the plate stands behind the glyph, so a Highlight fill there would put system ink on it');
    win.close();
  },
  'the underline tab\'s rule': (theme, css) => {
    const win = mount(navTabs({ items: TAB_ITEMS, active: 'b', variant: 'underline' }), theme, { css });
    const { current, other } = split(win, '.ui-nav__tab');
    assert.equal(pseudo(win, current, 'after').backgroundColor, PALETTE[theme].Highlight,
      'the chosen tab\'s rule must be painted in a colour the mode keeps');
    assert.equal(pseudo(win, current, 'after').opacity, '1');
    // The rule is painted on every tab and hidden by opacity, which the mode does
    // not touch, so restating the paint shows the chosen tab alone. The
    // transparent border Segmented reserves had to be named away; this does not.
    assert.equal(pseudo(win, other, 'after').opacity, '0', 'an unchosen tab\'s rule stays hidden');
    win.close();
  },
  'the chosen pill tab': (theme, css) => {
    const win = mount(navTabs({ items: TAB_ITEMS, active: 'b', variant: 'pill' }), theme, { css });
    const { current, other } = split(win, '.ui-nav__tab');
    assert.equal(win.getComputedStyle(current).backgroundColor, PALETTE[theme].Highlight,
      'the chosen pill takes the mode\'s selection fill');
    assert.equal(win.getComputedStyle(current).color, PALETTE[theme].HighlightText, 'and the ink that pairs with it');
    assert.equal(win.getComputedStyle(other).backgroundColor, CLEAR, 'an unchosen pill is not painted');
    win.close();
  },
  'the shell\'s pressed fold': (theme, css) => {
    const plate = (() => {
      const win = mount(shell(' is-collapsed'), theme, { css });
      return pseudo(win, win.document.querySelector('.ui-nav__item.is-active'), 'before');
    })();
    assert.equal(plate.borderTopColor, PALETTE[theme].Highlight, 'the pressed fold\'s plate must become an edge the mode keeps');
    assert.equal(plate.backgroundColor, PALETTE[theme].Canvas, 'the pressed fold\'s plate must not fill under the glyph');
  },
  'the shell\'s narrow fold': (theme, css) => {
    const plate = (() => {
      const win = mount(shell(''), theme, { css, narrow: true });
      return pseudo(win, win.document.querySelector('.ui-nav__item.is-active'), 'before');
    })();
    assert.equal(plate.borderTopColor, PALETTE[theme].Highlight, 'the narrow fold\'s plate must become an edge the mode keeps');
    assert.equal(plate.backgroundColor, PALETTE[theme].Canvas, 'the narrow fold\'s plate must not fill under the glyph');
  },
  'the palette row\'s outline': (theme, css) => {
    const win = mount(commandPalette({ open: true, items: [{ id: 'a', label: 'Dashboard' }, { id: 'b', label: 'Campaigns' }] }), theme, { css });
    const { current, other } = split(win, '.ui-cmdk__item');
    assert.equal(win.getComputedStyle(current).backgroundColor, PALETTE[theme].Canvas, 'the row\'s fill is replaced, as every fill is');
    // Read as the shorthand, because JSDOM expands no outline longhands.
    assert.equal(win.getComputedStyle(current).outline, `1px solid ${PALETTE[theme].CanvasText}`,
      'the active row\'s outline is the signal that survives the mode, so it may not be traded for a background');
    assert.equal(win.getComputedStyle(other).outline, '', 'only the active row is boxed');
    win.close();
  },
};

for (const [name, check] of Object.entries(CHECKS)) {
  for (const theme of THEMES) test(`forced colours: ${name}: ${theme}`, () => check(theme, sheetsAs()));
}

/* ---- discovery -----------------------------------------------------------
 * A subject is a rule that names a current or selected state and draws
 * something in a property the mode replaces. Every one has to be accounted for:
 * answered inside a forced block, or listed in SETTLED with the reason it needs
 * no answer. The count is asserted, so a new one lands in neither and fails.
 */
const NAMES_STATE = /\.is-active|\.is-current|\[aria-pressed="true"\]|\[aria-selected="true"\]/;
const REPLACED = /^(?:background|background-color|box-shadow)$/;
// `none` removes paint rather than carrying a state, so it is not a subject.
const CARRIES = (d) => REPLACED.test(d.prop) && d.value.trim() !== 'none';
/* What the mode recolours instead of replacing, and so can still draw an edge or
 * a fill: not `border-radius`, which is shape and draws nothing, and not
 * `font-weight`, which survives the mode but is type rather than paint — the
 * current rail row has one and is still a subject, because a weight step alone
 * is not what this sheet set out to say. A rule with one of these is not at
 * fault: the palette's active row declares a 1px outline beside its fill, which
 * is exactly why it needs no block and why the check above pins that outline. */
const DURABLE = /^(?:outline|outline-color|outline-width|text-decoration(?:-line|-color)?|forced-color-adjust|border(?:-top|-right|-bottom|-left)?(?:-color|-width|-style)?)$/;

const subjects = SHEETS.flatMap((file) => leafRules(source[file])
  .filter((r) => !r.at.some((prelude) => FORCED_AT.test(prelude)))
  .filter((r) => NAMES_STATE.test(r.selector) && r.decls.some(CARRIES))
  // A state's own hover and focus rules are that state's other rules, not the
  // signal that tells it from the rows beside it.
  .filter((r) => !/:hover|:focus-visible/.test(r.selector))
  .filter((r) => !r.decls.some((d) => DURABLE.test(d.prop)))
  .map((r) => ({ file, where: `${file} ${r.selector}`, at: `${file} line ${r.line}`, selector: r.selector })));

/* The subjects that need no forced-colours rule of their own, each with its
 * reason. Keyed by selector rather than by line, so an edit above one does not
 * silently move an entry onto a different rule. A reason is not a waiver: the state it belongs to is still rendered
 * and read back above, so if one of these turns out to have been the only
 * signal, a check fails whatever this list says. */
const SETTLED = new Map([
  ['src/styles/nav.css .ui-nav__item.is-active', 'The open row\'s plate. Not restored: a fill under system-painted ink is the pair the forced palette does not promise. The marker and the weight step carry the row, and both are read back above.'],
  ['src/styles/nav.css .ui-nav--side .ui-nav__item.is-active', 'The open row\'s hairline, drawn in box-shadow, which the mode drops whatever is declared. Same answer as the plate above.'],
  ['src/styles/nav.css .ui-nav__item.is-active .ui-nav__badge.is-neutral', 'A badge on the current row rather than a signal of it: this paints the same --surface the resting badge already has.'],
  ['src/styles/nav.css .ui-nav__item.is-active .ui-nav__badge.is-accent', 'The accent counter dropping its wash on the current row. Every badge reads Canvas in the mode, so no pair is left to keep apart, and the row is told by its marker.'],
  ['src/styles/command-palette.css .ui-cmdk--roomy .ui-cmdk__item.is-active .ui-cmdk__ic', 'The roomy variant\'s icon tile on the active row: the same --surface the resting tile has, so it draws no state in either mode.'],
]);

test('forced colours: every current-state paint rule is answered or settled', () => {
  assert.equal(subjects.length, 10,
    'the sheets\' current-state paint rules changed; decide what the new one does in forced colours, then answer it or settle it here');
  const answered = SHEETS.flatMap((file) => forcedRulesOf(source[file]).map((r) => r.selector));
  const base = (sel) => sel.replace(/::(before|after)$/, '').trim();
  const unaccounted = subjects.filter((s) => !SETTLED.has(s.where)
    && !answered.some((sel) => base(sel).endsWith(base(s.selector)) || base(s.selector).endsWith(base(sel))));
  assert.deepEqual(unaccounted.map((s) => s.where), [],
    'these draw a current state in a property forced colours replaces, and say nothing about the mode');
  assert.equal(SETTLED.size, 5, 'the settled list changed; every entry states why that rule needs no forced-colours answer');
  for (const [where, why] of SETTLED) {
    assert.ok(subjects.some((s) => s.where === where), `${where} is settled but is no longer a subject — drop the entry`);
    assert.ok(why.length > 80, `${where} needs a reason, not a label`);
  }
});

/* Read from the source, not from a render, and deliberately so: every folded
 * plate's resting fill is --surface-3, which the mode replaces with Canvas on its
 * own, so a render cannot tell `background: Canvas` being written here from the
 * cascade arriving at it anyway. What the declaration buys is that the plate goes
 * on leaving the ground alone if that resting fill is ever changed to something
 * the mode keeps — and a reader does not have to resolve three sheets to see
 * that the edge, not a fill, is the intent. So the contract is held where it
 * lives. The rendered half is the check above. */
test('forced colours: a plate that becomes an edge states its ground as well', () => {
  const edges = SHEETS.flatMap((file) => forcedRulesOf(source[file])
    .filter((r) => r.decls.some((d) => /^border/.test(d.prop) && /Highlight/.test(d.value)))
    .map((r) => ({ where: `${file}:${r.line}`, decls: r.decls })));
  assert.equal(edges.length, 3, 'one folded plate for the standalone rail and two for the shell');
  for (const edge of edges) {
    assert.ok(
      edge.decls.some((d) => /^background/.test(d.prop) && d.value.trim() === 'Canvas'),
      `${edge.where} draws a Highlight edge over a ground it does not name; a fill under system-painted ink is the pair the mode does not promise`,
    );
  }
});

/* The backplate, and the rule that answers it. Chromium paints a Canvas
 * backplate behind text, so HighlightText on a Highlight fill comes out ink on
 * ink and the chosen pill loses its word; `forced-color-adjust: none` is the
 * only way to keep a fill under text. (PR #473 proposes the same for Segmented;
 * it is unmerged, so nothing here is precedent for it.) The opt-out exempts the
 * element from the WHOLE mode, so it owes three things back — the mode's
 * `box-shadow: none`, the repaint of its transparent outline, and its children's
 * ink. Asserted on source: limit 6 above means the render cannot see the first.
 */
function debtsOf(sheets = {}) {
  const forced = SHEETS.flatMap((file) => forcedRulesOf(sheets[file] ?? source[file]).map((r) => ({ file, ...r })));
  const optedOut = forced.filter((r) => r.decls.some((d) => d.prop === 'forced-color-adjust' && d.value.trim() === 'none'));
  assert.deepEqual(
    optedOut.map((r) => r.selector), ['.ui-nav--tabs.is-pill .ui-nav__tab.is-active'],
    'the opt-out is the exception for a fill under words; a new one needs its own reason and its own two rules below',
  );
  const [pill] = optedOut;
  assert.ok(pill.decls.some((d) => /^background/.test(d.prop) && d.value.trim() === 'Highlight'),
    'the rule opts out but paints no fill, so it is paying the cost for nothing');

  // Debt 1. The mode drops box-shadow; this element is exempt, so it keeps the
  // kit's --ring and draws a second, author-coloured focus indicator.
  assert.ok(pill.decls.some((d) => d.prop === 'box-shadow' && d.value.trim() === 'none'),
    'an opted-out element is exempt from the mode dropping box-shadow, so it keeps --ring and draws '
    + 'a purple glow beside the system outline — it must drop the shadow itself');

  const under = (suffix) => forced.find((r) => r.selector === `${pill.selector}${suffix}`);
  // Debt 2.
  const focus = under(':focus-visible');
  assert.ok(focus, 'opting out stops the mode repainting the transparent outline, so the chosen pill has no focus indicator left');
  assert.ok(focus.decls.some((d) => d.prop === 'outline' && /\b(?:HighlightText|CanvasText|ButtonText)\b/.test(d.value)),
    'the focus indicator it buys back must be a real outline in a system colour');

  // Debt 3.
  const badge = under(' .ui-nav__badge');
  assert.ok(badge, 'opting out is inherited, so the badge inside the chosen pill keeps kit colours unless it is restated');
  for (const prop of ['background', 'color']) {
    assert.ok(badge.decls.some((d) => d.prop === prop && SYSTEM.test(d.value.trim())),
      `the badge inside the chosen pill needs a system ${prop}, or it paints a kit colour on Highlight`);
  }
}

test('forced colours: the one fill under words opts out, and pays all three debts', () => debtsOf());

test('forced colours: the sheets that need the mode declare it', () => {
  for (const file of ['src/styles/nav.css', 'src/styles/layout.css']) {
    assert.ok(forcedRulesOf(source[file]).length > 0, `${file} draws a current state in paint and says nothing about the mode`);
  }
  assert.equal(forcedRulesOf(source['src/styles/command-palette.css']).length, 0,
    'the palette needs no block: its active row is carried by an outline, which is why that outline is pinned above');
});

test('forced colours: system colours stay inside the blocks, so normal rendering is untouched', () => {
  for (const file of SHEETS) {
    for (const rule of leafRules(source[file])) {
      if (rule.at.some((prelude) => FORCED_AT.test(prelude))) continue;
      for (const d of rule.decls) {
        const named = d.value.split(/[\s(),]+/).find((word) => SYSTEM.test(word));
        assert.equal(named, undefined,
          `${file}:${d.line} names a system colour outside a forced-colors block, which would change normal rendering`);
      }
    }
  }
});

/* ---- rejection -----------------------------------------------------------
 * Each mutation removes one declaration a check rests on, and re-runs that
 * check. Without these the file would pass against a sheet that had quietly
 * lost the block — which is how this defect reached main in the first place:
 * #473's review found it by reading, not by running anything.
 */
for (const [name, check, file, from, to, expected] of [
  ['the open rail\'s marker', 'the open rail\'s marker', 'src/styles/nav.css',
    '.ui-nav--side .ui-nav__item.is-active::before { background: Highlight; }', '',
    /the current row's marker must be painted/],
  ['the folded rail\'s edge', 'the folded rail\'s plate', 'src/styles/nav.css',
    '.ui-nav--side.is-collapsed .ui-nav__item.is-active::before { background: Canvas; border: 1px solid Highlight; }',
    '.ui-nav--side.is-collapsed .ui-nav__item.is-active::before { background: Canvas; }',
    /must become an edge the mode keeps/],
  ['the underline tab\'s rule', 'the underline tab\'s rule', 'src/styles/nav.css',
    '.ui-nav--tabs.is-underline .ui-nav__tab::after { background: Highlight; }', '',
    /the chosen tab's rule must be painted/],
  ['the chosen pill\'s fill', 'the chosen pill tab', 'src/styles/nav.css',
    '.ui-nav--tabs.is-pill .ui-nav__tab.is-active { forced-color-adjust: none; background: Highlight; color: HighlightText; box-shadow: none; }', '',
    /the chosen pill takes the mode's selection fill/],
  ['the chosen pill\'s ink', 'the chosen pill tab', 'src/styles/nav.css',
    'background: Highlight; color: HighlightText; box-shadow', 'background: Highlight; box-shadow',
    /and the ink that pairs with it/],
  ['the shell\'s pressed fold', 'the shell\'s pressed fold', 'src/styles/layout.css',
    '  :where(.ui-app.is-collapsed) .ui-app__rail .ui-nav__item.is-active::before { background: Canvas; border: 1px solid Highlight; }', '',
    /the pressed fold's plate must become an edge/],
  ['the shell\'s narrow fold', 'the shell\'s narrow fold', 'src/styles/layout.css',
    '    .ui-app__rail .ui-nav__item.is-active::before { background: Canvas; border: 1px solid Highlight; }', '',
    /the narrow fold's plate must become an edge/],
  ['the palette row\'s outline', 'the palette row\'s outline', 'src/styles/command-palette.css',
    '.ui-cmdk__item.is-active { outline: 1px solid var(--control-edge); outline-offset: -1px;', '.ui-cmdk__item.is-active {',
    /the active row's outline is the signal that survives the mode/],
]) {
  test(`rejects removing ${name}`, () => {
    const mutated = source[file].replace(from, to);
    assert.notEqual(mutated, source[file], `the mutation found its declaration in ${file}`);
    const css = sheetsAs({ [file]: mutated });
    for (const theme of THEMES) assert.throws(() => CHECKS[check](theme, css), expected, `${name}, ${theme}`);
  });
}

/* The ground above is a source contract, so its mutation is one too. */
test('rejects dropping the ground a folded plate\'s edge is drawn over', () => {
  const mutated = source['src/styles/nav.css'].replace(
    '.ui-nav--side.is-collapsed .ui-nav__item.is-active::before { background: Canvas; border: 1px solid Highlight; }',
    '.ui-nav--side.is-collapsed .ui-nav__item.is-active::before { border: 1px solid Highlight; }');
  assert.notEqual(mutated, source['src/styles/nav.css'], 'the mutation found the declaration');
  const rules = forcedRulesOf(mutated).filter((r) => r.decls.some((d) => /^border/.test(d.prop) && /Highlight/.test(d.value)));
  assert.equal(rules.length, 1, 'the mutation left the folded plate to check');
  assert.ok(!rules[0].decls.some((d) => /^background/.test(d.prop) && d.value.trim() === 'Canvas'),
    'the ground is gone, which is what the test above refuses');
});

/* The opt-out's three debts are source contracts, so their mutations are too.
 * Each removes one debt and re-runs the check above. Debt 1 is a declaration
 * rather than a rule, and it is the one that reached a pushed head: the
 * emulation drops every box-shadow and discovery skips :focus-visible, so only
 * a source assertion and a Chromium frame can see it. */
for (const [name, from, to, expected] of [
  ['the ring suppression', ' color: HighlightText; box-shadow: none; }', ' color: HighlightText; }',
    /it keeps --ring and draws/],
  ['the focus indicator',
    '  .ui-nav--tabs.is-pill .ui-nav__tab.is-active:focus-visible { outline: 2px solid HighlightText; outline-offset: -4px; }\n', '',
    /has no focus indicator left/],
  ['the badge ink',
    '  .ui-nav--tabs.is-pill .ui-nav__tab.is-active .ui-nav__badge { background: Canvas; color: CanvasText; }\n', '',
    /keeps kit colours unless it is restated/],
]) {
  test(`rejects removing ${name} the chosen pill opts out of`, () => {
    const mutated = source['src/styles/nav.css'].replace(from, to);
    assert.notEqual(mutated, source['src/styles/nav.css'], `the mutation found ${name} in nav.css`);
    assert.throws(() => debtsOf({ 'src/styles/nav.css': mutated }), expected, name);
  });
}
