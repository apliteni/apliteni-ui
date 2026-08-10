/* Shared machinery for the two icon-size gates.
 *
 *   src/styles/icon-size.test.js      — the rules inside the package's own stylesheets
 *   scripts/icon-size-surfaces.test.js — the rules on the surfaces the kit renders
 *                                        (the landing site, the Storybook stories)
 *
 * Both ask the same question — does the rule that sizes this icon actually win
 * the cascade against the reset in src/styles/base.css — and both answer it the
 * same way: mount an element matching the rule's selector against the real kit
 * stylesheets and read getComputedStyle back. Only the source of the rules
 * differs. This file is that shared half, so the second gate cannot drift into
 * measuring something subtly different from the first.
 *
 * It lives under scripts/ on purpose. `files` in package.json excludes test
 * files from src/ but nothing else, so a plain .js helper under src/ would ship
 * to consumers; scripts/ is outside the tarball entirely, and this one does not.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

/* The two dimensions every contest here is decided in. A rule can name either of
 * them in two spellings, and the second spelling is why this file has a
 * normalization step. `inline-size` and `block-size` share a computed value with
 * `width` and `height` and cascade as one with them, so
 * `.x svg { inline-size: 21px }` at (0,1,1) beats the reset's `width` at (0,0,1)
 * and decides the icon exactly as a physical declaration would.
 *
 * jsdom does not model that sharing. It keeps `inline-size` in a cascade of its
 * own that `width` never enters, so a logical declaration measured as written
 * wins every contest it is in — including the ones a browser makes it lose,
 * which is a gate that cannot fail. foldLogicalDims() rewrites the declaration
 * onto its physical counterpart before anything is measured, and the contest
 * that gets measured is then the one the browser holds. */
export const DIMS = ['width', 'height'];
export const LOGICAL_DIMS = new Map([['inline-size', 'width'], ['block-size', 'height']]);

/** Both spellings, for the checks that read a rule before it has been folded. */
export const SIZING_PROPS = [...DIMS, ...LOGICAL_DIMS.keys()];

/* Sizing an icon by clamping it, which neither gate measures anything about: a
 * clamp never enters `width`'s cascade, so the reset still wins `width` and the
 * clamp applies to the used value afterwards — and jsdom has no layout to apply
 * it in. Each gate asserts this list lands on no icon, which is how a clamp on
 * an icon reaches a reader instead of passing in silence. Both spellings again,
 * for the same reason as above: `min-inline-size` is `min-width` while the
 * writing mode is horizontal. */
export const CLAMP_PROPS = [
  'min-width', 'max-width', 'min-height', 'max-height',
  'min-inline-size', 'max-inline-size', 'min-block-size', 'max-block-size',
];

/* Build output and vendored code, skipped by directory name. Two of these exist
 * on a dev machine and never in CI, which is the dangerous shape: site/public/
 * is gitignored, and site/build.mjs folds the entire built Storybook into
 * site/public/storybook/. A developer who has run a full build would otherwise
 * have every sweep below read that vendor bundle — harvesting `<svg class="…">`
 * out of it and deriving a different class set than CI derives from the same
 * commit. This repo has already shipped one local-green/CI-red defect; a walk
 * that reads untracked build output is how you get the next one. */
export const SKIP_DIRS = new Set(['node_modules', 'dist', 'public', 'storybook-static']);

/** Every file under `dir`, depth-first, build output excluded. */
export function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(p, acc);
    } else acc.push(p);
  }
  return acc;
}

/* The kit's stylesheets, in the order src/index.css imports them. Same
 * derivation as importsOfIndexCss() in scripts/stylesheet-manifest.test.js,
 * quotes and all. A looser regex here would silently drop a sheet written with
 * single quotes and take its rules out of coverage with the suite still
 * green. */
export function kitSheetNames(src) {
  return [...readFileSync(path.join(src, 'index.css'), 'utf8')
    .matchAll(/^\s*@import\s+["']\.\/([^"']+)["']/gm)].map((m) => m[1]);
}

/* One <style> per sheet, in import order: the cascade still resolves across
 * them exactly as one concatenated sheet would, and every rule keeps a file
 * name. Concatenating first would throw that away. */
