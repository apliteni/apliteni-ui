// The numbers stated on Accessibility minimums, each measured.
//
// The Accessibility minimums page (stories/guidelines/_accessibility-floor.js) states a minimum target
// size, a contrast for `--ring` and a legibility floor for a disabled control, none of
// which existed in this tree before #201. This file measures all three against what the
// kit ships, with measured results and discovered subjects.
//
// Every subject is discovered: controls from the rendered stories, interactive BY ROLE;
// the ring's landings and the disabled rules read off the stylesheet declarations rather
// than assumed (#157, #220); and a control's OVERLAYS probed onto their host, because
// WCAG 2.5.8 measures the target and not the ink (#219).
//
// Discover subjects from source and check the coverage count.
// Fail if a custom property cannot be resolved.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { focusBand } from '../../scripts/lib/box-shadow.js';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';
import {
  STYLE_FILES, kitCssFor, substitute, desugar, parseColour, composite, ratio,
  effectiveBackground, makeStyleCache, storyFiles,
  selectorPath, tokensFor,
} from '../lib/contrast.js';
import {
  RULE, decomment, probeGeometry, probe, px, boxOf, glyphOf, windowFor,
} from '../lib/target-geometry.js';
import {
  TARGET_MIN, RING_MIN, RING_FLOOR, DISABLED_MIN, DISABLED_FLOOR, TARGET_EXEMPT,
  RULES,
} from './_accessibility-floor.js';

const { GATES } = JSON.parse(readFileSync(new URL('./accessibility-coverage.json', import.meta.url), 'utf8'));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const THEMES = ['dark', 'light'];
const sheet = () => decomment(STYLE_FILES.map((f) => readFileSync(path.join(root, f), 'utf8')).join('\n'));
const serialize = (out) => (typeof out === 'string' ? out : (out && out.outerHTML) || null);

/** Every rule in the kit's sheet, as [selector, body] with comments gone. */
function rules(css) {
  const out = [];
  for (const [, sel, body] of css.matchAll(RULE)) {
    if (sel.trimStart().startsWith('@')) continue;
    out.push([sel.trim().replace(/\s+/g, ' '), body]);
  }
  return out;
}

// ---- discovery ------------------------------------------------------------

/**
 * Selectors that paint the focus band, taken from the sheet that paints it. It is an
 * `outline` since #578, so the property is part of the reading: `:root` mentions
 * `var(--ring)` too — `--ring-scroll` is built from it — and declaring the band is not
 * drawing it.
 */
function ringSelectors(css) {
  const out = [];
  for (const [sel, body] of rules(css)) {
    if (!/(?:^|;)\s*outline\s*:[^;]*var\(--ring\)/.test(body)) continue;
    out.push(...splitSelectorList(sel));
  }
  return [...new Set(out)];
}

/**
 * The three ways this kit's sheet spells "off", written once. Each spelling
 * knows how it appears in a selector, how it appears on an element, and how to
 * take it off — so the regex that finds a disabled rule, the query that finds
 * the element carrying the state, and the undo that turns it back on cannot
 * drift apart. A fourth spelling is one entry here, not three edits.
 */
