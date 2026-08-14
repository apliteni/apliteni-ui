/* Rule: every stroked glyph the kit renders paints at 1.5 CSS px or wider.
 *
 * The stroke-width rule set 3:1 as the right bar for a graphic, and made a stroke
 * to be wide enough to be one, then scoped itself to the two glyph families that
 * carry a status. #217 is the rest of the kit: ten of thirteen glyphs measured
 * from src/styles were under the line and nothing held any of them.
 *
 * WHY THIS GATE RENDERS RATHER THAN READS. A stylesheet scan gets two shapes
 * wrong, and both of them are in the kit:
 *
 *   A box override with no stroke beside it. `.ui-nav--side.is-collapsed
 *   .ui-nav__ic svg` re-sizes the rail's icon and lets the stroke come from
 *   `.ui-nav__ic svg`. Reading one declaration at a time reports that rule as
 *   having no stroke at all, when what it actually does is change the width the
 *   inherited one renders at.
 *
 *   A stroke that comes from the markup. src/assets/icons.js puts stroke-width
 *   on every icon it emits, feedback.js emits its own svgs with a different one,
 *   and `sun` and `moon` hard-code a third. So a rule that sets only a box still
 *   produces a stroked glyph, and its width is decided in a file no stylesheet
 *   scan opens.
 *
 * So the subjects here are elements, not declarations: every story in stories/
 * is rendered into a JSDOM carrying the kit's stylesheets, and every <svg> that
 * comes out is measured with the cascade already resolved. That is also the
 * discovery this repo asks of a gate — a glyph joins by being rendered, not by
 * being listed. The prose list that rule shipped with is the counter-example: it named
 * six of these and missed four.
 *
 * WHAT IS NOT A SUBJECT. An svg whose effective `stroke` is `none` — SVG's own
 * initial value — paints no stroke, so it has no width to hold: the brand marks,
 * the provider logos and the footer's social icons are filled shapes and drop
 * out here by their own paint rather than by name.
 *
 * why: docs/specification.md#icons-and-glyphs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  foldLogicalDims, isSvgSubject, kitSheetNames, kitStyleHtml, rulesOf, selectorParts, svgClassSet,
} from '../scripts/lib/icon-cascade.js';
import { SOLID_STROKE, VIEWBOX, needsWidth, renderedPx } from './lib/glyph-stroke.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = path.join(root, 'src');

const SHEETS = kitSheetNames(src);
const SVG_CLASSES = svgClassSet([src]);

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});
const dom = new JSDOM(
  `<!doctype html><html lang="en"><head>${kitStyleHtml(src, SHEETS)}</head><body></body></html>`,
  { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: quiet },
);
const { document, getComputedStyle } = dom.window;
SHEETS.forEach((name, i) => foldLogicalDims(document.styleSheets[i], name));

// Stories that build their markup with document.createElement need a DOM to
// build in — the same shim stories/a11y.test.js hands them, for the same reason.
for (const key of [
  'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'matchMedia', 'getSelection',
  'Node', 'Element', 'HTMLElement', 'SVGElement', 'DocumentFragment', 'Event', 'CustomEvent',
  'MutationObserver', 'DOMParser', 'NodeFilter',
]) {
  let value;
  try { value = dom.window[key]; } catch { continue; }
  if (value === undefined) continue;
  const bound = typeof value === 'function' && /^[a-z]/.test(key) ? value.bind(dom.window) : value;
  Object.defineProperty(globalThis, key, { value: bound, configurable: true, writable: true });
}

test('the icon factory still draws in the box these widths are read against', () => {
  const factory = /export const icon =[\s\S]*?viewBox="0 0 (\d+) (\d+)"/
    .exec(readFileSync(path.join(src, 'assets/icons.js'), 'utf8'));
  assert.ok(factory, 'src/assets/icons.js no longer emits a viewBox this gate can read');
  assert.deepEqual([Number(factory[1]), Number(factory[2])], [VIEWBOX, VIEWBOX],
    `the icon factory draws in a ${factory[1]}x${factory[2]} box, not ${VIEWBOX}x${VIEWBOX}. Every `
    + 'width below is stroke-width x box / viewBox, so a different box changes what the reader sees '
    + 'without changing a stylesheet.');
});

/* ---- the cascade, resolved per element ---------------------------------- */

