// The three numbers the accessibility floor stands on, each measured.
//
// The floor page (stories/guidelines/_accessibility-floor.js) states three
// numbers that existed nowhere in this tree before #201: a minimum target size,
// a contrast for `--ring`, and a legibility floor for a disabled control. A
// number a comment argues for is pinned by a measured test (ADR 0002), so this
// file measures all three against what the kit actually ships, and every list it
// works from is discovered rather than typed (ADR 0004).
//
// WHAT IS DISCOVERED, AND FROM WHERE:
//
//  - the controls, from the rendered stories. Every story in stories/ is
//    mounted and every element that is interactive BY ROLE — a button, a link
//    with an href, a form control, an explicit widget role — is a subject. A
//    new component is in the gate the moment a story renders it.
//  - the ring's landings, from the stylesheets. Every rule whose body consumes
//    `var(--ring)` is a landing, and the GROUND each one lands on is taken from
//    the story that renders it, composited down the ancestor chain. #157's
//    hand-written six-ground table missed the pair that decided the answer;
//    this one is not written by hand.
//  - the disabled rules, from the stylesheets. Every rule that dims a control
//    with `opacity` under a disabled selector is a subject, and its opacity is
//    read off the declaration rather than assumed.
//
// HOW GEOMETRY IS RESOLVED WITHOUT LAYOUT. JSDOM has no layout, so `offsetWidth`
// is 0 and `getComputedStyle().padding` is empty wherever the value is a var().
// It does two things correctly: it cascades custom properties per element, and
// it inherits them. So the sheet is mounted UNSUBSTITUTED — no token map, no
// global flattening — and every geometry declaration is copied into a probe
// custom property beside itself (`padding: var(--btn-pad-y) …` also emits
// `--tsz-padding: var(--btn-pad-y) …`). Reading the probe back gives the
// declaration that won the cascade FOR THAT ELEMENT, and the vars inside it are
// resolved one at a time from the same element. That is why `.ui-btn--sm` reads
// its own 6px here and not the base 9px: the cascade is JSDOM's, not ours.
//
// WHAT THIS GATE WILL NOT CATCH:
//
//  - Width, for anything a line of text sizes. A text control's width is
//    layout's answer and JSDOM has none, so width is reported UNMEASURABLE
//    rather than passed. It is measured only where the box declares it or where
//    the control's whole content is a sized glyph.
//  - Spacing exceptions. WCAG 2.5.8 lets an undersized target pass if a 24px
//    circle centred on it overlaps no other target's circle. That is a layout
//    question end to end, so the floor here is the stricter reading: the target
//    itself is 24x24 or it is named.
//  - Anything with no story, and anything a script paints at runtime — the same
//    two holes stories/contrast.test.js names, for the same reasons.
//  - The ring's INNER edge. A ring is painted outside the border box, so its two
//    adjacent colours are the ground outside and the control's own border
//    inside. Only the outer pair is measured, because it is also the pair the
//    ring is composited ONTO and so is structurally the worse of the two.
//  - The React workspace. react/src has its own ring, its own controls and its
//    own gates; nothing here reaches them.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  STYLE_FILES, kitCssFor, substitute, desugar, parseColour, composite, ratio,
  effectiveBackground, makeStyleCache, installDomGlobals, storyFiles,
  selectorPath,
} from '../lib/contrast.js';
import {
  TARGET_MIN, RING_MIN, RING_FLOOR, DISABLED_MIN, DISABLED_FLOOR, TARGET_EXEMPT,
  DISABLED_LEDGER, GATES, RULES,
} from './_accessibility-floor.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const THEMES = ['dark', 'light'];
const RULE = /([^{}]+)\{([^{}]*)\}/g;
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
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

/** Selectors that paint the focus ring, taken from the sheet that paints it. */
function ringSelectors(css) {
  const out = [];
  for (const [sel, body] of rules(css)) {
    if (!body.includes('var(--ring)')) continue;
    for (const s of sel.split(',')) out.push(s.trim());
  }
  return [...new Set(out)];
}

