/* Rule: every stroked glyph the kit renders paints at 1.5 CSS px or wider (#217).
 *
 * The React half of stories/glyph-stroke.test.js, over the same measurement
 * (stories/lib/glyph-stroke.js and scripts/lib/icon-cascade.js): every React story is
 * mounted into a document carrying the kit's stylesheets, and every <svg> that comes out
 * is measured with the cascade resolved. #429 moves the subjects here from the vanilla
 * stories.
 *
 * NOT A SUBJECT: an svg whose effective `stroke` is `none`, SVG's own initial value.
 * Limits, read before trusting a green run: JSDOM lays nothing out, so a glyph's box is
 * read from the width the cascade gives it; a component's own sheet in react/src is on
 * the page, as it is in Storybook.
 * why: docs/foundations.md#icons-and-glyphs */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- shared, independently tested JS modules.
import { foldLogicalDims, isSvgSubject, kitSheetNames, kitStyleHtml, rulesOf, selectorParts, svgClassSet } from '../../scripts/lib/icon-cascade.js';
// @ts-expect-error -- shared, independently tested JS module.
import { SOLID_STROKE, VIEWBOX, needsWidth, renderedPx } from '../../stories/lib/glyph-stroke.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const src = path.join(root, 'src');

const SHEETS: string[] = kitSheetNames(src);
const SVG_CLASSES = svgClassSet([src, path.join(root, 'react/src')], ['.js', '.ts', '.tsx']);
const localSheets = Object.keys(import.meta.glob('./**/*.css')).sort();

document.head.innerHTML = kitStyleHtml(src, SHEETS)
  + localSheets.map((rel) => `<style data-sheet="react/src/${rel.slice(2)}">${readFileSync(new URL(rel, import.meta.url), 'utf8')}</style>`).join('\n');
[...document.styleSheets].forEach((sheet, i) => foldLogicalDims(sheet, i < SHEETS.length ? SHEETS[i] : localSheets[i - SHEETS.length]));

function declaring(el: Element, prop: string) {
  const found: string[] = [];
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules as unknown as CSSStyleRule[]) {
      if (!rule.selectorText || !rule.style?.getPropertyValue(prop)) continue;
      for (const sel of selectorParts(rule.selectorText) as string[]) {
        let hit = false;
        try { hit = el.matches(sel); } catch { hit = false; }
        if (hit) { found.push(rule.style.getPropertyValue(prop).trim()); break; }
      }
    }
  }
  return found;
}

/** The paint the glyph's stroke is drawn in, or 'none'. */
function strokePaint(el: Element) {
  const css = declaring(el, 'stroke');
  if (css.length) return css[css.length - 1];
  return el.getAttribute('stroke') ?? 'none';
}

/** The stroke-width the element draws with: CSS when any rule declares it, else the markup. */
function strokeWidth(el: Element) {
  if (declaring(el, 'stroke-width').length) {
    return { value: parseFloat(getComputedStyle(el).getPropertyValue('stroke-width')), from: 'a stylesheet' };
  }
  const attr = el.getAttribute('stroke-width');
  if (attr !== null) return { value: parseFloat(attr), from: 'the markup that emitted it' };
  return { value: 1, from: "SVG's initial value" };
}