export function kitStyleHtml(src, names) {
  return names
    .map((rel) => `<style data-sheet="${rel}">${readFileSync(path.join(src, rel), 'utf8')}</style>`)
    .join('\n');
}

/* The classes the kit puts on an <svg>, read out of the source rather than
 * listed here, so a new one joins coverage by existing. Two ways a class gets
 * onto an svg: written into the tag, or passed as icon()'s second argument.
 *
 * `dirs` are scanned depth-first; `exts` says which files count. Test files are
 * always skipped — a class that only a test writes onto an svg is not a class
 * the kit renders. */
export function svgClassSet(dirs, exts = ['.js']) {
  const found = new Set();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const p of walk(dir)) {
      const name = path.basename(p);
      if (!exts.some((e) => name.endsWith(e))) continue;
      if (name.endsWith('.test.js')) continue;
      const text = readFileSync(p, 'utf8');
      for (const m of text.matchAll(/<svg[^>]*\sclass="([^"${]+)"/g)) {
        for (const c of m[1].trim().split(/\s+/)) found.add(c);
      }
      for (const m of text.matchAll(/\bicon\(\s*'[^']*'\s*,\s*'([^']+)'/g)) {
        for (const c of m[1].trim().split(/\s+/)) found.add(c);
      }
    }
  }
  return found;
}

export const leafOf = (sel) => sel.trim().split(/\s+/).pop();

/* Two shapes count, and the second is easy to miss:
 *
 *   .ui-btn svg          — the selector ends in `svg`
 *   .ui-fbck             — a CLASS the kit puts ON an svg (the CHECK markup in
 *                          src/components/feedback.js)
 *
 * The second shape is not cosmetic: .ui-fbck is the largest icon in the kit and
 * an earlier gate that collected only selectors ending in `svg` was blind to it.
 * Outside the package the same shape appears as `.term__copy .ic { width: 15px }`
 * in site/index.html — `ic` is a class written onto the svg tag itself. */