const DISABLED_SPELLINGS = [
  {
    inSelector: ':disabled',
    inDom: '[disabled]',
    off: (el) => { el.removeAttribute('disabled'); return () => el.setAttribute('disabled', ''); },
  },
  {
    inSelector: '[aria-disabled',
    inDom: '[aria-disabled="true"]',
    off: (el) => {
      const was = el.getAttribute('aria-disabled');
      el.removeAttribute('aria-disabled');
      return () => el.setAttribute('aria-disabled', was);
    },
  },
  {
    inSelector: '.is-disabled',
    inDom: '.is-disabled',
    off: (el) => { el.classList.remove('is-disabled'); return () => el.classList.add('is-disabled'); },
  },
];
const DISABLED_SEL = new RegExp(
  DISABLED_SPELLINGS.map((s) => s.inSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
);
const DISABLED_STATE = DISABLED_SPELLINGS.map((s) => s.inDom).join(', ');

/**
 * Rules that paint a control because it is disabled, with the alpha each one
 * leaves it at. A selector is the subject and `opacity` is only its mechanism —
 * looking for the mechanism was how this list was built until #220, and a gate
 * keyed on one technique goes silent the moment the technique changes. Where a
 * selector appears in more than one rule the worst alpha wins.
 */
function disabledRules(css) {
  const out = new Map();
  for (const [sel, body] of rules(css)) {
    if (!DISABLED_SEL.test(sel)) continue;
    const m = body.match(/(?:^|;)\s*opacity\s*:\s*([\d.]+)/);
    for (const selector of splitSelectorList(sel)) {
      if (!DISABLED_SEL.test(selector)) continue;
      const opacity = m ? Number(m[1]) : 1;
      // A rule that says the state with the line around the box and nothing else repaints
      // that box and not what is inside it: the labels in there are dimmed by whichever
      // rule paints THEIR ink, which is a subject of its own. So the repaint check below
      // asks such a rule about its own box only. #518
      const edgeOnly = /(?:^|;)\s*border(?:-[\w-]+)?\s*:/.test(body)
        && !/(?:^|;)\s*(color|background|background-color|opacity|filter)\s*:/.test(body);
      const prev = out.get(selector);
      if (!prev || opacity < prev.opacity) out.set(selector, { selector, opacity, edgeOnly });
    }
  }
  return [...out.values()];
}

/**
 * Turn a rendered control back on, and hand back the undo. The state is not
 * always on the element the rule selects — `.ui-dropdown__item.is-disabled
 * .ui-dropdown__label` paints a label whose ancestor carries the class — so the
 * nearest element actually holding a spelling is the one turned off.
 *
 * It is not always ABOVE the element either. `:has()` paints from a state held by
 * a DESCENDANT: `.ui-check:has(input:disabled)` dims a label because the input
 * inside it is off. Searching only upwards found nothing there, returned a no-op
 * undo, and so measured the same paint twice — which reads as "this control does
 * not repaint" no matter what the rule says. The search goes up, then in. #429
 */
function enable(el) {
  const host = el.closest(DISABLED_STATE) || el.querySelector(DISABLED_STATE);
  if (!host) return () => {};
  const undo = DISABLED_SPELLINGS.filter((s) => host.matches(s.inDom)).map((s) => s.off(host));
  return () => undo.forEach((f) => f());
}

// Interactive BY ROLE, never by kit class — a class list is a list somebody
// maintains, and this one has to cover a component nobody has written yet.
// A bare `tabindex` is deliberately NOT here: 2.5.8 is about POINTER targets,
// and a focusable scroll region or tabpanel is reachable without ever being
// aimed at. What makes something a subject is that clicking it does something.
const INTERACTIVE = [
  'button', 'a[href]', 'input', 'select', 'textarea', 'summary',
  '[role="button"]', '[role="link"]', '[role="tab"]', '[role="switch"]',
  '[role="checkbox"]', '[role="radio"]', '[role="menuitem"]', '[role="option"]',
  '[role="menuitemcheckbox"]', '[role="menuitemradio"]',
].join(', ');

// ---- the walks ------------------------------------------------------------

/** Mount every story once and hand each one's body to `visit`. */
async function walk(win, styles, vars, visit) {
  let stories = 0;
  const problems = [];
  for (const rel of storyFiles) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      let out;
      try {
        out = render({ ...def.args, ...story.args }, { globals: {}, args: {} });
      } catch (err) {
        problems.push(`${rel}:${name} → render threw: ${err && err.message}`);
        continue;
      }
      const html = serialize(out);
      if (html == null) {
        problems.push(`${rel}:${name} → render returned ${Object.prototype.toString.call(out)}`);
        continue;
      }
      stories += 1;
      // A story carries its own <style> block, and a control styled only there
      // would measure as an unstyled box. Same treatment as the kit's sheet:
      // probe it, or the geometry walk quietly reports zeros.
      const markup = vars
        ? desugar(substitute(html, vars))
        : html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, inner) => `<style>${probeGeometry(decomment(inner))}</style>`);
      if (styles) styles.mutate(() => { win.document.body.innerHTML = markup; });
      else win.document.body.innerHTML = markup;
      // The markup goes with it, so a caller can put the same story in front of
      // a second sheet — which is how the phone strip is measured below without
      // walking every story twice.
      visit(`${rel}:${name}`, markup);
    }
  }
  return { stories, problems };
}


// ---- 1. the minimum target size -------------------------------------------

/**
 * WCAG 2.5.5, AAA. Not the bar the kit holds everywhere — TARGET_MIN is — and
 * not a number this file chose: it is the floor the rail's 720px block has
 * carried since before #277, where the strip is the whole of the rail and a
 * finger is the only pointer it has.
 *
 * It is measured here and not merely compared, because the two copies of the
 * fold are held equal to each other by stories/apps/shell-states.test.js and
 * equality cannot see a shared value fall: when the 720px block was rewritten
 * the floor went out with it, both gates stayed green, and a row on a phone
 * went from 44px to 31px.
 */
const TOUCH_MIN = 44;

/** One at-rule's body, brace-matched. JSDOM resolves no @media, so a rule that
 *  only applies on a phone is lifted out and appended where a browser would
 *  apply it — the same device stories/apps/shell-states.test.js uses. */
function unwrap(css, query) {
  const at = css.indexOf(query);
  if (at < 0) return null;
  const open = css.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') { depth -= 1; if (depth === 0) return css.slice(open + 1, i); }
  }
  return null;
}

const FOLD = '@media (max-width: 720px)';
const RAIL_SHEET = 'src/styles/layout.css';
// Read out of layout.css by name, not out of the joined sheet: footer.css and
// topbar.css fold at 720px too, and the first block in the concatenation is one
// of theirs. Lifting the wrong one measured the rail at its desktop height and
// reported it as the phone's.
const narrowSheet = () => {
  const body = unwrap(decomment(readFileSync(path.join(root, RAIL_SHEET), 'utf8')), FOLD);
  assert.ok(body, `${RAIL_SHEET} no longer folds at ${FOLD}, so nothing here is measuring a phone`);
  return `${sheet()}\n${body}`;
};

/** Is every ancestor of `el`, and `el` itself, on screen? */
const onScreenIn = (el, win) => {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    if (n.hasAttribute('hidden') || win.getComputedStyle(n).display === 'none') return false;
  }
  return true;
};