/** The box the glyph is drawn at, in CSS px, following percentages and custom properties. */
function boxOf(el: Element): { px: number | null; why: string | null } {
  const px = (v: string) => (/^-?[\d.]+px$/.test(v) ? parseFloat(v) : null);
  let node: Element | null = el;
  let width = getComputedStyle(node).width;
  let fraction = 1;
  for (let hop = 0; hop < 12; hop += 1) {
    const varName = /^var\((--[\w-]+)\)$/.exec(width.trim())?.[1];
    if (varName) {
      let owner: Element | null = node;
      let resolved: string | null = null;
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
    node = node!.parentElement;
    // The React <Icon> wraps its svg in an inline span with no width of its own, and a
    // browser sizes that span from the slot around it. JSDOM lays nothing out, so the
    // percentage is handed on to the first ancestor that states a width.
    while (node && getComputedStyle(node).width === 'auto' && /^inline/.test(getComputedStyle(node).display)) node = node.parentElement;
    if (!node) return { px: null, why: 'its width is a percentage of nothing' };
    width = getComputedStyle(node).width;
  }
  return { px: null, why: 'its width chases percentages further than this gate follows' };
}

function measure(el: Element) {
  const paint = strokePaint(el);
  if (paint === 'none') return null;
  const stroke = strokeWidth(el);
  const box = boxOf(el);
  const vb = (el.getAttribute('viewBox') || '').trim().split(/[\s,]+/);
  const units = vb.length === 4 ? parseFloat(vb[2]) : box.px;
  return { stroke, box, units, px: box.px === null || !units ? null : renderedPx(stroke.value, box.px, units) };
}

/* ---- the kit rules that decide a glyph ------------------------------------ */

const kitRules: { sel: string; sheet: string; seen: boolean }[] = [];
for (const [i, name] of SHEETS.entries()) {
  for (const [rule] of rulesOf(document.styleSheets[i], name, SVG_CLASSES) as [CSSStyleRule][]) {
    for (const raw of selectorParts(rule.selectorText) as string[]) {
      const sel = raw.replace(/\s+/g, ' ');
      if (!isSvgSubject(sel, SVG_CLASSES)) continue;
      if (sel.includes(':where(')) continue;
      if (!rule.style.getPropertyValue('width') && !rule.style.getPropertyValue('stroke-width')) continue;
      kitRules.push({ sel, sheet: name, seen: false });
    }
  }
}

/* ---- what the React kit draws thin today ------------------------------------ */

// Found when #429 gave the React stories this gate; none of it comes from the vanilla
// removal, and each one draws thinner than the line in Chromium too. They are listed
// rather than skipped: a glyph not listed here fails, and a listed one that clears the
// line fails until it is taken off. Fixing them changes how they look, so it waits for
// the owner's picture approval.
const KNOWN_THIN: Record<string, string> = {
  'span.ui-timeline__marker.ui-timeline__marker--kind > span > svg': 'a 12px marker glyph at stroke 1.7, 0.85 CSS px',
  'span.ui-timeline__marker.ui-timeline__marker--kind.ui-timeline__marker--reversal > span > svg': 'the same marker on a reversal',
  'div.auth-actors > span > svg': 'the consent arrow between the two marks, stroke 1.7 at the default box',
  'div.auth-note > span > svg': 'the consent note glyph, stroke 1.7 at the default box',
  'span.ui-badge.ui-badge--neutral > span > svg': 'a glyph inside a neutral badge, stroke 1.7 at the default box',
};

// Kit rules that size or stroke a glyph no React story draws.
const KNOWN_UNRENDERED: Record<string, string> = {
  'styles/feedback.css  .ui-fbc__chip svg': 'the React Feedback draws the chip only in the open composer, which no story opens',
  'styles/feedback.css  .ui-fbc__x svg': 'the vanilla composer close glyph; the shipped CSS keeps it',
  'styles/feedback.css  .ui-fbck': 'the vanilla sent check; the shipped CSS keeps it',
};

/* ---- the corpus: every React story ---------------------------------------- */

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });

const thin: string[] = [];
const thinSeen = new Set<string>();
const unmeasurable: string[] = [];
const tally = { stories: 0, glyphs: 0, stroked: 0 };
let worst = { px: Infinity, where: '(nothing measured)' };

const holder = document.body.appendChild(document.createElement('div'));
const where = (el: Element, story: string) => {
  const chain: string[] = [];
  for (let node: Element | null = el; node && node !== holder; node = node.parentElement) {
    const cls = (node.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).join('.');
    chain.unshift(node.tagName.toLowerCase() + (cls ? `.${cls}` : ''));
  }
  return `${chain.slice(-3).join(' > ')}  [${story}]`;
};

