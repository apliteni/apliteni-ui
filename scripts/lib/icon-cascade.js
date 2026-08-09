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

export const DIMS = ['width', 'height'];

/** Every file under `dir`, depth-first. */
export function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

/* The kit's stylesheets, in the order src/index.css imports them. Same
 * derivation as scripts/stylesheet-manifest.test.js:38, quotes and all. A looser
 * regex here would silently drop a sheet written with single quotes and take its
 * rules out of coverage with the suite still green. */
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
 *   .ui-fbck             — a CLASS the kit puts ON an svg (feedback.js:18)
 *
 * The second shape is not cosmetic: .ui-fbck is the largest icon in the kit and
 * an earlier gate that collected only selectors ending in `svg` was blind to it.
 * Outside the package the same shape appears as `.term__copy .ic`
 * (site/index.html:136) — `ic` is a class written onto the svg tag itself. */
export function isSvgSubject(selectorText, classes) {
  return selectorText.split(',').some((s) => {
    const leaf = leafOf(s);
    if (/^svg\b/.test(leaf)) return true;
    return leaf.split('.').slice(1).some((c) => classes.has(c.replace(/[:[].*$/, '')));
  });
}

/* Yield [rule, sheetName], refusing to guess about shapes these gates cannot
 * measure rather than reporting a misleading result for them. */
export function* rulesOf(sheet, name, classes) {
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
        const sizes = DIMS.some((d) => inner.style?.getPropertyValue(d));
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
  probe.style.setProperty(dim, value);
  el.parentNode.appendChild(probe);
  const got = getComputedStyle(probe).getPropertyValue(dim);
  probe.remove();
  return got;
}
