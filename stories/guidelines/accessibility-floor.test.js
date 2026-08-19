// The three numbers the accessibility floor stands on, each measured.
//
// The floor page (stories/guidelines/_accessibility-floor.js) states a minimum target
// size, a contrast for `--ring` and a legibility floor for a disabled control, none of
// which existed in this tree before #201. This file measures all three against what the
// kit ships, under the measured-pin and discovery rules in CONTRIBUTING.md.
//
// Every subject is discovered: controls from the rendered stories, interactive BY ROLE;
// the ring's landings and the disabled rules read off the stylesheet declarations rather
// than assumed (#157, #220); and a control's OVERLAYS probed onto their host, because
// WCAG 2.5.8 measures the target and not the ink (#219).
//
// why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
// why: CONTRIBUTING.md#an-unresolved-var-measures-nothing-and-reports-green

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
  GATES, RULES,
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
    for (const s of sel.split(',')) {
      const selector = s.trim();
      if (!DISABLED_SEL.test(selector)) continue;
      const opacity = m ? Number(m[1]) : 1;
      const prev = out.get(selector);
      if (!prev || opacity < prev.opacity) out.set(selector, { selector, opacity });
    }
  }
  return [...out.values()];
}

/**
 * Turn a rendered control back on, and hand back the undo. The state is not
 * always on the element the rule selects — `.ui-dropdown__item.is-disabled
 * .ui-dropdown__label` paints a label whose ancestor carries the class — so the
 * nearest element actually holding a spelling is the one turned off.
 */