export function isSvgSubject(selectorText, classes) {
  return selectorText.split(',').some((s) => {
    const leaf = leafOf(s);
    if (/^svg\b/.test(leaf)) return true;
    return leaf.split('.').slice(1).some((c) => classes.has(c.replace(/[:[].*$/, '')));
  });
}

/** Every rule in a sheet, conditional groups included, depth first. */
function* everyRule(container) {
  for (const rule of container.cssRules ?? []) {
    yield rule;
    if (rule.cssRules) yield* everyRule(rule);
  }
}

const FOLDED = new WeakSet();
const AS_WRITTEN = new WeakMap();

/* Rewrite `inline-size` onto `width` and `block-size` onto `height` in every
 * rule of `sheet`, so a logical declaration competes in the cascade jsdom does
 * model. Both gates run this over every sheet of a document as they build it,
 * and rulesOf() refuses a sheet that has not been through it.
 *
 * Before anything is measured, and that ordering is load-bearing: jsdom clears
 * its computed-style cache when the DOM or a sheet's rule list changes, but not
 * when a declaration inside a rule does, so a fold that ran after a
 * getComputedStyle call would leave the element reading its old size.
 *
 * Order inside the block is respected rather than overwritten, because CSS
 * respects it: `width: 10px; inline-size: 20px` is 20px and the same pair the
 * other way round is 10px, and an `!important` on either side wins over the
 * other regardless of where it sits.
 *
 * The property as the author wrote it is kept, so a test named after this
 * subject can say `inline-size` where the file says `inline-size` — a gate that
 * renamed the rule it measures would send the next reader looking for a
 * declaration that is not there. */
export function foldLogicalDims(sheet, name) {
  for (const rule of everyRule(sheet)) {
    /* The mapping above is the horizontal-writing-mode one. Nothing in this
     * repo declares writing-mode, and the moment something does, `inline-size`
     * may be the vertical axis and folding it onto `width` measures the wrong
     * contest — quietly, and in the direction that passes. */
    const mode = rule.style?.getPropertyValue('writing-mode');
    if (mode) {
      throw new Error(`${name}: "${rule.selectorText}" declares writing-mode: ${mode}. This gate `
        + 'folds inline-size onto width and block-size onto height, which holds only while every '
        + 'icon is laid out horizontally. Take the declaration out, or teach the gate to fold '
        + 'along the writing mode each icon is actually in.');
    }
  }
  for (const rule of sheet.cssRules) {
    // Only the rules a gate mounts. A logical declaration inside @media is left
    // as written for the guard in rulesOf() to find and refuse.
    if (!rule.selectorText || rule.cssRules?.length) continue;
    const order = [];
    for (let i = 0; i < rule.style.length; i += 1) order.push(rule.style.item(i));
    for (const [logical, physical] of LOGICAL_DIMS) {
      const li = order.lastIndexOf(logical);
      if (li === -1) continue;
      const value = rule.style.getPropertyValue(logical);
      const priority = rule.style.getPropertyPriority(logical);
      rule.style.removeProperty(logical);
      const pi = order.lastIndexOf(physical);
      if (pi !== -1) {
        const logicalIsImportant = priority === 'important';
        const physicalIsImportant = rule.style.getPropertyPriority(physical) === 'important';
        const physicalWins = physicalIsImportant === logicalIsImportant
          ? pi > li
          : physicalIsImportant;
        if (physicalWins) continue;
      }
      rule.style.setProperty(physical, value, priority);
      AS_WRITTEN.set(rule, { ...AS_WRITTEN.get(rule), [physical]: logical });
    }
  }
  FOLDED.add(sheet);
}

/** How this rule spells `dim` — `inline-size` for a folded declaration. */
export const writtenAs = (rule, dim) => AS_WRITTEN.get(rule)?.[dim] ?? dim;

/* Every clamp this sheet puts on an icon, named the way a gate reports it.
 * Conditional groups included: a clamp inside @media is exactly as unmeasured as
 * one outside, and the reader deserves to hear about it from the same place. */
export function clampsOn(sheet, name, classes) {
  const found = [];
  for (const rule of everyRule(sheet)) {
    if (!rule.selectorText || !rule.style) continue;
    for (const raw of rule.selectorText.split(',')) {
      const sel = raw.trim().replace(/\s+/g, ' ');
      if (!isSvgSubject(sel, classes)) continue;
      for (const prop of CLAMP_PROPS) {
        const value = rule.style.getPropertyValue(prop);
        if (value) found.push(`${name}: ${sel} { ${prop}: ${value.trim()} }`);
      }
    }
  }
  return found;
}

/** What a gate says when a clamp lands on an icon. Both gates say it. */
export const CLAMP_REFUSAL = 'a rule sizes an icon by clamping it, and neither gate can tell you '
  + 'what that does. A min-/max- declaration never enters width\'s cascade: the reset still wins '
  + 'width, the clamp applies to the used value afterwards, and jsdom has no layout to apply it '
  + 'in — so the icon renders at a size no rule these gates can read decides. Size the icon with '
  + 'width/height or inline-size/block-size, which are measured, and clamp something that is not '
  + 'an icon; or teach these gates to measure a clamp somewhere layout exists.';

/* Yield [rule, sheetName], refusing to guess about shapes these gates cannot
 * measure rather than reporting a misleading result for them. */
export function* rulesOf(sheet, name, classes) {
  if (!FOLDED.has(sheet)) {
    throw new Error(`${name}: this sheet has not been through foldLogicalDims(), so a rule sizing `
      + 'an icon with inline-size or block-size would be read as if it sized nothing. Fold every '
      + 'sheet of the document as you build it.');
  }
  for (const rule of sheet.cssRules) {
    if (rule.selectorText) {
      // A CSSStyleRule carries an empty cssRules of its own under CSS nesting,
      // so testing that property first would swallow every style rule.
      if (rule.cssRules?.length) {
        throw new Error(`${name}: nested rule under "${rule.selectorText}" — this gate `
          + 'mounts from a full selector and cannot resolve "&". Unnest it or teach the gate.');
      }
      yield [rule, name];
      continue;
    }
    // @media / @supports / @layer. jsdom's getComputedStyle does not apply
    // rules inside them even when the condition matches, so a sizing rule that
    // moved in here would become a permanent, misleading red.
    if (rule.cssRules) {
      for (const inner of rule.cssRules) {
        if (!inner.selectorText) continue;
        const sizes = SIZING_PROPS.some((d) => inner.style?.getPropertyValue(d));
        if (sizes && isSvgSubject(inner.selectorText, classes)) {
          throw new Error(`${name}: "${inner.selectorText}" sizes an icon inside `
            + `"${rule.cssText.slice(0, 40)}…". jsdom does not apply conditional rules, so this `
            + 'gate cannot measure it. Move it out or teach the gate.');
        }
      }
    }
  }
}

/* The smallest DOM satisfying a descendant selector such as
 * `.ui-nav--side.is-collapsed .ui-nav__ic svg`. Every icon selector the kit
 * renders is a chain of compound class/element parts. Anything else throws — and
 * the mounted element is checked against the selector afterwards, which is the
 * catch-all for shapes this builder gets subtly wrong. */
export function mount(document, sel, classes) {
  const parts = sel.split(' ').filter(Boolean);
  let parent = document.body;
  let el = null;
  for (const part of parts) {
    if (/[>+~[:*&\\]/.test(part)) throw new Error(`unsupported selector part: ${part} (in ${sel})`);
    const bare = part.replace(/\..*$/, '');
    const isSvg = bare === 'svg' || (!bare && part.split('.').slice(1).some((c) => classes.has(c)));
    el = isSvg
      ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      : document.createElement(bare || 'div');
    for (const cls of part.split('.').slice(1)) el.classList.add(cls);
    parent.appendChild(el);
    parent = el;
  }
  return { el, top: document.body.lastElementChild };
}

/* What the declared value resolves to in this element's own context. Comparing
 * the computed px against the declared literal would call a winning rule
 * written `1.0625rem` a failure and blame the reset for it. */
export function resolve(getComputedStyle, el, dim, value) {
  const probe = el.cloneNode(false);
  /* The probe is a clone, so it matches every rule the real element matches. A
   * non-important inline declaration loses to an author `!important`, which then
   * wins on the probe exactly as it wins on the real element: got === expected,
   * green, whichever rule actually decided. Since #148 made the reset
   * `svg:where(…)` at (0,0,1) it can no longer out-specify a component rule, so
   * `!important` on the reset is the one remaining way to reintroduce #148's
   * defect — and this comparison cannot tell the two apart unless the probe
   * declares important too.
   *
   * Belt-and-braces rather than the mechanism, though: without() catches that
   * same regression on its own, so the flag is not what makes an `!important`
   * reset detectable. What it buys is which assertion fires. Putting
   * `!important` on base.css's two reset declarations fails both gates by the
   * same counts either way — 56 here and 15 on the surfaces gate — but with the
   * flag every gate-1 failure reads "the cascade gives 110px", naming the rule
   * that won, and without it they read "changes nothing", which describes a
   * symptom and sends the reader looking for a redundant rule rather than an
   * important one. */
  probe.style.setProperty(dim, value, 'important');
  el.parentNode.appendChild(probe);
  const got = getComputedStyle(probe).getPropertyValue(dim);
  probe.remove();
  return got;
}

/* What this element computes to with `rule`'s own declaration of `dim` taken
 * away, the rule put back before returning.
 *
 * This is how a gate proves its comparison was capable of failing. A declared
 * value that coincides with what the reset gives at this element's font-size
 * makes the assertion a green no-op: .ui-badge declares 11px and the reset's
 * 1.1em over badge.css's font-size: 10px is also 11px, so the measurement
 * agreed with the winner and the loser alike. That hole was found by hand once;
 * asserting non-vacuity is what stops the next instance needing to be. */
export function without(getComputedStyle, el, rule, dim) {
  const value = rule.style.getPropertyValue(dim);
  const priority = rule.style.getPropertyPriority(dim);
  rule.style.removeProperty(dim);
  try {
    return getComputedStyle(el).getPropertyValue(dim);
  } finally {
    rule.style.setProperty(dim, value, priority);
  }
}