/**
 * A control's accessible name, near enough for a rail: the `aria-label` it carries,
 * or else the text it DRAWS, with the aria-hidden parts taken out — which is what a
 * screen reader reads off a control that names itself by its own contents. Reading
 * `aria-label` alone reported the rail's account block as nameless, and it is named
 * by the two lines inside it (#286).
 *
 * Walked in the live tree rather than in a clone, because what the name turns on is
 * `display` and `visibility`, and a clone has no cascade: a fold that took a label
 * out with `display: none` still had its text in `textContent`, so the fallback
 * named a row a browser names nothing. That is the one mutation this helper has to
 * stay red for. A space after each element, because textContent runs children
 * together and a browser does not.
 */
const accessibleName = (el, win) => {
  const label = el.getAttribute('aria-label');
  if (label) return label.trim();
  const parts = [];
  const walk = (node) => {
    if (node.nodeType === 3) { parts.push(node.data); return; }
    if (node.nodeType !== 1) return;
    if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) return;
    const cs = win.getComputedStyle(node);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    for (const kid of node.childNodes) walk(kid);
    parts.push(' ');
  };
  for (const kid of el.childNodes) walk(kid);
  return parts.join('').replace(/\s+/g, ' ').trim();
};

const targetRun = await (async () => {
  const win = windowFor('dark', probeGeometry(sheet()));
  // The same stories in front of the same sheet with the 720px fold applied.
  // Only a story that draws a rail is put in front of it, so the walk stays one
  // walk and the phone costs what the shell stories cost.
  const narrowWin = windowFor('dark', probeGeometry(narrowSheet()));
  const controls = new Map();
  const folded = [];
  const strip = [];
  const { stories, problems } = await walk(win, null, null, (where, markup) => {
    if (win.document.body.querySelector('.ui-app__rail')) {
      narrowWin.document.body.innerHTML = markup;
      for (const el of narrowWin.document.body.querySelectorAll('.ui-app__rail .ui-nav__item')) {
        const cs = narrowWin.getComputedStyle(el);
        if (cs.opacity === '0' || probe(cs, 'position') === 'absolute') continue;
        // The fold toggle is display:none at this width — the strip is the only
        // layout there and there is nothing for it to choose.
        if (!onScreenIn(el, narrowWin)) continue;
        strip.push({
          where,
          name: el.getAttribute('aria-label') || '',
          ...boxOf(el, cs, glyphOf(el, narrowWin)),
        });
      }
    }
    for (const el of win.document.body.querySelectorAll(INTERACTIVE)) {
      const cs = win.getComputedStyle(el);
      // A control the page hides from the pointer is not a target. The kit's
      // switch and checkbox inputs are 0x0 under their own painted track, and
      // the track is the target; the input is not.
      if (cs.opacity === '0' || probe(cs, 'position') === 'absolute') continue;
      // A rail the reader folded draws the same classes as an open one, so the
      // de-duplication below would measure whichever a story drew first. Its
      // controls are kept apart and every one is measured (#277).
      // The reader's menu is a panel, not a row of the rail (#286): closed, its rows
      // are behind `visibility: hidden` and reachable from nowhere, and open it is
      // portalled off the rail entirely. It is measured as the dropdown it is, in the
      // de-duplicated walk below; here it would be held to every rule a rail row keeps.
      if (el.closest('.ui-app.is-collapsed .ui-app__rail') && !el.closest('[data-dropdown-panel]')) {
        // `onScreen`, not `drawn`: boxOf() returns a `drawn` key of its own —
        // the drawn box — and the spread below lands on top of this key. It used
        // to be called `drawn`, and every folded control came out of here with a
        // truthy `{height, width}` where the boolean was meant to be, so the
        // test that reads it could not fail. Named apart rather than reordered,
        // because a spread whose order is load-bearing is the same trap again.
        folded.push({
          where,
          name: accessibleName(el, win),
          label: (el.querySelector('.ui-nav__label')?.textContent || '').trim(),
          onScreen: onScreenIn(el, win),
          inClosedGroup: Boolean(el.closest('.ui-nav__sub[hidden]')),
          ...boxOf(el, cs, glyphOf(el, win)),
        });
      }
      const key = `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`;
      if (controls.has(key)) continue;
      const box = boxOf(el, cs, glyphOf(el, win));
      controls.set(key, { key, ...box, where, path: selectorPath(el) });
    }
  });
  return { stories, problems, controls: [...controls.values()], folded, strip };
})();

test('target size: every control the stories render is measured, none skipped', () => {
  assert.deepEqual(targetRun.problems, [], 'a story that will not render is a hole in the measurement');
  assert.ok(targetRun.stories > 40, `only ${targetRun.stories} stories walked`);
  assert.ok(targetRun.controls.length > 40, `only ${targetRun.controls.length} distinct controls found`);
});

test(`target size: no control is shorter than ${TARGET_MIN}px unless it is named exempt`, () => {
  const exempt = new Set(TARGET_EXEMPT.map((e) => e.control));
  const short = targetRun.controls
    .filter((c) => c.height < TARGET_MIN && !exempt.has(c.key))
    .map((c) => `${c.key} — ${c.height}px high (${c.where})`);
  assert.deepEqual(short, [], 'under the floor and unnamed');
});

test(`target size: no control is narrower than ${TARGET_MIN}px on the axis we can measure`, () => {
  const exempt = new Set(TARGET_EXEMPT.map((e) => e.control));
  const narrow = targetRun.controls
    .filter((c) => c.width != null && c.width < TARGET_MIN && !exempt.has(c.key))
    .map((c) => `${c.key} — ${c.width}px wide (${c.where})`);
  assert.deepEqual(narrow, [], 'under the floor and unnamed');
});