function enable(el) {
  const host = el.closest(DISABLED_STATE);
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

// A control's target is not its ink. 2.5.8 measures what a pointer can land on,
// and a pointer landing on a control's ::before or ::after hits the CONTROL —
// the pseudo is a box the element generates, not a child that could take the
// event away. So an overlay inset past the drawn box is a real 24px target with
// the drawn control left at whatever size the design gave it, and this gate has
// to see it or a hit-area fix would fail every test and pass none.
//
// The two pseudos are probed under SEPARATE names on purpose: .ui-check input
// carries a tick on ::after and its hit area on ::before, and one namespace
// would have let the 10px tick overwrite the 24px target.
const PSEUDOS = ['before', 'after'];
const PSEUDO_GEOMETRY = [
  'content', 'position', 'pointer-events',
  'width', 'height', 'inset', 'top', 'right', 'bottom', 'left',
];

/**
 * Copy every geometry declaration into a probe custom property beside itself, and every
 * `sel::before { … }` rule onto `sel` under `--tsz-before-*`. Why that reads the cascade
 * JSDOM will not resolve, and the one specificity approximation it makes, are in
 * CONTRIBUTING.md, "An unresolved var() measures nothing and reports green".
 */
function probeGeometry(css) {
  const reset = `*{${[
    ...GEOMETRY.map((p) => `--tsz-${p}:${NONE}`),
    // A custom property inherits, so without this a control would read its
    // ANCESTOR's pseudo geometry: .ui-toast--soft::before is a 3px marker, and
    // every button inside the toast would have reported carrying one.
    ...PSEUDOS.flatMap((ps) => PSEUDO_GEOMETRY.map((p) => `--tsz-${ps}-${p}:${NONE}`)),
  ].join(';')}}`;
  return reset + css.replace(RULE, (whole, sel, body) => {
    if (sel.trimStart().startsWith('@')) return whole;
    const extra = [];
    const bases = { before: [], after: [] };
    for (const part of sel.split(',')) {
      const m = /^(.*?)::?(before|after)$/.exec(part.trim());
      if (m && m[1]) bases[m[2]].push(m[1]);
    }
    const retarget = { before: [], after: [] };
    for (const decl of body.split(';')) {
      const i = decl.indexOf(':');
      if (i < 0) continue;
      const prop = decl.slice(0, i).trim().toLowerCase();
      const value = decl.slice(i + 1).replace(/!important/g, '').trim();
      if (GEOMETRY.includes(prop) || INHERITED.includes(prop)) extra.push(`--tsz-${prop}:${value}`);
      if (PSEUDO_GEOMETRY.includes(prop)) {
        for (const ps of PSEUDOS) if (bases[ps].length) retarget[ps].push(`--tsz-${ps}-${prop}:${value}`);
      }
    }
    const rule = extra.length ? `${sel}{${body};${extra.join(';')}}` : whole;
    return rule + PSEUDOS
      .filter((ps) => bases[ps].length && retarget[ps].length)
      .map((ps) => `${bases[ps].join(',')}{${retarget[ps].join(';')}}`)
      .join('');
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
 * The box one pseudo-element of a control generates, or null when it makes none.
 *
 * Out of flow only: an in-flow pseudo is content, and the drawn box already
 * counted it. `pointer-events: none` is a box no pointer can land on, so it is
 * not a target either — everything else the element generates is.
 *
 * Size comes from a declared width/height where there is one, and otherwise
 * from the two insets biting into the containing block, which for an absolutely
 * positioned pseudo is the control's PADDING box. That second form is how the
 * radio's dot is written (`inset: 4px` — an 8px dot in a 16px padding box), and
 * it is the form a hit area takes when it is written as a negative inset.
 */
function pseudoBox(cs, which, paddingBox) {
  const p = (name) => probe(cs, `${which}-${name}`);
  const content = p('content');
  if (!content || content === 'none') return null; // no content, no box
  if (!/^(absolute|fixed)$/.test(p('position'))) return null;
  if (p('pointer-events') === 'none') return null;
  const axis = (declared, near, far, block) => {
    const own = px(p(declared));
    if (own != null) return own;
    const edge = (w) => px(p(w)) ?? side(p('inset'), w);
    const [a, b] = [edge(near), edge(far)];
    return a == null || b == null || block == null ? null : block - a - b;
  };
  return {
    height: axis('height', 'top', 'bottom', paddingBox.height),
    width: axis('width', 'left', 'right', paddingBox.width),
  };
}

/**
 * The target size of one control, with `null` on an axis layout decides.
 *
 * The DRAWN box is padding + border + content, where content is the taller of
 * the resolved line-height and any glyph the control holds. Width is only
 * answered when the box declares it, or when the control's content is a glyph
 * and nothing else — a label's width is a line of text, and that is layout's.
 *
 * The TARGET is that box widened by any pseudo-element the control generates,
 * because a pointer landing on one of those hits the control. The two are
 * reported separately: `drawn` is what a reader sees, and height/width are what
 * a reader can hit, which is the pair 2.5.8 is about.
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

  const round = (n) => Math.round(n * 100) / 100;
  const drawn = { height: round(height), width: width == null ? null : round(width) };

  // What a pointer can land on. The containing block of an absolutely
  // positioned pseudo is this control's padding box, which is the border box
  // less its borders — the 1.5px the checkbox draws is the difference between a
  // 24px overlay and a 21px one, and no comment would have caught that.
  const paddingBox = {
    height: drawn.height - border('top') - border('bottom'),
    width: drawn.width == null ? null : drawn.width - border('left') - border('right'),
  };
  let hitH = drawn.height;
  let hitW = drawn.width;
  const unreadable = [];
  for (const which of PSEUDOS) {
    const box = pseudoBox(cs, which, paddingBox);
    if (!box) continue;
    if (box.height == null && box.width == null) { unreadable.push(`::${which}`); continue; }
    if (box.height != null) hitH = Math.max(hitH, box.height);
    // A pseudo can only WIDEN a width already known. It cannot supply one: the
    // target is at least the drawn box, and where that is layout's answer the
    // union of the two is layout's answer as well. Introducing it read the
    // 3px active marker on .ui-nav__item as a 3px-wide nav item.
    if (box.width != null && hitW != null) hitW = Math.max(hitW, box.width);
  }

  return { height: round(hitH), width: hitW == null ? null : round(hitW), drawn, unreadable };
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
  assert.ok(rule, 'the target-size rule is gone from the floor page');
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
    // `.ui-focusable` is the kit's opt-in focus class
    // (src/styles/base.css:117 `.ui-focusable:focus-visible,`).
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
// re-measured (the measured-pin rule).
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
            return { ratio: ratio(fg, bg), paint: `${fg.join()}|${bg.join()}` };
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
          const off = [dimmed, ...texts].map((el) => pairOf(el, ground, opacity));
          let restore;
          styles.mutate(() => { restore = enable(hit); });
          const onGround = effectiveBackground(dimmed.parentElement || dimmed, win, styles.of);
          const on = [dimmed, ...texts].map((el) => (
            onGround === 'IMAGE' ? null : pairOf(el, onGround, 1)));
          styles.mutate(() => restore());
          [dimmed, ...texts].forEach((el, i) => {
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

// The second half of the rule, and the half that stops the first from being
// cleared the wrong way: a control could pass any legibility floor by simply
// looking enabled. It cannot pass this too. The comparison is the same element
// with the disabled state taken off it, so it costs no specimen and no list.
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