/** Every author rule in the document that this element matches and that
 *  declares `prop`, in document order. jsdom computes stroke-width through the
 *  cascade correctly but reports the SVG initial value — 1px — when nothing
 *  declared it, which is indistinguishable from a rule that asked for 1. This is
 *  how the gate tells "no rule spoke" from "a rule said one". */
function declaring(el, prop) {
  const found = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      if (!rule.selectorText || !rule.style?.getPropertyValue(prop)) continue;
      for (const sel of selectorParts(rule.selectorText)) {
        let hit = false;
        try { hit = el.matches(sel); } catch { hit = false; }
        if (hit) { found.push(rule.style.getPropertyValue(prop).trim()); break; }
      }
    }
  }
  return found;
}

/** The paint the glyph's stroke is drawn in, or 'none'. A presentation attribute
 *  loses to any author rule, and SVG's initial value is `none` — an svg nothing
 *  paints a stroke on has no stroke width to hold. */
function strokePaint(el) {
  const css = declaring(el, 'stroke');
  if (css.length) return css[css.length - 1];
  return el.getAttribute('stroke') ?? 'none';
}

/** The stroke-width the element actually draws with. CSS wins if any rule
 *  declares it — read back through getComputedStyle so the cascade decides
 *  between them — and the markup decides when none does. */
function strokeWidth(el) {
  if (declaring(el, 'stroke-width').length) {
    return { value: parseFloat(getComputedStyle(el).getPropertyValue('stroke-width')), from: 'a stylesheet' };
  }
  const attr = el.getAttribute('stroke-width');
  if (attr !== null) return { value: parseFloat(attr), from: 'the markup that emitted it' };
  return { value: 1, from: "SVG's initial value" };
}

/** The box the glyph is drawn at, in CSS px. `width: 100%` hands the box to the
 *  slot, so the slot is asked instead; a custom property is looked up where it
 *  is declared, which jsdom will not do for a length. Returns null with a reason
 *  when neither works, and the gate refuses rather than skipping. */
function boxOf(el) {
  const px = (v) => (/^-?[\d.]+px$/.test(v) ? parseFloat(v) : null);
  let node = el;
  let width = getComputedStyle(node).width;
  let fraction = 1;
  for (let hop = 0; hop < 12; hop += 1) {
    const varName = /^var\((--[\w-]+)\)$/.exec(width.trim())?.[1];
    if (varName) {
      let owner = node;
      let resolved = null;
      while (owner && resolved === null) {
        const own = getComputedStyle(owner).getPropertyValue(varName).trim();
        if (own) resolved = own;
        owner = owner.parentElement;
      }
      if (resolved === null) return { px: null, why: `${width} is declared nowhere above it` };
      width = resolved;
      continue;
    }
    const direct = px(width);
    if (direct !== null) return { px: direct * fraction, why: null };
    const pct = /^([\d.]+)%$/.exec(width.trim());
    if (!pct) return { px: null, why: `its width computes to ${width}` };
    fraction *= parseFloat(pct[1]) / 100;
    node = node.parentElement;
    if (!node) return { px: null, why: 'its width is a percentage of nothing' };
    width = getComputedStyle(node).width;
  }
  return { px: null, why: 'its width chases percentages further than this gate follows' };
}

/** How wide this glyph's stroke lands, and everything needed to say why. */
function measure(el) {
  const paint = strokePaint(el);
  if (paint === 'none') return null;
  const stroke = strokeWidth(el);
  const box = boxOf(el);
  const vb = (el.getAttribute('viewBox') || '').trim().split(/[\s,]+/);
  // No viewBox means no scaling: a user unit IS a CSS px, so the box is the units.
  const units = vb.length === 4 ? parseFloat(vb[2]) : box.px;
  return { paint, stroke, box, units, px: box.px === null || !units ? null : renderedPx(stroke.value, box.px, units) };
}