for (const file of Object.keys(modules).sort()) {
  const mod = modules[file];
  const def = mod.default || {};
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || !story || typeof story !== 'object') continue;
    const render = (story as Story).render || def.render;
    if (typeof render !== 'function') continue;
    const args = { ...def.args, ...(story as Story).args };
    const StoryRender = () => render(args, { globals: { theme: 'dark', accent: 'default' }, args });
    const host = holder.appendChild(document.createElement('div'));
    const reactRoot = createRoot(host);
    try {
      act(() => reactRoot.render(<StoryRender />));
    } catch (err) {
      unmeasurable.push(`${file}:${name} — render threw: ${(err as Error)?.message}`);
      act(() => reactRoot.unmount());
      host.remove();
      continue;
    }
    tally.stories += 1;
    for (const rule of kitRules) {
      if (rule.seen) continue;
      try { if (document.body.querySelector(rule.sel)) rule.seen = true; } catch { /* unmountable here */ }
    }
    // The whole body, not the host: a dialog or a drawer portals out of it.
    for (const el of document.body.querySelectorAll('svg')) {
      tally.glyphs += 1;
      const m = measure(el);
      if (!m) continue;
      tally.stroked += 1;
      if (m.px === null) {
        unmeasurable.push(`${where(el, `${file}:${name}`)} — ${m.box.why ?? 'it declares no viewBox'}`);
        continue;
      }
      const chain = where(el, '').replace(/ {2}\[\]$/, '');
      if (KNOWN_THIN[chain]) { if (m.px < SOLID_STROKE) thinSeen.add(chain); continue; }
      if (m.px < worst.px) worst = { px: m.px, where: where(el, `${file}:${name}`) };
      if (m.px >= SOLID_STROKE) continue;
      thin.push(`${m.px.toFixed(2)}px — ${where(el, `${file}:${name}`)}\n      stroke-width ${m.stroke.value} from ${m.stroke.from}, drawn at ${m.box.px}px in a ${m.units}-unit box; ${needsWidth(m.box.px, m.units)} would clear the line`);
    }
    act(() => reactRoot.unmount());
    host.remove();
  }
}

describe('glyph stroke: React stories', () => {
  it('the icon factory still draws in the box these widths are read against', () => {
    const factory = /export const icon =[\s\S]*?viewBox="0 0 (\d+) (\d+)"/.exec(readFileSync(path.join(src, 'assets/icons.js'), 'utf8'));
    expect(factory, 'src/assets/icons.js no longer emits a viewBox this gate can read').toBeTruthy();
    expect([Number(factory![1]), Number(factory![2])]).toEqual([VIEWBOX, VIEWBOX]);
  });

  it('the measurement can fail, and fails where the stroke-width rule says it does', () => {
    expect(renderedPx(1.8, 18, VIEWBOX)).toBeLessThan(SOLID_STROKE);
    expect(renderedPx(2.1, 18, VIEWBOX)).toBeGreaterThanOrEqual(SOLID_STROKE);
    expect(needsWidth(18, VIEWBOX)).toBe(2);
    expect(needsWidth(13, VIEWBOX)).toBe(2.8);
  });

  it('the kit still writes rules that decide a glyph', () => {
    expect(kitRules.length, 'the sweep is broken, not the kit').toBeGreaterThanOrEqual(20);
  });

  it('every story renders a DOM this gate can measure', () => {
    expect(tally.stories, 'no stories rendered: the discovery is broken').toBeGreaterThan(0);
    expect(unmeasurable, 'a glyph this gate cannot measure is a glyph it cannot fail').toEqual([]);
  });

  it('the corpus this gate measures is the kit, not a corner of it', () => {
    expect(tally.stroked, `only ${tally.stroked} stroked glyphs in ${tally.stories} stories`).toBeGreaterThan(40);
  });

  it('no rule in the kit decides a glyph that nothing renders, but the listed ones', () => {
    const dark = kitRules.filter((r) => !r.seen).map((r) => `${r.sheet}  ${r.sel}`);
    expect(dark.filter((rule) => !KNOWN_UNRENDERED[rule]), 'render the part in a story, or take the rule out').toEqual([]);
    expect(Object.keys(KNOWN_UNRENDERED).filter((rule) => !dark.includes(rule)), 'a story draws it now: take it off the list').toEqual([]);
  });

  it('every stroked glyph the kit renders clears the 1.5 CSS px line, but the listed ones', () => {
    expect(thin).toEqual([]);
    expect(Object.keys(KNOWN_THIN).filter((chain) => !thinSeen.has(chain)), 'it clears the line now, or no story draws it: take it off the list').toEqual([]);
  });

  it('the narrowest stroked glyph is still where the kit left it', () => {
    // Option C (#426): 16px × 2.25 / 24 deliberately lands at 1.5px.
    expect(worst.px, `the narrowest stroked glyph renders at ${worst.px.toFixed(3)} CSS px — ${worst.where}`).toBeGreaterThanOrEqual(1.5);
  });
});