test('target size: every exemption names a control that is really there and really short', () => {
  const byKey = new Map(targetRun.controls.map((c) => [c.key, c]));
  for (const e of TARGET_EXEMPT) {
    const got = byKey.get(e.control);
    assert.ok(got, `exemption names ${e.control}, which no story renders any more — delete it`);
    const under = got.height < TARGET_MIN || (got.width != null && got.width < TARGET_MIN);
    assert.ok(under, `${e.control} measures ${got.height}x${got.width ?? '?'} and clears ${TARGET_MIN}px — the exemption is stale`);
    assert.ok(e.why && e.why.length > 20, `${e.control}'s exemption has no reason`);
  }
});

// 2.5.8 is about the TARGET, so a control may keep its ink and grow only what a
// pointer can land on. Two in the kit do, and this is the test that proves the
// gate can see it: delete the pseudo probe and this fails, where the floor tests
// above would go on passing on the two controls that no longer reach it.
test('target size: the overlay path is exercised, and the ink under it is still small', () => {
  const short = (b) => b.height < TARGET_MIN || (b.width != null && b.width < TARGET_MIN);
  const byOverlay = targetRun.controls.filter((c) => short(c.drawn) && !short(c));
  assert.ok(
    byOverlay.length,
    'no control reaches the floor through an overlay, so nothing here measures one — if the kit '
    + 'really has none left, take the pseudo probe out rather than leaving it untested',
  );
  for (const c of byOverlay) {
    assert.ok(
      c.drawn.height < c.height || (c.drawn.width != null && c.drawn.width < c.width),
      `${c.key}: the overlay is no larger than the box it is on — it is not doing anything`,
    );
  }
});

test('target size: no control carries an overlay this gate cannot measure', () => {
  const opaque = targetRun.controls
    .filter((c) => c.unreadable.length)
    .map((c) => `${c.key} — ${c.unreadable.join(', ')} (${c.where})`);
  assert.deepEqual(
    opaque, [],
    'an out-of-flow pseudo-element with no size this gate can read is a target reported as absent. '
    + 'Give it a width and a height, or insets against a padding box that is itself measurable.',
  );
});

// The page badges its own gaps (`unmet`), and a badge that outlives its failure
// is the same rot in the other direction. Derived from the exemptions rather
// than asserted, so retiring the last one retires the badge with it.
test('target size: the page badges a gap exactly when an exemption is still holding one open', () => {
  const rule = RULES.find((r) => r.id === 'target-size');
  assert.ok(rule, 'the target-size rule is gone from the Accessibility minimums page');
  const open = TARGET_EXEMPT.filter((e) => e.issue).map((e) => e.control);
  assert.equal(
    Boolean(rule.unmet), open.length > 0,
    open.length
      ? `the kit is still short at ${open.join(', ')} and the page claims no gap`
      : 'no exemption is a failure any more — take the gap off the page',
  );
});

test('target size: the sm size the kit ships is measured, and is on the record', () => {
  const sm = targetRun.controls.filter((c) => /ui-btn--sm/.test(c.key));
  assert.ok(sm.length >= 2, 'no sm button rendered — the size stopped being measured');
  for (const c of sm) {
    assert.ok(c.height >= TARGET_MIN, `${c.key} is ${c.height}px high, under ${TARGET_MIN}px`);
  }
});

// ---- 1b. the rail the reader folded (#277) --------------------------------
//
// Folding the rail takes every label off the screen, which is exactly when the
// floor is easiest to lose: a row is its glyph, its name is only an attribute,
// and a rule that hides a row takes it out of the keyboard's reach.

test('folded rail: a story renders one, and every control in it is measured', () => {
  const specimens = new Set(targetRun.folded.map((c) => c.where));
  assert.ok(
    specimens.size >= 1,
    'no story renders a rail the reader folded, so nothing measures the state the shell is folded into',
  );
  assert.ok(targetRun.folded.length >= 5, `only ${targetRun.folded.length} controls found in a folded rail`);
  const short = targetRun.folded
    .filter((c) => c.height < TARGET_MIN)
    .map((c) => `${c.name || '(unnamed)'} — ${c.height}px high (${c.where})`);
  assert.deepEqual(short, [], `a folded rail control under ${TARGET_MIN}px`);
});

test('folded rail: every control keeps a name with its label gone, and the name starts with the label', () => {
  const bad = targetRun.folded
    .filter((c) => !c.name || (c.label && !c.name.startsWith(c.label)))
    .map((c) => `"${c.name}" for a row labelled "${c.label}" (${c.where})`);
  assert.deepEqual(bad, [], 'a folded row has no name of its own, or one a speech user cannot say from the tag');
});

// The phone strip, measured rather than compared. shell-states.test.js holds the
// reader's fold and the 720px fold equal to each other, rule for rule and
// property for property — and that is exactly why neither could notice when the
// floor they share went down: equality is silent about a value that falls on
// both sides at once. This reads the box a finger lands on at 375px.
test(`phone strip: no rail row is shorter than ${TOUCH_MIN}px below 720px`, () => {
  assert.ok(
    targetRun.strip.length >= 5,
    `only ${targetRun.strip.length} rail rows measured below 720px — no story draws a shell rail any `
    + 'more, or the fold stopped being lifted, and this gate is measuring nothing',
  );
  const short = targetRun.strip
    .filter((c) => c.height < TOUCH_MIN)
    .map((c) => `${c.name || '(unnamed)'} — ${c.height}px high (${c.where})`);
  assert.deepEqual(
    short, [],
    `a rail row on a phone is under the ${TOUCH_MIN}px touch floor. At this width the strip is the `
    + 'whole of the rail and a finger is the only pointer it has, so the row is the target. The floor '
    + 'is the 720px block\'s own `min-height` in src/styles/layout.css.',
  );
});