/** Rules that dim a control because it is disabled, with the alpha they use. */
function disabledRules(css) {
  const out = [];
  for (const [sel, body] of rules(css)) {
    if (!/:disabled|\.is-disabled|\[aria-disabled/.test(sel)) continue;
    const m = body.match(/(?:^|;)\s*opacity\s*:\s*([\d.]+)/);
    if (!m) continue;
    for (const s of sel.split(',')) out.push({ selector: s.trim(), opacity: Number(m[1]) });
  }
  return out;
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

// ---- geometry -------------------------------------------------------------

// The box properties, split by whether CSS inherits them. A custom property
// ALWAYS inherits, so a probe for a non-inherited property would leak an
// ancestor's value down onto a control that declares none — a button inside a
// card would report the card's height. Every one of these is therefore reset to
// a sentinel at `*`, which has no specificity and so loses to every real rule.
// The two CSS does inherit are left to inherit, because there the leak is the
// right answer.
const GEOMETRY = [
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'height', 'width', 'min-height', 'min-width', 'border', 'border-width', 'border-style',
  'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width',
  'box-sizing', 'position',
];
const INHERITED = ['font-size', 'line-height'];
const NONE = '·none·';

/**
 * Copy every geometry declaration into a probe custom property beside itself.
 *
 * JSDOM will not substitute a var() into `padding`, but it cascades and
 * inherits custom properties correctly, so `--tsz-padding` comes back holding
 * the declaration that won for this element — vars and all — and those are
 * resolved per element afterwards. Nothing is rewritten or removed; the copy is
 * appended to the same block, so the sheet still says what it said.
 */
function probeGeometry(css) {
  const reset = `*{${GEOMETRY.map((p) => `--tsz-${p}:${NONE}`).join(';')}}`;
  return reset + css.replace(RULE, (whole, sel, body) => {
    if (sel.trimStart().startsWith('@')) return whole;
    const extra = [];
    for (const decl of body.split(';')) {
      const i = decl.indexOf(':');
      if (i < 0) continue;
      const prop = decl.slice(0, i).trim().toLowerCase();
      if (!GEOMETRY.includes(prop) && !INHERITED.includes(prop)) continue;
      extra.push(`--tsz-${prop}:${decl.slice(i + 1).replace(/!important/g, '').trim()}`);
    }
    return extra.length ? `${sel}{${body};${extra.join(';')}}` : whole;
  });
}

/** Resolve one probe property for one element, chasing var() through itself. */
function probe(cs, name) {
  let v = cs.getPropertyValue(`--tsz-${name}`);
  if (v === NONE) return '';
  for (let pass = 0; pass < 8 && v && v.includes('var('); pass++) {
    const next = v.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (m, ref, fallback) => {
      const got = cs.getPropertyValue(ref);
      return got || (fallback != null ? fallback.trim() : m);
    });
    if (next === v) break;
    v = next;
  }
  return (v || '').trim();
}

/** A single CSS length in px, or null when it is anything else. */
const px = (v) => {
  const m = /^(-?[\d.]+)px$/.exec((v || '').trim());
  return m ? Number(m[1]) : null;
};

/** The nth value of a shorthand, expanded the way CSS expands padding. */
function side(v, which) {
  const parts = (v || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const [t, r = t, b = t, l = r] = parts;
  return px({ top: t, right: r, bottom: b, left: l }[which]);
}

/**
 * The border-box size of one control, with `null` on an axis layout decides.
 *
 * Height is padding + border + content, where content is the taller of the
 * resolved line-height and any glyph the control holds. Width is only answered
 * when the box declares it, or when the control's content is a glyph and
 * nothing else — a label's width is a line of text, and that is layout's.
 */
function boxOf(el, cs, glyph) {
  const pad = (which) => {
    const long = px(probe(cs, `padding-${which}`));
    return long != null ? long : (side(probe(cs, 'padding'), which) ?? 0);
  };
  const border = (which) => {
    const long = px(probe(cs, `border-${which}-width`));
    if (long != null) return long;
    const short = side(probe(cs, 'border-width'), which);
    if (short != null) return short;
    // `border: 1px solid var(--border)` — the width is the one length in it,
    // and `border: none` is a width of nothing.
    const shorthand = probe(cs, 'border');
    if (/(^|\s)none(\s|$)/.test(shorthand)) return 0;
    const one = /(-?[\d.]+)px/.exec(shorthand);
    return one ? Number(one[1]) : 0;
  };
  // font-size and line-height are inherited by CSS itself, so the computed
  // value is right whenever JSDOM could resolve it, and the probe is the
  // fallback for the var() it could not.
  const fontSize = px(cs.fontSize) ?? px(probe(cs, 'font-size')) ?? 16;
  const lhRaw = px(cs.lineHeight) != null ? cs.lineHeight : probe(cs, 'line-height');
  const lh = px(lhRaw) ?? (Number(lhRaw) ? Number(lhRaw) * fontSize : null);

  const declaredH = px(probe(cs, 'height'));
  const declaredW = px(probe(cs, 'width'));
  const minH = px(probe(cs, 'min-height'));
  const minW = px(probe(cs, 'min-width'));

  // Any text ANYWHERE inside, not just a direct child: the kit wraps a button's
  // label in a span often enough that asking for a direct text node reported
  // every wrapped label as a control with no content at all.
  const hasText = el.textContent.trim() !== '';
  const contentH = Math.max(glyph.h ?? 0, hasText ? (lh ?? fontSize) : 0);
  const chrome = (which) => pad(which) + border(which);

  const height = declaredH != null
    ? declaredH + (probe(cs, 'box-sizing') === 'content-box' ? chrome('top') + chrome('bottom') : 0)
    : Math.max(minH ?? 0, contentH + chrome('top') + chrome('bottom'));

  let width = declaredW;
  if (width == null && !hasText && glyph.w != null) width = glyph.w + chrome('left') + chrome('right');
  if (width != null && minW != null) width = Math.max(width, minW);

  return { height: Math.round(height * 100) / 100, width: width == null ? null : Math.round(width * 100) / 100 };
}

/** The largest glyph a control holds, in px, or nulls when it holds none. */
function glyphOf(el, win) {
  let h = null; let w = null;
  for (const svg of el.querySelectorAll('svg')) {
    const cs = win.getComputedStyle(svg);
    const gh = px(cs.height) ?? px(svg.getAttribute('height'));
    const gw = px(cs.width) ?? px(svg.getAttribute('width'));
    if (gh != null) h = Math.max(h ?? 0, gh);
    if (gw != null) w = Math.max(w ?? 0, gw);
  }
  return { h, w };
}

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
      visit(`${rel}:${name}`);
    }
  }
  return { stories, problems };
}

