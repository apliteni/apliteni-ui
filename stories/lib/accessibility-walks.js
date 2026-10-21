// The walks behind the Accessibility minimums gate (stories/guidelines/accessibility-floor.test.js).
//
// Each walk mounts every story into JSDOM and measures it, and each is independent of the
// others, so the gate deals them to worker threads (stories/lib/job-pool.js) rather than
// running eleven of them one after another. A walk returns plain data; the assertions on that
// data stay in the gate. why: AGENTS.md#verification
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { focusBand } from '../../scripts/lib/box-shadow.js';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';
import {
  STYLE_FILES, kitCssFor, substitute, desugar, parseColour, composite, ratio,
  effectiveBackground, makeStyleCache, storyFiles,
  selectorPath, tokensFor,
} from './contrast.js';
import {
  RULE, decomment, probeGeometry, probe, px, boxOf, glyphOf, windowFor,
} from './target-geometry.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const THEMES = ['dark', 'light'];
export const sheet = () => decomment(STYLE_FILES.map((f) => readFileSync(path.join(root, f), 'utf8')).join('\n'));
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
export function disabledRules(css) {
  const out = new Map();
  for (const [sel, body] of rules(css)) {
    if (!DISABLED_SEL.test(sel)) continue;
    const m = body.match(/(?:^|;)\s*opacity\s*:\s*([\d.]+)/);
    for (const selector of splitSelectorList(sel)) {
      // A negative disabled condition selects a live control, so it cannot
      // prove that a disabled control repaints when enabled.
      if (!DISABLED_SEL.test(selector.replace(/:not\(\.(?:is-disabled)\)/g, ''))) continue;
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
export const TOUCH_MIN = 44;

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

/** The target-size, folded-rail and phone-strip measurements, in one walk. */
export async function targetRun() {
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
      // Below 720px the rail's rows are the drawer's, so the drawer is held open and the
      // rows, the account trigger, the menu control and the band's mark are the targets.
      for (const d of narrowWin.document.body.querySelectorAll('.ui-app__drawer .ui-drawer')) d.classList.add('is-open');
      const targets = '.ui-app__drawer .ui-nav__item, .ui-app__drawer .ui-app__user-trigger, '
        + '.ui-btn.ui-app__menu, .ui-app__brand--band';
      for (const el of narrowWin.document.body.querySelectorAll(targets)) {
        const cs = narrowWin.getComputedStyle(el);
        if (cs.opacity === '0' || probe(cs, 'position') === 'absolute') continue;
        if (!onScreenIn(el, narrowWin)) continue;
        strip.push({
          where,
          part: el.matches('.ui-app__menu') ? 'menu' : el.matches('.ui-app__brand--band') ? 'mark' : 'row',
          name: el.getAttribute('aria-label') || (el.textContent || '').trim(),
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
}

// ---- 2. the ring's contrast ------------------------------------------------

// Every accent the kit ships, discovered from the file that declares them —
// #218 found --ring written out eight times, and the two this gate measured
// were the two that were least wrong. The sub-themes re-point --accent, --ring
// is var(--accent), so each cell paints a different ring on the same surfaces.
// A new data-accent block is in the gate the moment it is written.
export const ACCENTS = ['default', ...new Set(
  [...readFileSync(path.join(root, 'src/tokens/accents.css'), 'utf8')
    .matchAll(/\[data-accent="([\w-]+)"\]/g)].map((m) => m[1]),
)];
export const CELLS = THEMES.flatMap((theme) => ACCENTS.map((accent) => ({ theme, accent })));

/** One theme x accent cell of the ring walk. */
export async function ringCell(theme, accent) {
  const selectors = ringSelectors(sheet());
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
  return {
    theme, accent, ring: ringValue.trim(), stories, landings: [...landings.values()], selectors,
  };
}

/** The disabled walk for one theme. */
export async function disabledCell(theme) {
  const subjects = disabledRules(sheet());
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
  return { subjects, found: [...found.values()] };
}