test('folded rail: every control a reader can reach is drawn', () => {
  // The tripwire for the bug this test had: a truthy object in place of the
  // boolean made the filter below unfalsifiable, and the test went on passing
  // over a rail with a `display: none` row in it.
  const notBoolean = targetRun.folded
    .filter((c) => typeof c.onScreen !== 'boolean')
    .map((c) => `${c.name || '(unnamed)'} → ${Object.prototype.toString.call(c.onScreen)}`);
  assert.deepEqual(
    notBoolean, [],
    'a folded control reports something other than true or false for whether it is on screen, so the '
    + 'check below is reading a value that cannot be falsy and this gate holds nothing',
  );
  const gone = targetRun.folded
    .filter((c) => !c.onScreen && !c.inClosedGroup)
    .map((c) => `${c.name} (${c.where})`);
  assert.deepEqual(gone, [], 'a folded rail control is display:none, so Tab passes it by');
});

// ---- 2. the ring's contrast ------------------------------------------------

// Every accent the kit ships, discovered from the file that declares them —
// #218 found --ring written out eight times, and the two this gate measured
// were the two that were least wrong. The sub-themes re-point --accent, --ring
// is var(--accent), so each cell paints a different ring on the same surfaces.
// A new data-accent block is in the gate the moment it is written.
const ACCENTS = ['default', ...new Set(
  [...readFileSync(path.join(root, 'src/tokens/accents.css'), 'utf8')
    .matchAll(/\[data-accent="([\w-]+)"\]/g)].map((m) => m[1]),
)];
const CELLS = THEMES.flatMap((theme) => ACCENTS.map((accent) => ({ theme, accent })));

const ringRun = await (async () => {
  const selectors = ringSelectors(sheet());
  const byCell = {};
  for (const { theme, accent } of CELLS) {
    const { vars, css } = kitCssFor(theme, accent);
    const win = windowFor(theme, css);
    const styles = makeStyleCache(win);
    // --ring is a var() now, not a literal, so it is resolved through the same
    // token map the sheet is. Reading the raw declaration would find no colour.
    const ringValue = substitute(vars.get('--ring') || '', vars);
    const band = focusBand(ringValue);
    assert.ok(band, `${theme}/${accent}: the shared ring is no longer a solid outline band`);
    const ring = parseColour(band[1]);
    assert.ok(ring, `${theme}/${accent}: the solid band colour did not resolve`);
    const landings = new Map();
    const { stories } = await walk(win, styles, vars, () => {
      for (const sel of selectors) {
        // The ring's own state pseudo-classes are what the sheet keys on; the
        // GROUND does not move when the control takes focus, so the base
        // selector finds the same element without forcing anything.
        const base = sel.replace(/:focus-visible|:focus/g, '').replace(/\s*\+\s*\.ui-switch__track/, '');
        const wantsSibling = sel.includes('+ .ui-switch__track');
        let hits;
        try { hits = win.document.body.querySelectorAll(base); } catch { continue; }
        for (const hit of hits) {
          const el = wantsSibling ? hit.parentElement?.querySelector('.ui-switch__track') : hit;
          const ground = el && el.parentElement && effectiveBackground(el.parentElement, win, styles.of);
          if (!ground) continue;
          const key = `${sel}|${ground === 'IMAGE' ? 'IMAGE' : ground.join(',')}`;
          if (landings.has(key)) continue;
          landings.set(key, {
            selector: sel,
            ground: ground === 'IMAGE' ? 'IMAGE' : `rgb(${ground.slice(0, 3).map(Math.round).join(', ')})`,
            ratio: ground === 'IMAGE' ? null : ratio(composite(ring, ground), ground),
          });
        }
      }
    });
    byCell[`${theme}/${accent}`] = {
      theme, accent, ring: ringValue.trim(), stories, landings: [...landings.values()], selectors,
    };
  }
  return byCell;
})();

const CELL_KEYS = Object.keys(ringRun);

test('ring: every selector the sheet paints a ring on is landed somewhere by a story', () => {
  for (const key of CELL_KEYS) {
    const run = ringRun[key];
    assert.ok(run.selectors.length >= 15, `${key}: only ${run.selectors.length} ring selectors found in the sheet`);
    const landed = new Set(run.landings.map((l) => l.selector));
    // `.ui-focusable` is the kit's opt-in focus class
    // (src/styles/base.css:151 `.ui-focusable:focus-visible,`). No vanilla component
    // wears it and no vanilla story renders one, so it has no ground to be measured
    // against — a fact about the class, not a hole here. React's Tooltip trigger wears
    // it and is swept elsewhere. It is named rather than filtered so it cannot quietly
    // become two.
    //
    // The Finance dashboard's head link wore it until round 38 removed that link.
    // A later commit on this PR claimed coverage back by string-pasting the class
    // onto a primary Button, which measures the ring against the button's own
    // fill — already covered by `.ui-btn:focus-visible` — rather than against a
    // real surface. PR #552 code review, finding F5: the exception is restored
    // rather than that false carrier kept.
    //
    // A reader looking for the gap this leaves: the subjects are the selectors the
    // sheet ALREADY rings, so a control given no focus rule at all is invisible here
    // however many stories draw it. stories/focus-ring.test.js walks the controls
    // instead, on the landing page and the shell, footer and topbar stories; a control
    // with no ring rule drawn only on a guideline page is caught by neither.
    const orphans = run.selectors.filter((s) => !landed.has(s));
    assert.deepEqual(orphans, ['.ui-focusable:focus-visible'], `${key}: a ring selector no story renders is a ring nobody measured`);
  }
});