function windowFor(theme, css) {
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head><body></body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  installDomGlobals(dom.window);
  return dom.window;
}

// ---- 1. the minimum target size -------------------------------------------

const targetRun = await (async () => {
  const win = windowFor('dark', probeGeometry(sheet()));
  const controls = new Map();
  const { stories, problems } = await walk(win, null, null, (where) => {
    for (const el of win.document.body.querySelectorAll(INTERACTIVE)) {
      const cs = win.getComputedStyle(el);
      // A control the page hides from the pointer is not a target. The kit's
      // switch and checkbox inputs are 0x0 under their own painted track, and
      // the track is the target; the input is not.
      if (cs.opacity === '0' || probe(cs, 'position') === 'absolute') continue;
      const key = `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`;
      if (controls.has(key)) continue;
      const box = boxOf(el, cs, glyphOf(el, win));
      controls.set(key, { key, ...box, where, path: selectorPath(el) });
    }
  });
  return { stories, problems, controls: [...controls.values()] };
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

test('target size: the sm size the kit ships is measured, and is on the record', () => {
  const sm = targetRun.controls.filter((c) => /ui-btn--sm/.test(c.key));
  assert.ok(sm.length >= 2, 'no sm button rendered — the size stopped being measured');
  for (const c of sm) {
    assert.ok(c.height >= TARGET_MIN, `${c.key} is ${c.height}px high, under ${TARGET_MIN}px`);
  }
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
    const ring = parseColour((/rgba?\([^)]*\)|#[0-9a-f]{3,8}/i.exec(ringValue) || [])[0]);
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
    // `.ui-focusable` is the kit's opt-in focus class (src/styles/base.css:130).
    // No component wears it and no story renders one, so it has no ground to be
    // measured against — which is a fact about the class, not a hole here. It
    // is named rather than filtered so it cannot quietly become two.
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
// re-measured (ADR 0002).
test(`ring: nothing has drifted below ${RING_FLOOR}:1, the worst the kit measures today`, () => {
  const worse = CELL_KEYS.flatMap((key) => ringRun[key].landings
    .filter((l) => l.ratio != null && Math.round(l.ratio * 100) / 100 < RING_FLOOR)
    .map((l) => `${key}: ${l.selector} on ${l.ground} — ${l.ratio.toFixed(2)}:1`));
  assert.deepEqual(worse, [], 'a token moved a ring landing below the worst #218 measured');
});

// #218 retired the ledger this gate used to carry. The ring clears the bar in
// all eight cells now, so there is no gap to hold open — and the floor page
// must not still badge one.
test('ring: the floor page claims no gap, because there is none', () => {
  const ring = RULES.find((r) => r.id === 'ring-contrast');
  assert.ok(ring, 'the ring-contrast rule is gone from the floor page');
  assert.equal(ring.unmet, undefined, 'the ring clears the bar — retire the ledger rather than leaving it');
});

// Every ring in the kit is the same one declaration. A second --ring anywhere
// is a copy that will drift, which is exactly what #218 found eight of.
test('ring: --ring is declared once, and it is the accent', () => {
  // Every stylesheet under src/, found rather than listed — a ninth --ring in a
  // file nobody thought to name is the failure this is here to catch.
  const declared = readdirSync(path.join(root, 'src'), { recursive: true })
    .map((f) => String(f).split(path.sep).join('/'))
    .filter((f) => f.endsWith('.css'))
    .sort()
    .flatMap((f) => [...decomment(readFileSync(path.join(root, 'src', f), 'utf8'))
      .matchAll(/(?:^|[;{])\s*--ring\s*:([^;}]*)/g)].map((m) => `src/${f}: ${m[1].trim()}`));
  assert.deepEqual(declared, ['src/tokens/tokens.css: 0 0 0 3px var(--accent)']);
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
      for (const { selector, opacity } of subjects) {
        const base = selector.replace(/\s*\+\s*\.ui-switch__track/, '');
        const wantsSibling = selector.includes('+ .ui-switch__track');
        let hits;
        try { hits = win.document.body.querySelectorAll(base); } catch { continue; }
        for (const hit of hits) {
          const dimmed = wantsSibling ? hit.parentElement?.querySelector('.ui-switch__track') : hit;
          if (!dimmed) continue;
          // Everything inside the dimmed box is dimmed with it: `opacity` is a
          // group property, so the subtree's text and its own background fade
          // against the ground TOGETHER, and that composite is the pair a
          // reader actually sees.
          const ground = effectiveBackground(dimmed.parentElement || dimmed, win, styles.of);
          if (ground === 'IMAGE') continue;
          for (const el of [dimmed, ...dimmed.querySelectorAll('*')]) {
            const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            if (!hasText || el.tagName === 'STYLE' || el.tagName === 'SCRIPT') continue;
            const cs = styles.of(el);
            const ink = parseColour(cs.color);
            if (!ink) continue;
            const own = effectiveBackground(el, win, styles.of);
            if (own === 'IMAGE') continue;
            const fade = (c) => [c[0], c[1], c[2], (c[3] ?? 1) * opacity];
            const bg = composite(fade(own), ground);
            const fg = composite(fade([ink[0], ink[1], ink[2], (ink[3] ?? 1)]), bg);
            const key = `${selector}|${selectorPath(el)}`;
            if (found.has(key)) continue;
            found.set(key, { selector, opacity, ratio: ratio(fg, bg), path: selectorPath(el) });
          }
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

test(`disabled: ${DISABLED_MIN}:1 is PROPOSED, and the kit does not meet it — the ledger says so`, () => {
  const under = THEMES.flatMap((theme) => disabledRun[theme].found
    .filter((f) => f.ratio < DISABLED_MIN)
    .map((f) => `${theme} ${f.path} at opacity ${f.opacity} — ${f.ratio.toFixed(2)}:1`));
  assert.ok(
    DISABLED_LEDGER.issue,
    `${under.length} disabled labels under the proposed ${DISABLED_MIN}:1 and no ledger entry:\n  ${under.join('\n  ')}`,
  );
  assert.ok(under.length, 'the kit now meets the proposal — settle the number and retire the ledger');
});

test(`disabled: nothing has drifted below ${DISABLED_FLOOR}:1, the worst measured when the number was written`, () => {
  for (const theme of THEMES) {
    const worse = disabledRun[theme].found
      .filter((f) => Math.round(f.ratio * 100) / 100 < DISABLED_FLOOR)
      .map((f) => `${f.path} at opacity ${f.opacity} — ${f.ratio.toFixed(2)}:1`);
    assert.deepEqual(worse, [], `${theme}: a token moved a disabled pair below where #201 measured it`);
  }
});

test('disabled: the ledger states the range it is holding open, and it is still true', () => {
  const all = THEMES.flatMap((t) => disabledRun[t].found.map((f) => f.ratio));
  const round = (n) => Math.round(n * 100) / 100;
  assert.equal(round(Math.min(...all)), DISABLED_LEDGER.measured.worst, 'the ledger\'s worst has moved');
  assert.equal(round(Math.max(...all)), DISABLED_LEDGER.measured.best, 'the ledger\'s best has moved');
});

// ---- the collection -------------------------------------------------------
//
// The page names every gate and what it admits. This holds the two in step the
// way overview.test.js holds ENTRIES in step with the pages beside it: the list
// is discovered from disk, and a gate the page has never heard of fails the
// build (ADR 0004).

test('the floor page names every accessibility gate in the tree, and no gate it does not', () => {
  const files = [
    ...readdirSync(path.join(root, 'stories'), { recursive: true }).map((f) => `stories/${f}`),
    ...readdirSync(path.join(root, 'react/src'), { recursive: true }).map((f) => `react/src/${f}`),
  ].map((f) => String(f).split(path.sep).join('/'));
  // An accessibility gate is one that says so in its own text — the same
  // discovery the page's claim rests on, and not a list anybody maintains.
  const gates = files.filter((f) => /\.test\.(js|tsx)$/.test(f) && !f.includes('/lib/'))
    .filter((f) => /axe|contrast|WCAG|focus|keyboard|accessib/i.test(readFileSync(path.join(root, f), 'utf8')))
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