test('the measurement can fail, and fails where the stroke-width rule says it does', () => {
  /* The arithmetic, exercised on the two widths the stroke-width rule measured by hand: 1.8
   * at an 18px box was 1.35 CSS px and did not clear, 2.1 at the same box is
   * 1.575 and does. A gate whose comparison cannot go red is a gate that passes
   * because it checks nothing — see the mutation rule. */
  assert.ok(renderedPx(1.8, 18, VIEWBOX) < SOLID_STROKE, '1.8 at 18px should be under the line');
  assert.ok(renderedPx(2.1, 18, VIEWBOX) >= SOLID_STROKE, '2.1 at 18px should clear it');
  assert.equal(needsWidth(18, VIEWBOX), 2, 'an 18px box needs 2 to reach the line');
  assert.equal(needsWidth(13, VIEWBOX), 2.8, 'a 13px box needs 2.8');
});

/* ---- the corpus ---------------------------------------------------------- */

const serialize = (out) => {
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') {
    if (typeof out.outerHTML === 'string') return out.outerHTML;
    if (out.nodeType === 11) return [...out.childNodes].map((n) => n.outerHTML ?? n.textContent).join('');
    if (out.nodeType === 3) return out.textContent;
  }
  return null;
};

const storyFiles = readdirSync(path.join(root, 'stories'), { recursive: true })
  .map((p) => String(p)).filter((p) => p.endsWith('.stories.js')).sort();

/* Every rule in the kit that decides a glyph's box or its stroke. This gate
 * measures elements, so this is the other half of the question: is there a rule
 * whose glyph nothing renders? Such a rule ships to consumers with nothing
 * holding it, which is exactly the state #217 found the kit in. */
const kitRules = [];
for (const [i, name] of SHEETS.entries()) {
  for (const [rule] of rulesOf(document.styleSheets[i], name, SVG_CLASSES)) {
    for (const raw of selectorParts(rule.selectorText)) {
      const sel = raw.replace(/\s+/g, ' ');
      if (!isSvgSubject(sel, SVG_CLASSES)) continue;
      if (sel.includes(':where(')) continue; // the reset, which every bare icon takes
      if (!rule.style.getPropertyValue('width') && !rule.style.getPropertyValue('stroke-width')) continue;
      kitRules.push({ sel, sheet: name, seen: false });
    }
  }
}

test('the kit still writes rules that decide a glyph', () => {
  assert.ok(kitRules.length >= 20,
    `found ${kitRules.length} rules sizing or stroking an icon in src/styles — the sweep is broken, `
    + 'not the kit.');
});

const holder = document.body.appendChild(document.createElement('div'));
const thin = [];
const unmeasurable = [];
const tally = { stories: 0, glyphs: 0, stroked: 0 };
let worst = { px: Infinity, where: '(nothing measured)' };

const where = (el, story) => {
  const chain = [];
  for (let node = el; node && node !== holder; node = node.parentElement) {
    const cls = (node.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).join('.');
    chain.unshift(node.tagName.toLowerCase() + (cls ? `.${cls}` : ''));
  }
  return `${chain.slice(-3).join(' > ')}  [${story}]`;
};