// Every accent is swept, not just the two themes: the ring is var(--accent) and
// each sub-theme re-points it, so `phoenix` is a different ring on the same
// surfaces. #201 measured the default accent only and reported 1.50 as the
// worst the kit had; light emerald was 1.35 the whole time.
test(`ring: ${RING_MIN}:1 against every ground it lands on, in every theme x accent cell`, () => {
  const failing = CELL_KEYS.flatMap((key) => ringRun[key].landings
    .filter((l) => l.ratio != null && l.ratio < RING_MIN)
    .map((l) => `${key}: ${l.selector} on ${l.ground} — ${l.ratio.toFixed(2)}:1`));
  assert.deepEqual(
    failing, [],
    `${failing.length} ring landings under the ${RING_MIN}:1 of WCAG 1.4.11:\n  ${failing.join('\n  ')}`,
  );
});

// The bar above is what WCAG asks; this is what the kit actually reaches. They
// are the same shape and different numbers on purpose — the ratchet catches a
// token moving the ring DOWN long before it reaches the bar, which is the only
// warning anyone gets. It is the measured worst, so it moves only by being
// re-measured (the measured-pin rule).
test(`ring: nothing has drifted below ${RING_FLOOR}:1, the worst the kit measures today`, () => {
  const worse = CELL_KEYS.flatMap((key) => ringRun[key].landings
    .filter((l) => l.ratio != null && Math.round(l.ratio * 100) / 100 < RING_FLOOR)
    .map((l) => `${key}: ${l.selector} on ${l.ground} — ${l.ratio.toFixed(2)}:1`));
  assert.deepEqual(worse, [], 'a token moved a ring landing below the worst #218 measured');
});

// #218 retired the ledger this gate used to carry. The ring clears the bar in
// all eight cells now, so there is no gap to hold open — and the Accessibility minimums page
// must not still badge one.
test('ring: the Accessibility minimums page claims no gap, because there is none', () => {
  const ring = RULES.find((r) => r.id === 'ring-contrast');
  assert.ok(ring, 'the ring-contrast rule is gone from the Accessibility minimums page');
  assert.equal(ring.unmet, undefined, 'the ring clears the bar — retire the ledger rather than leaving it');
});

// One declaration, tunable at its three inputs. Until #578 there were three, because a
// box-shadow ring PAINTED its 1px gap and could only get that colour from the surface
// the control stood on, so every painted container recomposed the token. An outline
// leaves the gap unpainted, so one declaration reaches every control — and a second one
// is now drift rather than a surface doing its job.
// The browser evidence measures the band's edges; this walk measures its ink against
// flat grounds.
test('ring: the band is declared once, from the widths and the ink that tune it', () => {
  const declared = readdirSync(path.join(root, 'src'), { recursive: true })
    .map((f) => String(f).split(path.sep).join('/'))
    .filter((f) => f.endsWith('.css'))
    .sort()
    .flatMap((f) => [...decomment(readFileSync(path.join(root, 'src', f), 'utf8'))
      // A filled selected item repaints its ring in CanvasText in forced colours;
      // stories/ring-carrier.test.js holds that shape.
      .replace(/@media \(forced-colors: active\)\s*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, '')
      .matchAll(/(?:^|[;{])\s*--ring\s*:([^;}]*)/g)].map((m) => `src/${f}: ${m[1].trim()}`));
  const canonical = tokensFor('dark').get('--ring');
  assert.equal(declared.length, 1, 'the band is declared at :root and nowhere else');
  for (const entry of declared) assert.equal(entry.slice(entry.indexOf(': ') + 2), canonical, entry);
  for (const token of ['--ring-width', '--ring-color']) {
    assert.ok(canonical.includes(`var(${token})`), `${token} no longer tunes the band`);
  }
  // The gap's width is not in the band; it is the offset that places it.
  const offset = tokensFor('dark').get('--ring-offset');
  assert.ok(offset?.includes('var(--ring-gap-width)'),
    '--ring-offset no longer reads --ring-gap-width, so the gap is not tunable');
});

// ---- 3. the disabled legibility floor --------------------------------------

const disabledRun = await (async () => {
  const subjects = disabledRules(sheet());
  const byTheme = {};
  for (const theme of THEMES) {
    const { vars, css } = kitCssFor(theme);
    const win = windowFor(theme, css);
    const styles = makeStyleCache(win);
    const found = new Map();
    await walk(win, styles, vars, () => {
      for (const { selector, opacity, edgeOnly } of subjects) {
        const base = selector.replace(/\s*\+\s*\.ui-switch__track/, '');
        const wantsSibling = selector.includes('+ .ui-switch__track');
        let hits;
        try { hits = win.document.body.querySelectorAll(base); } catch { continue; }
        for (const hit of hits) {
          // Busy buttons expose aria-disabled to block activation while work is
          // in flight, but they intentionally retain their resting paint. They
          // are covered by the busy-state gate, not this disabled repaint gate.
          if (hit.getAttribute('aria-busy') === 'true') continue;
          const dimmed = wantsSibling ? hit.parentElement?.querySelector('.ui-switch__track') : hit;
          if (!dimmed) continue;
          // Everything inside the dimmed box is dimmed with it: `opacity` is a
          // group property, so the subtree's text and its own background fade
          // against the ground TOGETHER, and that composite is the pair a
          // reader actually sees.
          // A pair, at the alpha the state leaves the subtree at. `opacity` is a
          // group property, so at anything under 1 the subtree's text and its
          // own background fade against the ground TOGETHER, and that composite
          // is what a reader sees. At 1 — where #220 left every rule with a
          // label under it — the pair is simply the ink on the surface beside
          // it, which is the point of a dedicated paint.
          const pairOf = (el, ground, alpha) => {
            const cs = styles.of(el);
            const ink = parseColour(cs.color);
            if (!ink) return null;
            const own = effectiveBackground(el, win, styles.of);
            if (own === 'IMAGE') return null;
            const fade = (c) => [c[0], c[1], c[2], (c[3] ?? 1) * alpha];
            const bg = composite(fade(own), ground);
            const fg = composite(fade([ink[0], ink[1], ink[2], ink[3] ?? 1]), bg);
            // The edge joins the pair for the repaint comparison alone, never for the
            // ratio: a state can also be said by the line around the box, and a rule that
            // says it only that way was reading as no repaint at all. It can only make two
            // states differ that already read the same, never the other way round. #518
            return { ratio: ratio(fg, bg), paint: `${fg.join()}|${bg.join()}|${cs.borderTopColor}` };
          };
          const ground = effectiveBackground(dimmed.parentElement || dimmed, win, styles.of);
          if (ground === 'IMAGE') continue;
          const labels = (el) => (
            el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT'
            && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
          );
          const texts = [...dimmed.querySelectorAll('*')].filter(labels);
          // The subject's OWN paint as well as its labels', so a control with no
          // text node in it — an input holds its value in a property, a switch
          // track holds nothing at all — is still held to the repaint rule.
          const measured = edgeOnly ? [dimmed] : [dimmed, ...texts];
          const off = measured.map((el) => pairOf(el, ground, opacity));
          let restore;
          styles.mutate(() => { restore = enable(hit); });
          const onGround = effectiveBackground(dimmed.parentElement || dimmed, win, styles.of);
          const on = measured.map((el) => (
            onGround === 'IMAGE' ? null : pairOf(el, onGround, 1)));
          styles.mutate(() => restore());
          measured.forEach((el, i) => {
            if (!off[i]) return;
            const key = `${selector}|${selectorPath(el)}`;
            if (found.has(key)) return;
            found.set(key, {
              selector,
              opacity,
              ratio: off[i].ratio,
              repaints: !on[i] || on[i].paint !== off[i].paint,
              labelled: labels(el),
              path: selectorPath(el),
            });
          });
        }
      }
    });
    byTheme[theme] = { subjects, found: [...found.values()] };
  }
  return byTheme;
})();

test('disabled: every rule that dims a control is found, and a story renders it', () => {
  const subjects = disabledRun.dark.subjects;
  assert.ok(subjects.length >= 5, `only ${subjects.length} disabled rules found in the sheet`);
  for (const theme of THEMES) {
    assert.ok(disabledRun[theme].found.length > 0, `${theme}: no disabled text measured at all`);
  }
});

test(`disabled: every label a disabled control shows clears ${DISABLED_MIN}:1, in both themes`, () => {
  const under = THEMES.flatMap((theme) => disabledRun[theme].found
    .filter((f) => f.labelled && f.ratio < DISABLED_MIN)
    .map((f) => `${theme} ${f.path} at opacity ${f.opacity} — ${f.ratio.toFixed(2)}:1`));
  assert.deepEqual(under, [], `disabled labels under the ${DISABLED_MIN}:1 floor #220 settled`);
});

test(`disabled: nothing has drifted below ${DISABLED_FLOOR}:1, the worst the kit measures today`, () => {
  for (const theme of THEMES) {
    const worse = disabledRun[theme].found
      .filter((f) => f.labelled && Math.round(f.ratio * 100) / 100 < DISABLED_FLOOR)
      .map((f) => `${f.path} at opacity ${f.opacity} — ${f.ratio.toFixed(2)}:1`);
    assert.deepEqual(worse, [], `${theme}: a token moved a disabled pair below the ratchet`);
  }
});

// Keep measured ratios in the test, not in reader-facing guideline history.
test('disabled: the opaque token pair retains its measured contrast in both themes', () => {
  const expected = { dark: '6.24', light: '6.11' };
  for (const theme of THEMES) {
    const vars = tokensFor(theme);
    const chain = (name) => {
      let value = vars.get(name);
      while (/^var\(\s*--[\w-]+\s*\)$/.test(value.trim())) {
        value = vars.get(value.trim().slice(4, -1).trim());
      }
      return parseColour(value);
    };
    assert.equal(ratio(chain('--disabled-ink'), chain('--disabled-surface')).toFixed(2), expected[theme]);
  }
});