for (const rel of storyFiles) {
  const mod = await import(path.join(root, 'stories', rel));
  const def = mod.default || {};
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || !story || typeof story !== 'object') continue;
    const render = story.render || def.render;
    if (typeof render !== 'function') continue;
    const args = { ...def.args, ...story.args };
    let html;
    try {
      html = serialize(render(args, { globals: { theme: 'dark', accent: 'default' }, args }));
    } catch (err) {
      // A story that will not render is a story whose glyphs are unmeasured.
      // stories/a11y.test.js makes the same refusal, for the same reason.
      unmeasurable.push(`${rel}:${name} — render threw: ${err && err.message}`);
      continue;
    }
    if (html == null) { unmeasurable.push(`${rel}:${name} — render returned neither a string nor a node`); continue; }
    tally.stories += 1;
    holder.innerHTML = html;
    for (const rule of kitRules) {
      if (rule.seen) continue;
      try { if (holder.querySelector(rule.sel)) rule.seen = true; } catch { /* unmountable here */ }
    }
    for (const el of holder.querySelectorAll('svg')) {
      tally.glyphs += 1;
      const m = measure(el);
      if (!m) continue;
      tally.stroked += 1;
      if (m.px === null) {
        unmeasurable.push(`${where(el, `${rel}:${name}`)} — ${m.box.why ?? 'it declares no viewBox'}`);
        continue;
      }
      if (m.px < worst.px) worst = { px: m.px, where: where(el, `${rel}:${name}`) };
      if (m.px >= SOLID_STROKE) continue;
      thin.push(
        `${m.px.toFixed(2)}px — ${where(el, `${rel}:${name}`)}\n`
        + `      stroke-width ${m.stroke.value} from ${m.stroke.from}, drawn at ${m.box.px}px `
        + `in a ${m.units}-unit box; ${needsWidth(m.box.px, m.units)} would clear the line`,
      );
    }
  }
}
holder.remove();

test('every story in stories/ renders a DOM this gate can measure', () => {
  assert.ok(tally.stories > 0, 'no stories rendered — the discovery above is broken');
  assert.deepEqual(unmeasurable, [],
    'a glyph reached this gate that it could not measure, so nothing holds its width:\n  '
    + `${unmeasurable.join('\n  ')}\n`
    + 'Give the glyph a box in px — a percentage of a slot with one counts — or a viewBox, or '
    + 'teach this gate the shape. A glyph it cannot measure is a glyph it cannot fail.');
});

test('the corpus this gate measures is the kit, not a corner of it', () => {
  assert.ok(tally.stroked > 40,
    `only ${tally.stroked} stroked glyphs in ${tally.stories} stories — a shrinking corpus looks `
    + 'exactly like a passing one, so this is the tripwire for the render loop silently emptying.');
});

test('no rule in the kit decides a glyph that nothing renders', () => {
  const dark = kitRules.filter((r) => !r.seen).map((r) => `${r.sheet}  ${r.sel}`);
  assert.deepEqual(dark, [],
    'these rules size or stroke an icon and no story renders one, so this gate never measures them '
    + 'and `files` in package.json ships them anyway:\n  '
    + `${dark.join('\n  ')}\n`
    + 'Render the component in a story, or take the rule out.');
});

test('every stroked glyph the kit renders clears the 1.5 CSS px line', () => {
  assert.deepEqual(thin, [],
    `${thin.length} glyph(s) paint a stroke narrower than ${SOLID_STROKE} CSS px, so what a reader `
    + 'sees is not the ratio a contrast gate computes — the stroke-width rule holds those to the 4.5:1 text bar, '
    + 'and nothing here measures colour:\n\n    '
    + `${thin.join('\n    ')}\n\n`
    + 'A stroke-width is stated in the glyph\'s own box, so widen the stroke or grow the box. Where '
    + 'a rule states a box and no stroke, the stroke it gets is whatever the markup emitted — state '
    + 'it in the rule that decides the box. See '
    + 'docs/specification.md#icons-and-glyphs.');
});

test('the widest thing this gate can say about the kit is still true', () => {
  /* A floor on the floor. Every glyph clears 1.5; this records where the
   * narrowest of them actually landed, so a change that walks a glyph down to
   * 1.50 has to say so rather than slip under a bar it technically clears.
   * Raise it when a glyph is deliberately widened; lower it in the commit that
   * decides to, and say why there. */
  assert.ok(worst.px >= 1.51,
    `the narrowest stroked glyph in the kit renders at ${worst.px.toFixed(3)} CSS px — ${worst.where}. `
    + 'That is above the stroke-width rule\'s line and below where this kit was left, which means something got '
    + 'thinner without anyone deciding it.');
});

dom.window.close();