// The second half of the rule, and the half that stops the first from being
// cleared the wrong way: a control could pass any legibility floor by simply
// looking enabled. It cannot pass this too. The comparison is the same element
// with the disabled state taken off it, so it costs no specimen and no list.
// The classification those two checks turn on, held so a rule cannot quietly change which
// of them measures it. A rule saying the state with the line around the box alone is asked
// about that box; anything painting ink, a fill or a fade is asked about its labels too. #518
test('disabled: a rule is classified by what it paints, not by what it selects', () => {
  const one = (body) => disabledRules(`.ui-x:disabled { ${body} }`)[0];
  assert.equal(one('border-color: var(--disabled-border);').edgeOnly, true);
  assert.equal(one('border: 1px solid var(--disabled-border);').edgeOnly, true);
  assert.equal(one('border-color: var(--disabled-border); color: var(--disabled-ink);').edgeOnly, false);
  assert.equal(one('background: var(--disabled-surface);').edgeOnly, false);
  assert.equal(one('opacity: 0.5;').edgeOnly, false);
  assert.equal(one('cursor: not-allowed;').edgeOnly, false);
  // And the kit's own edge-only rules, named rather than counted: the filter row's chip and
  // its add control, and the checkmark the kit draws out of two borders.
  const edges = disabledRules(sheet()).filter((r) => r.edgeOnly).map((r) => r.selector).sort();
  assert.deepEqual(edges, [
    ".ui-check input[type=\"checkbox\"]:disabled:checked::after",
    ".ui-filter-bar [data-filter-add] .ui-dropdown__trigger:disabled",
    ".ui-filter-bar [data-filter-add] .ui-dropdown__trigger[aria-disabled=\"true\"]",
    ".ui-filter-bar [data-filter-add] .ui-dropdown__trigger[aria-disabled=\"true\"]:hover:not(:focus-visible)",
    ".ui-filter-bar:disabled .ui-filter-bar__chip",
    ".ui-filter-bar__chip:disabled",
  ].sort(), 'the kit\'s edge-only disabled rules moved — each one is measured on its own box alone');
});

test('disabled: the state repaints — off never looks the same as on', () => {
  const same = THEMES.flatMap((theme) => disabledRun[theme].found
    .filter((f) => !f.repaints)
    .map((f) => `${theme} ${f.path} — ${f.selector} paints exactly what the enabled control paints`));
  assert.deepEqual(same, [], 'a disabled control that is indistinguishable from an enabled one');
});

// The mechanism, held rather than argued. `opacity` under a disabled selector
// drags a label and its box toward the ground together, and the pair a reader
// is left with is wherever the composite lands — 1.48:1, for the primary button
// #220 was opened about. The rule the kit settled on is that a control with a
// LABEL under it takes a paint, not a fade. The switch track is what is left:
// it fades, and there is nothing written inside it to fade.
test('disabled: a rule that fades with opacity has no label under it', () => {
  const faded = THEMES.flatMap((theme) => disabledRun[theme].found
    .filter((f) => f.opacity < 1 && f.labelled)
    .map((f) => `${theme} ${f.path} — ${f.selector} at opacity ${f.opacity}`));
  assert.deepEqual(faded, [], 'a disabled label faded by opacity instead of painted');
});

// ---- the collection -------------------------------------------------------
//
// The page names every gate and what it admits. This holds the two in step the
// way overview.test.js holds ENTRIES in step with the pages beside it: the list
// is discovered from disk, and a gate the page has never heard of fails the
// build (the discovery rule).

test('the Accessibility minimums page names every accessibility gate in the tree, and no gate it does not', () => {
  const files = [
    ...readdirSync(path.join(root, 'stories'), { recursive: true }).map((f) => `stories/${f}`),
    ...readdirSync(path.join(root, 'react/src'), { recursive: true }).map((f) => `react/src/${f}`),
  ].map((f) => String(f).split(path.sep).join('/'));
  // An accessibility gate is one that says so in its own text — the same
  // discovery the page's claim rests on, and not a list anybody maintains.
  // An import path is not the file saying so: stories/guidelines/letter-case.test.js
  // is a gate on letter case, even though it borrows the contrast DOM helpers.
  // Strip whole imports, including multiline braces, before reading the claims.
  // Coverage limits count too: drawer-rules names contrast as a blind spot.
  const ownText = (f) => readFileSync(path.join(root, f), 'utf8')
    .replace(/^\s*import\s[\s\S]*?(?:from\s+['"][^'"]*['"]|['"][^'"]*['"])\s*;?/gm, '');
  const gates = files.filter((f) => /\.test\.(js|tsx)$/.test(f) && !f.includes('/lib/'))
    .filter((f) => /axe|contrast|WCAG|focus|keyboard|accessib/i.test(ownText(f)))
    .sort();
  const named = GATES.map((g) => g.file).sort();
  assert.deepEqual(named, gates, 'the page and the tree disagree about which gates exist');
});

test('every gate the page names states a blind spot, and states what it checks', () => {
  for (const g of GATES) {
    assert.ok(g.does && g.does.length > 30, `${g.file} is on the page with nothing said about it`);
    assert.ok(g.blind.length, `${g.file} claims no blind spot — no gate here has none`);
    for (const b of g.blind) assert.ok(b.length > 20, `${g.file} has a blind spot stated too thinly to use`);
  }
});

export { targetRun, ringRun, disabledRun };
