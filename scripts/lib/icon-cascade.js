/* Shared machinery for the three icon-size gates:
 *
 *   src/styles/icon-size.test.js       — the package's own stylesheets
 *   scripts/icon-size-surfaces.test.js — the surfaces the kit renders
 *   scripts/icon-size-react.test.js    — the CSS under react/src
 *
 * All three ask whether the rule sizing this icon beats the reset in
 * src/styles/base.css, and all three answer by mounting an element against the
 * real kit stylesheets and reading getComputedStyle back. It lives under
 * scripts/ because `files` in package.json would ship a plain .js helper under
 * src/ to consumers, and scripts/ is outside the tarball.
 * why: CONTRIBUTING.md#one-gate-per-workspace-over-one-shared-implementation
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

/* The two dimensions every contest here is decided in. jsdom keeps `inline-size`
 * in a cascade of its own that `width` never enters, so foldLogicalDims()
 * rewrites it onto its physical counterpart before anything is measured. */
export const DIMS = ['width', 'height'];
export const LOGICAL_DIMS = new Map([['inline-size', 'width'], ['block-size', 'height']]);

/** Both spellings, for the checks that read a rule before it has been folded. */
export const SIZING_PROPS = [...DIMS, ...LOGICAL_DIMS.keys()];

/* Sizing an icon by clamping it, which no gate measures anything about — see
 * CLAMP_REFUSAL. Each gate asserts this list lands on no icon. */
export const CLAMP_PROPS = [
  'min-width', 'max-width', 'min-height', 'max-height',
  'min-inline-size', 'max-inline-size', 'min-block-size', 'max-block-size',
];

/* A declaration of one of `props`, matched in the raw text of a stylesheet
 * rather than in the CSSOM — the only place some survive, since jsdom drops a
 * declaration whose value it cannot parse. Anchored on `;` or `{` so that
 * `min-width` cannot be read as `width`, and fresh each call because the `g`
 * flag makes lastIndex state a shared regex would carry between callers.
 * why: CONTRIBUTING.md#a-spelling-the-sweep-cannot-see-costs-coverage-in-silence */
export const declRe = (props) => new RegExp(
  `(?:^|[;{])\\s*(${props.join('|')})\\s*:\\s*([^;}]*)`, 'gi');

/* CSS with its comments taken out, for every scan that reads raw text rather
 * than the CSSOM: a commented-out `width: 20px` is not a declaration, and read
 * as text it fires a guard on a file that is perfectly fine. */
export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/* The same text with the CONTENTS of every string replaced by spaces — quotes
 * left where they are, every offset unmoved, so a caller can match here and read
 * the string back out of the original text. A string is content and not CSS: the
 * data URI in src/styles/input.css holds `style='height:12px;width:12px'` and a
 * `content` can hold `{ width: 5px`, and read as declarations both make a gate
 * refuse a file a browser is happy with. kitSheetNames() is the one raw scan
 * that skips this, since it matches on the quoted sheet name blanking erases. */
export const blankStrings = (css) => {
  let out = '';
  scanTop(css, (ch, _top, _i, inString) => { out += inString ? ' ' : ch; });
  return out;
};

/* Build output and vendored code, skipped by directory name. Two of these exist
 * on a dev machine and never in CI: site/public/ is gitignored and holds the
 * built Storybook, so a developer who has run a build would have every sweep
 * below harvest `<svg class="…">` out of that bundle. */
export const SKIP_DIRS = new Set(['node_modules', 'dist', 'public', 'storybook-static']);

/* Every file under `dir`, depth-first, build output excluded. Pruning is by NAME
 * and applies at any depth; pass `skipped` an array and every directory refused
 * lands in it, so a caller can say so instead of quietly reading less. */
export function walk(dir, acc = [], skipped = null) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) skipped?.push(p);
      else walk(p, acc, skipped);
    } else acc.push(p);
  }
  return acc;
}

/* The kit's stylesheets, in the order src/index.css imports them. Both quotes
 * are read, since a sheet written with the other one would leave this list with
 * the suite still green. The keyword folds case and the path must not:
 * why: CONTRIBUTING.md#a-spelling-the-sweep-cannot-see-costs-coverage-in-silence */
export function kitSheetNames(src) {
  return [...readFileSync(path.join(src, 'index.css'), 'utf8')
    .matchAll(/^\s*@import\s+["']\.\/([^"']+)["']/gmi)].map((m) => m[1]);
}

/* One <style> per sheet, in import order: the cascade still resolves across
 * them exactly as one concatenated sheet would, and every rule keeps a file
 * name. Concatenating first would throw that away. */
export function kitStyleHtml(src, names) {
  return names
    .map((rel) => `<style data-sheet="${rel}">${readFileSync(path.join(src, rel), 'utf8')}</style>`)
    .join('\n');
}

/* An svg carrying a class, in the two languages this repo writes markup in.
 * HTML folds case and JSX does not, so they are two patterns; neither flag
 * reaches the captured text, a class name being case-sensitive.
 * why: CONTRIBUTING.md#a-spelling-the-sweep-cannot-see-costs-coverage-in-silence */
const svgClassRes = () => [/<svg[^>]*\sclass="([^"${]+)"/gi, /<svg[^>]*\sclassName="([^"${]+)"/g];

/* The classes the kit puts on an <svg>, read out of the source rather than
 * listed here, so a new one joins coverage by existing — written into the tag,
 * or passed as icon()'s second argument. Test files are always skipped: a class
 * only a test writes onto an svg is not a class the kit renders.
 * why: CONTRIBUTING.md#a-spelling-the-sweep-cannot-see-costs-coverage-in-silence */
export function svgClassSet(dirs, exts = ['.js']) {
  const found = new Set();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const p of walk(dir)) {
      const name = path.basename(p);
      if (!exts.some((e) => name.endsWith(e))) continue;
      if (/\.test\.[cm]?[jt]sx?$/.test(name)) continue;
      const text = readFileSync(p, 'utf8');
      for (const re of svgClassRes()) {
        for (const m of text.matchAll(re)) {
          for (const c of m[1].trim().split(/\s+/)) found.add(c);
        }
      }
      for (const m of text.matchAll(/\bicon\(\s*'[^']*'\s*,\s*'([^']+)'/g)) {
        for (const c of m[1].trim().split(/\s+/)) found.add(c);
      }
    }
  }
  return found;
}

/* Walk a selector at the top level, stepping over anything inside () or [], and
 * call `at` for every character that is not. Every split below is built on this:
 * the `>` in `:has(> .ui-table)` separates nothing and the comma in
 * `:where(ul, ol)` starts no second selector. Quoted strings are stepped over
 * too, for a sharper reason — `[data-x="]"]` closes no bracket, so counting that
 * `]` takes the depth below zero and nothing after it is ever top level again,
 * which drops the rule out of coverage with no count moving to say so. */
function scanTop(sel, at) {
  let depth = 0;
  let quote = '';
  for (let i = 0; i < sel.length; i += 1) {
    const ch = sel[i];
    if (quote) {
      // A backslash escapes the next character, `\"` included, so the string
      // does not end early. Both characters are handed on as ordinary content.
      if (ch === '\\' && i + 1 < sel.length) { at(ch, false, i, true); i += 1; at(sel[i], false, i, true); continue; }
      if (ch === quote) { quote = ''; at(ch, false, i, false); continue; }
      at(ch, false, i, true);
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; at(ch, false, i, false); continue; }
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    at(ch, depth === 0 && !'()[]'.includes(ch), i, false);
  }
}

/* The selectors a selector list holds — `.a, .b` is two, `:where(ul, ol)` is
 * one. A plain split on ',' produces halves of a functional pseudo that are not
 * selectors at all. */
export function selectorParts(selectorText) {
  const parts = [''];
  scanTop(selectorText, (ch, top) => {
    if (top && ch === ',') parts.push('');
    else parts[parts.length - 1] += ch;
  });
  return parts.map((s) => s.trim()).filter(Boolean);
}

/* One complex selector split into its compound selectors, each paired with the
 * combinator in front of it. `.a>svg` and `.a > svg` are the same two compounds:
 * split on whitespace the first is one token, `svg` is not its leaf, and the
 * rule deciding the icon looks like a rule about nothing. */
export function compoundsOf(sel) {
  const out = [];
  let cur = '';
  let comb = '';
  scanTop(sel, (ch, top) => {
    if (top && /[\s>+~]/.test(ch)) {
      if (cur) { out.push([comb || ' ', cur]); cur = ''; comb = ''; }
      if (!/\s/.test(ch)) comb = ch;
      return;
    }
    cur += ch;
  });
  if (cur) out.push([comb || ' ', cur]);
  return out;
}

/** The compound a selector actually selects — `svg` out of `.rx-tbl>svg`. */
export const leafOf = (sel) => compoundsOf(sel.trim()).pop()?.[1] ?? '';

/** A compound with every functional pseudo's argument list emptied out. */
const withoutArgs = (compound) => {
  let out = '';
  scanTop(compound, (ch, top) => { if (top) out += ch; });
  return out;
};

/* The argument lists of the pseudo-classes that name what the subject may BE.
 * `:has()` and `:not()` are excluded, and only the TOP level of the compound is
 * collected, so an `:is()` nested inside either stays that pseudo's argument.
 * The name folds case; what is inside the parentheses is sliced out by offset.
 * why: CONTRIBUTING.md#a-spelling-the-sweep-cannot-see-costs-coverage-in-silence */
function alternativesIn(compound) {
  const top = new Set();
  scanTop(compound, (_ch, isTop, i) => { if (isTop) top.add(i); });
  const out = [];
  const re = /:(?:is|where|matches)\(/gi;
  for (let m = re.exec(compound); m; m = re.exec(compound)) {
    if (!top.has(m.index)) { re.lastIndex = m.index + 1; continue; }
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    for (; i < compound.length && depth > 0; i += 1) {
      if (compound[i] === '(') depth += 1;
      else if (compound[i] === ')') depth -= 1;
    }
    if (depth === 0) out.push(compound.slice(start, i - 1));
    re.lastIndex = i;
  }
  return out;
}

/* Two shapes count, and the second is easy to miss:
 *
 *   .ui-btn svg          — the selector ends in `svg`
 *   .ui-fbck             — a CLASS the kit puts ON an svg (the CHECK markup in
 *                          src/components/feedback.js)
 *
 * .ui-fbck is the largest icon in the kit, and an earlier gate collecting only
 * selectors ending in `svg` was blind to it. Asked of the leaf compound and
 * recursively through `:is()`/`:where()`, so the shape a selector is written in
 * decides nothing: `.rx-tbl>svg` selects an svg exactly as `.rx-tbl svg` does,
 * and answering "not an icon" leaves a rule that beats the reset ungated.
 * `.a :where(svg)` is recognised here and refused by mount(); refuse() says
 * why. */
function compoundIsSvg(compound, classes) {
  const bare = withoutArgs(compound);
  if (/^svg\b/.test(bare)) return true;
  if ([...bare.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].some((m) => classes.has(m[1]))) return true;
  return alternativesIn(compound)
    .some((args) => selectorParts(args).some((s) => compoundIsSvg(leafOf(s), classes)));
}

export function isSvgSubject(selectorText, classes) {
  return selectorParts(selectorText).some((s) => compoundIsSvg(leafOf(s), classes));
}

/** Every rule in a sheet, conditional groups included, depth first. */
function* everyRule(container) {
  for (const rule of container.cssRules ?? []) {
    yield rule;
    if (rule.cssRules) yield* everyRule(rule);
  }
}

/** An at-rule's prelude — `@media screen` out of `@media screen { … }`. */
const preludeOf = (rule) => rule.cssText.slice(0, rule.cssText.indexOf('{')).trim();

/* Every style rule inside a conditional group, at any depth, paired with the
 * at-rules it sits under, innermost first. Depth is the point: jsdom parses
 * `@layer x { @media screen { … } }` happily and applies none of it, so a rule
 * two levels down contributes no subject and loses no contest. Style rules are
 * descended into too, CSS nesting putting a rule under a rule the same way. */
function* nestedIn(group, chain) {
  for (const rule of group.cssRules ?? []) {
    if (rule.selectorText) yield [rule, chain];
    if (rule.cssRules) {
      yield* nestedIn(rule, rule.selectorText ? chain : [preludeOf(rule), ...chain]);
    }
  }
}

const FOLDED = new WeakSet();
const AS_WRITTEN = new WeakMap();

/* Whether a declared writing mode leaves the inline axis horizontal. Only the
 * modes that turn it break the fold; `initial` is horizontal-tb, while `inherit`
 * and `unset` name a mode set somewhere this cannot see and are refused. `what`
 * names the declaration, since only one of the two spellings can name the rule
 * it sits in. */
const turnsTheAxes = (mode) => !!mode && !['horizontal-tb', 'initial'].includes(mode.trim().toLowerCase());

const writingModeRefusal = (name, what) => `${name}: ${what}. This gate folds inline-size onto `
  + 'width and block-size onto height, which holds only while every icon is laid out '
  + 'horizontally. Take the declaration out, or teach the gate to fold along the writing mode '
  + 'each icon is actually in.';

/* The text a sheet was parsed from, which two of the checks below have no other
 * source for: jsdom drops `-webkit-writing-mode` and deduplicates a repeated
 * declaration before either reaches the CSSOM. A sheet with no <style> element
 * behind it has no such text, and reading that as '' would turn both checks off
 * silently — a constructed CSSStyleSheet has a null ownerNode and a <link>'s
 * textContent is '' — so it is refused instead. */
function rawTextOf(sheet, name) {
  const node = sheet.ownerNode;
  if (node?.nodeName?.toLowerCase() !== 'style') {
    throw new Error(`${name}: this sheet has no <style> element behind it, so this gate cannot read `
      + 'the text it was parsed from — and the two checks that read it would find nothing and pass. '
      + 'Mount the sheet as a <style> element the way every gate here builds its document, or teach '
      + 'this to reach the text wherever it now lives.');
  }
  return stripComments(node.textContent);
}

/* The two axes, each in the two spellings that share it. Order matters between
 * the members of a pair and nowhere else. */
const AXES = [...LOGICAL_DIMS].map(([logical, physical]) => [physical, logical]);

/* Every top-level block of a stylesheet's raw text, as [selector, body,
 * holdsBlock] — exactly the set foldLogicalDims() rewrites. A scan rather than a
 * regex, because `\{([^{}]*)\}` gets both halves wrong: a `}` inside a string
 * closes a block that is still open and everything after it goes unread, and the
 * selector taken as "whatever precedes the brace" lands inside a string for
 * `content: "{"`. Nested blocks are not reported — they sit at brace depth 1 and
 * the fold never reaches them — but each block says whether it HOLDS one, since
 * looking for a `{` in the body text would find the one in `content: "{"`. */
function topLevelBlocks(css) {
  const out = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  let bodyAt = 0;
  let holdsBlock = false;
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '{') {
      depth += 1;
      if (depth === 1) { bodyAt = i + 1; holdsBlock = false; } else holdsBlock = true;
    } else if (ch === '}') {
      if (depth === 0) start = i + 1;
      else {
        depth -= 1;
        if (depth === 0) {
          out.push([css.slice(start, bodyAt - 1).trim(), css.slice(bodyAt, i), holdsBlock]);
          start = i + 1;
        }
      }
    } else if (ch === ';' && depth === 0) {
      // A statement rather than a block — `@import`, `@charset`. The selector of
      // the rule after it starts here.
      start = i + 1;
    }
  }
  return out;
}

/* A top-level block the CSSOM stops describing — two shapes, both wrong numbers
 * rather than errors, neither recoverable from the CSSOM, so this refuses rather
 * than guessing. Neither check asks whether the rule sizes an icon.
 * why: CONTRIBUTING.md#the-cssom-stops-describing-a-block-that-repeats-a-property */
function refuseMisreadRepeats(css, name) {
  for (const [selector, body, holdsBlock] of topLevelBlocks(css)) {
    // Not a style rule, or a rule with a rule inside it — the fold skips both,
    // and rulesOf() is what has something to say about the second.
    if (selector.startsWith('@') || holdsBlock) continue;
    const decls = new Map();
    let n = 0;
    // Strings blanked, so a `content` holding `;width: 12px` cannot put a
    // phantom declaration on the far side of the twin and read as a straddle.
    // The selector stays as written, since it is what the refusal names.
    for (const d of blankStrings(body).matchAll(declRe(SIZING_PROPS))) {
      // Keyed lower-case, because that is how the CSSOM keys it: `WIDTH` and
      // `width` are one property there and deduplicate into each other, so two
      // keys here would count one repeat as two singles and refuse neither.
      const prop = d[1].toLowerCase();
      const list = decls.get(prop) ?? [];
      list.push({ at: n, important: /!\s*important/i.test(d[2]) });
      decls.set(prop, list);
      n += 1;
    }
    for (const [prop, list] of decls) {
      if (list.length < 2 || list[list.length - 1].important) continue;
      if (!list.some((d) => d.important)) continue;
      throw new Error(`${name}: "${selector}" repeats ${prop} with an !important on one of them `
        + 'and not on the last. A browser takes the important declaration wherever it sits; the '
        + 'CSSOM this gate measures keeps a repeated property once, in its first position with its '
        + 'last value and its last importance, so every gate here reads the declaration a browser '
        + `throws away and reports a size nothing renders. Declare ${prop} once, or put the `
        + '!important on the declaration you mean to win.');
    }
    for (const axis of AXES) {
      if (!axis.every((p) => decls.has(p))) continue;
      const repeated = axis.find((p) => decls.get(p).length > 1);
      if (!repeated) continue;
      const [a, b] = axis.map((p) => decls.get(p));
      if (a[a.length - 1].at < b[0].at || b[b.length - 1].at < a[0].at) continue;
      const other = axis.find((p) => p !== repeated);
      throw new Error(`${name}: "${selector}" declares ${repeated} both before and after ${other}. `
        + 'A browser takes the last of them; the CSSOM this gate reads keeps a repeated property '
        + 'once, in its first position with its last value, so the fold would pick the winner out '
        + 'of an order this file does not declare and report it as a size. Declare the axis once.');
    }
  }
}

export function foldLogicalDims(sheet, name) {
  for (const rule of everyRule(sheet)) {
    /* The mapping above is the horizontal-writing-mode one. Nothing in this
     * repo declares writing-mode, and the moment something does, `inline-size`
     * may be the vertical axis and folding it onto `width` measures the wrong
     * contest — quietly, and in the direction that passes. */
    const mode = rule.style?.getPropertyValue('writing-mode');
    if (turnsTheAxes(mode)) throw new Error(writingModeRefusal(name, `"${rule.selectorText}" declares `
      + `writing-mode: ${mode}`));
  }
  /* And the same question of the sheet's raw text: jsdom drops
   * `-webkit-writing-mode` outright, so the loop above sees nothing, while every
   * browser honouring the prefixed spelling turns the axes exactly as the
   * unprefixed one does. Every declaration is checked rather than the first —
   * `horizontal-tb` on <html> is allowed and would otherwise answer for every
   * later declaration in the file.
   * why: CONTRIBUTING.md#a-spelling-the-sweep-cannot-see-costs-coverage-in-silence */
  const raw = rawTextOf(sheet, name);
  const prefixed = [...blankStrings(raw)
    .matchAll(/(?:^|[;{\s])(-[a-z]+-writing-mode)\s*:\s*([^;}]*)/gi)]
    .find((m) => turnsTheAxes(m[2]));
  if (prefixed) {
    throw new Error(writingModeRefusal(name, `a rule declares ${prefixed[1]}: `
      + `${prefixed[2].trim()}, which jsdom parses away before this gate can read it`));
  }
  refuseMisreadRepeats(raw, name);
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
 * one outside, so both are reported from the same place. */
export function clampsOn(sheet, name, classes) {
  const found = [];
  for (const rule of everyRule(sheet)) {
    if (!rule.selectorText || !rule.style) continue;
    for (const raw of selectorParts(rule.selectorText)) {
      const sel = raw.replace(/\s+/g, ' ');
      if (!isSvgSubject(sel, classes)) continue;
      for (const prop of CLAMP_PROPS) {
        const value = rule.style.getPropertyValue(prop);
        if (value) found.push(`${name}: ${sel} { ${prop}: ${value.trim()} }`);
      }
    }
  }
  return found;
}

/** What a gate says when a clamp lands on an icon. All three gates say it. */
export const CLAMP_REFUSAL = 'a rule sizes an icon by clamping it, and no gate can tell you '
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
      for (const [inner, chain] of nestedIn(rule, [preludeOf(rule)])) {
        const sizes = SIZING_PROPS.some((d) => inner.style?.getPropertyValue(d));
        if (sizes && isSvgSubject(inner.selectorText, classes)) {
          throw new Error(`${name}: "${inner.selectorText}" sizes an icon inside `
            + `${chain.map((c) => `"${c}"`).join(' inside ')}. jsdom does not apply conditional `
            + 'rules, so this gate cannot measure it. Move it out or teach the gate.');
        }
      }
    }
  }
}

/* The selector the reset is written under, found by what makes it the reset: it
 * sizes an icon with no class on it, no attribute and nothing around it. Exactly
 * one, and the count is the point.
 * why: CONTRIBUTING.md#the-reset-is-found-by-what-only-the-reset-does */
export function resetSelectorOf(sheet, name, classes) {
  const bare = sheet.ownerNode.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const found = new Set();
  for (const [rule] of rulesOf(sheet, name, classes)) {
    if (!DIMS.some((d) => rule.style.getPropertyValue(d))) continue;
    for (const raw of selectorParts(rule.selectorText)) {
      const sel = raw.replace(/\s+/g, ' ');
      if (isSvgSubject(sel, classes) && bare.matches(sel)) found.add(sel);
    }
  }
  const [first, second] = [...found];
  if (second) {
    throw new Error(`${name}: "${first}" and "${second}" both size a bare icon, and this gate `
      + 'knows the reset by being the only rule that does. One of them is the reset; the other '
      + 'out-ranks every component rule in the kit from the one file whose rules are measured '
      + 'against it rather than as subjects, which is the defect these gates exist for. Write the '
      + 'reset once, or teach the gate to tell these two apart.');
  }
  if (!first) {
    throw new Error(`${name}: nothing here sizes a bare icon — an <svg> with no class on it and `
      + 'nothing around it. That rule is the reset, and finding it this way is what lets every '
      + 'other icon rule in this file be measured like any other. Without it there is nothing for '
      + 'the subjects to be measured against. Put the reset back, or teach the gate where it '
      + 'now lives.');
  }
  return first;
}

/* Every @import in a stylesheet's raw text. No gate here opens one — each
 * composes the files it finds — so the imported rules are measured only if that
 * sheet is itself one of them; src/index.css is the exception, being nothing but
 * the @imports the kit gate's sheet list is derived FROM. Matched against the
 * text with strings blanked, so `content: "@import zz"` is not an import, and
 * read back at the same offsets out of the unblanked text, a real specifier
 * being itself a string. The keyword folds case, as jsdom's parser does:
 * why: CONTRIBUTING.md#a-spelling-the-sweep-cannot-see-costs-coverage-in-silence */
export const importsIn = (css) => {
  const text = stripComments(css);
  return [...blankStrings(text).matchAll(/@import\s+([^;]*)/dgi)]
    .map(({ indices }) => text.slice(...indices[1]).trim());
};

/* The extensions a stylesheet is written under. The list lets the React gate
 * tell `import './DataTable.pcss'`, which its *.css sweep would miss, from
 * `import './polyfills'`, which is no concern of a sweep for stylesheets. */
const STYLE_EXTS = ['css', 'pcss', 'postcss', 'scss', 'sass', 'less', 'styl', 'stylus'];

/* Every stylesheet a source file imports by a RELATIVE path, however it binds
 * it, keeping any `?inline`/`?raw` suffix. An import through a path alias
 * resolves through tsconfig or the bundler's config, neither of which this
 * reads, so it is not reported and the gate's header says so. Case-SENSITIVE,
 * unlike the two CSS scans above — the keyword is JavaScript's:
 * why: CONTRIBUTING.md#a-spelling-the-sweep-cannot-see-costs-coverage-in-silence */
export const styleImportsIn = (source) => [...source.matchAll(
  new RegExp(String.raw`^\s*import\s+(?:[^'"]*\bfrom\s+)?['"](\.[^'"]+\.(?:${STYLE_EXTS.join('|')})(?:\?[^'"]*)?)['"]`,
    'gm'))].map((m) => m[1]);

export const IMPORT_REFUSAL = 'a stylesheet imports another sheet, and no gate here follows it — '
  + 'each composes the files it finds and nothing else, so the imported rules ship unmeasured. '
  + 'Import the sheet from the component or the page instead, so it is a file the sweep finds, or '
  + 'teach the gate to follow @import.';

/* An interpolation no gate could resolve becomes this token. A valid CSS
 * identifier on purpose: substituting something invalid would make jsdom drop
 * the declaration, which is indistinguishable from a rule never written. */
export const UNRESOLVED = 'ui-unresolved-interpolation';

/* Resolve `${NAME}` against a `const NAME = \`…\`` in the same file — the shape
 * stories/foundations/Iconography.stories.js uses. Anything else (a call, an
 * expression, a single-quoted const, one imported from elsewhere) becomes
 * UNRESOLVED, which is a failure only if it lands inside an icon-sizing rule. */
export function resolveInterpolations(body, source, depth = 0) {
  return body.replace(/\$\{([^}]*)\}/g, (_whole, expr) => {
    const name = expr.trim();
    if (depth < 4 && /^[A-Za-z_$][\w$]*$/.test(name)) {
      const m = source.match(new RegExp(`\\bconst\\s+${name}\\s*=\\s*\`([^\`]*)\``));
      if (m) return resolveInterpolations(m[1], source, depth + 1);
    }
    return UNRESOLVED;
  });
}

/* The CSS an expression states outright. Anything that is not a template literal
 * or a quoted string is handed back as an interpolation so it reaches UNRESOLVED
 * rather than silence — a string carrying a backslash included, since `\7d` is a
 * CSS escape and `\\n` a JS one. */
function literalCss(expr) {
  const text = expr.trim();
  const template = text.match(/^`([\s\S]*)`$/);
  if (template) return template[1];
  const quoted = text.match(/^'([^'\\]*)'$/) ?? text.match(/^"([^"\\]*)"$/);
  return quoted ? quoted[1] : `\${${text}}`;
}

/* A JSX expression container with its braces taken off. `.tsx` writes
 * <style>{`…`}</style>, and handing those braces and backticks to a CSS parser
 * yields a block with no rules, which reads as a component with no CSS. */
function unwrapExpression(body) {
  const container = body.match(/^\s*\{([\s\S]*)\}\s*$/);
  return container ? literalCss(container[1]) : body;
}

/* The `__html` of every `<style dangerouslySetInnerHTML={{__html: …}} />`, with
 * the span each one occupies. That is THE React idiom for injecting a CSS
 * string, and the paired-tag pattern below cannot see it — a self-closing tag
 * has nothing between it and `</style>` but the rest of the file. So these are
 * read first and blanked out of the source that pattern then scans. The
 * expression is found by balancing brackets, the CSS being full of braces. The
 * tag folds case exactly as it does below, which keeps the blanking aligned:
 * why: CONTRIBUTING.md#a-spelling-the-sweep-cannot-see-costs-coverage-in-silence */
function dangerousStyles(source) {
  const found = [];
  const open = /<style\b[^<]*?dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*/gi;
  for (let m = open.exec(source); m; m = open.exec(source)) {
    let depth = 0;
    let quote = '';
    let i = m.index + m[0].length;
    const start = i;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (quote) {
        if (ch === '\\') i += 1;
        else if (ch === quote) quote = '';
      } else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if ('([{'.includes(ch)) depth += 1;
      else if (')]'.includes(ch)) depth -= 1;
      else if (ch === '}') {
        if (depth === 0) break;
        depth -= 1;
      }
    }
    if (i >= source.length) continue;
    // Through the tag's own `>`, so the blanked span leaves nothing a later
    // pattern can read as an opening tag.
    const tagEnd = source.indexOf('>', i);
    found.push({ expr: source.slice(start, i), at: m.index, to: (tagEnd === -1 ? i : tagEnd) + 1 });
    open.lastIndex = i;
  }
  return found;
}

/* The CSS of every <style> block in a source file, resolved as far as it can be.
 * The tag is read in any case: the surfaces gate hands this the story files,
 * where `<STYLE>` inside a template literal is the HTML element, folded by every
 * browser and by jsdom, and read lower case only such a story contributes no
 * block, no subject and no count. The React gate hands this `.tsx`, where
 * folding over-reads a component named exactly `Style` — nobody writes one, and
 * the over-read is loud, the block parsing to no rules and blindSpots() redding
 * by name. Silence is the failure this family is about. */
export function styleBlocksOf(source) {
  const dangerous = dangerousStyles(source);
  let rest = source;
  for (const { at, to } of dangerous) rest = rest.slice(0, at) + ' '.repeat(to - at) + rest.slice(to);
  const paired = [...rest.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => ({ at: m.index, body: unwrapExpression(m[1]) }));
  return [...dangerous.map(({ at, expr }) => ({ at, body: literalCss(expr) })), ...paired]
    .sort((a, b) => a.at - b.at)
    .map(({ body }) => resolveInterpolations(body, source));
}

/* Whether an unresolved interpolation stands where a RULE or a DECLARATION would
 * be — `<style>${SHELL_CSS}</style>`, a `${SHARED}` after the last rule in a
 * block, `.a { ${DECLS} }`. Asked by POSITION, not by whether the sheet parsed
 * to no rules; a marker inside a declaration's VALUE is left to blindSpots(),
 * which scans the sizing and clamp properties by name. The text arrives with
 * comments out and strings blanked, so every brace left in it is one a CSS
 * parser sees.
 * why: CONTRIBUTING.md#a-declaration-jsdom-drops-leaves-no-subject-to-count */
function standsWhereCssWouldBe(text) {
  for (let i = text.indexOf(UNRESOLVED); i !== -1; i = text.indexOf(UNRESOLVED, i + 1)) {
    const before = text.slice(0, i);
    const after = text.slice(i + UNRESOLVED.length);
    const depth = (before.match(/\{/g) ?? []).length - (before.match(/\}/g) ?? []).length;
    if (depth <= 0) {
      /* Top level, where a whole rule would sit. A marker in a rule's PRELUDE is
       * the selector scan's to report, and the next brace is what says which
       * this is: a `{` puts the marker in front of a block, so it is part of that
       * selector. */
      const brace = after.search(/[{}]/);
      if (brace === -1 || after[brace] === '}') return true;
      continue;
    }
    // Inside a block, where a declaration would sit. A `:` anywhere in the
    // fragment around it makes the marker a property name or a value, and both
    // are already scanned.
    const from = Math.max(before.lastIndexOf('{'), before.lastIndexOf('}'), before.lastIndexOf(';'));
    const to = after.search(/[;{}]/);
    if (!(before.slice(from + 1) + (to === -1 ? after : after.slice(0, to))).includes(':')) return true;
  }
  return false;
}

/* Whether every statement in this text is an at-rule — which tells a block the
 * CSSOM modelled nothing of from a block it could not read. `@property` and
 * `@charset` reach the CSSOM as no rule at all, so a block holding one of them
 * and nothing else parses to zero rules exactly as an empty block does, and both
 * are CSS a browser honours. Every other at-rule this repo could write becomes a
 * rule and never reaches the caller's question. An at-rule nobody closed is
 * answered no, as is anything that is not an at-rule — the concatenated
 * `' + CSS + '` the caller's refusal exists for. */
function onlyAtRules(text) {
  let i = 0;
  for (;;) {
    while (i < text.length && /\s/.test(text[i])) i += 1;
    if (i >= text.length) return true;
    if (text[i] !== '@') return false;
    let depth = 0;
    let end = -1;
    for (let j = i; j < text.length && end === -1; j += 1) {
      if (text[j] === '{') depth += 1;
      else if (text[j] === '}') { depth -= 1; if (depth === 0) end = j + 1; }
      else if (text[j] === ';' && depth === 0) end = j + 1;
    }
    if (end === -1) return false;
    i = end;
  }
}

export function blindSpots(from, css, sheet) {
  const blind = [];
  const clampedBlind = [];
  const text = blankStrings(stripComments(css));
  for (const rule of sheet.cssRules) {
    if (!rule.selectorText) continue;
    const dims = DIMS.filter((d) => rule.style.getPropertyValue(d));
    if (!dims.length) continue;
    const values = dims.map((d) => rule.style.getPropertyValue(d));
    if (rule.selectorText.includes(UNRESOLVED) || values.some((v) => v.includes(UNRESOLVED))) {
      blind.push(`${from}: ${rule.selectorText} { ${dims.join(', ')} }`);
    }
  }
  /* An interpolation nothing could resolve, standing where CSS would be. Nothing
   * was dropped from a count either, because the count never rose: the block
   * reads as a surface with no CSS in it and the gate would swear it had
   * measured the page. */
  if (standsWhereCssWouldBe(text)) {
    blind.push(`${from}: an unresolved interpolation where a rule or a declaration would be`);
  }
  /* And a block that parsed to nothing at all. `'<style>' + CSS + '</style>'`
   * hands this a fragment of JavaScript between the tags: no rules to read, no
   * marker to find, every guard quiet while the CSS it concatenates ships. An
   * empty block is not that, nor is one holding only an at-rule the CSSOM models
   * nothing of — see onlyAtRules(). A marker in there is the guard above's to
   * report, one block drawing two refusals sending the reader after two
   * problems. */
  if (sheet.cssRules.length === 0 && text.trim() && !text.includes(UNRESOLVED)
    && !onlyAtRules(text)) {
    blind.push(`${from}: a <style> block this gate parsed to no rules at all`);
  }
  for (const m of text.matchAll(declRe(SIZING_PROPS))) {
    if (m[2].includes(UNRESOLVED)) blind.push(`${from}: ${m[1]}: ${m[2].trim()}`);
  }
  for (const m of text.matchAll(declRe(CLAMP_PROPS))) {
    if (m[2].includes(UNRESOLVED)) clampedBlind.push(`${from}: ${m[1]}: ${m[2].trim()}`);
  }
  for (const m of text.matchAll(/(?:^|[}])([^{}]*)\{/g)) {
    if (m[1].includes(UNRESOLVED)) blind.push(`${from}: selector ${m[1].trim()}`);
  }
  /* An interpolated PROPERTY NAME — `${DIM}: 21px`. jsdom drops the whole
   * declaration as an unknown property, so it never reaches the CSSOM, and the
   * value guard above only ever looks for a literal `width` or `height`, which
   * is the one thing this shape does not write. Anchored on `;` or `{` so a
   * selector such as `a:hover` cannot read as a property. */
  for (const m of text.matchAll(/[;{]\s*([^;{}:]*)\s*:/g)) {
    if (m[1].includes(UNRESOLVED)) blind.push(`${from}: property ${m[1].trim()}`);
  }
  return { blind, clampedBlind };
}

/* One sheet, reused, for asking whether a declaration survives being parsed. A
 * JSDOM per declaration answers the same thing and costs about two seconds
 * across the three gates — a tax big enough to get the check deleted. */
let probeSheet = null;
function survivesParsing(prop, value) {
  if (!probeSheet) {
    const { document } = new JSDOM('<!doctype html><html><head><style></style></head></html>').window;
    probeSheet = document.querySelector('style').sheet;
  }
  try {
    probeSheet.insertRule(`a{${prop}:${value}}`, 0);
  } catch {
    // Not even a rule. Whatever it is, it is not a size this gate can read.
    return false;
  }
  const kept = probeSheet.cssRules[0].style.getPropertyValue(prop);
  probeSheet.deleteRule(0);
  return !!kept;
}

/* Every sizing or clamp declaration in `css` that would not survive being
 * parsed — the hole a subject count cannot see. Asked of the raw text, and of
 * the rules that decide an icon rather than every rule in the sheet; a
 * conditional group is descended into, and a logical declaration is asked under
 * its PHYSICAL name and reported as written.
 * why: CONTRIBUTING.md#a-declaration-jsdom-drops-leaves-no-subject-to-count */
export function droppedDecls(from, css, classes) {
  const out = [];
  const scan = (text) => {
    for (const [raw, body, holdsBlock] of topLevelBlocks(text)) {
      const selector = raw.replace(/\s+/g, ' ');
      const group = selector.startsWith('@');
      // A conditional group, whose rules carry the selectors this scopes by.
      if (group && holdsBlock) { scan(body); continue; }
      const scopable = !!selector && !group && !holdsBlock && !selector.includes(UNRESOLVED);
      if (scopable && !isSvgSubject(selector, classes)) continue;
      const decls = blankStrings(body);
      for (const props of [SIZING_PROPS, CLAMP_PROPS]) {
        for (const [, prop, value] of decls.matchAll(declRe(props))) {
          const decl = value.trim();
          if (decl.includes(UNRESOLVED)) continue;
          const lower = prop.toLowerCase();
          if (!survivesParsing(LOGICAL_DIMS.get(lower) ?? lower, decl)) {
            out.push(`${from}: ${selector} { ${prop}: ${decl} }`);
          }
        }
      }
    }
  };
  scan(stripComments(css));
  return out;
}

export const DROPPED_REFUSAL = 'a rule that decides an icon sizes it with a value jsdom cannot '
  + 'parse, so the declaration is gone from the CSSOM these gates measure and the rule reads as if '
  + 'it sized nothing. Nothing else notices: it contributes no subject, so the count that would '
  + 'catch a rule leaving coverage sits exactly where it was. The rule still applies in a browser, '
  + 'measured by nobody. Write the size in a form jsdom parses, or teach the gate to measure it '
  + 'somewhere layout exists. Where the name above is not a rule this could scope — an at-rule '
  + 'holding declarations, a rule with a rule nested inside it, a selector computed at render '
  + 'time — it could not tell an icon from anything else and asked regardless; see droppedDecls().';

export const BLIND_REFUSAL = 'a surface writes a sizing rule whose selector or value is computed '
  + 'at render time. The gate substituted a placeholder for it, so it cannot tell whether it sizes '
  + 'an icon and cannot measure it if it does. Teach resolveInterpolations().';

export const CLAMPED_BLIND_REFUSAL = 'a surface clamps a size with a value computed at render '
  + 'time. jsdom drops a declaration it cannot parse, so the clamp test reads a sheet this '
  + 'declaration is no longer in, and the raw text is the only place it survives. Teach '
  + 'resolveInterpolations() and the two of them can then say whether this clamp lands on an icon '
  + '— and if it does, that test refuses it, because no gate measures anything about a clamp. The '
  + 'argument is in CLAMP_REFUSAL.';

/* One attribute selector at the head of what is left of a compound. Every
 * operator is satisfied by setting the attribute to the value written, so they
 * take one code path; a case-insensitivity flag (`[a="v" i]`) does not match and
 * is refused rather than built wrong. */
const ATTR = /^\[\s*(-?[_a-zA-Z][\w-]*)\s*(?:[~|^$*]?=\s*("[^"]*"|'[^']*'|[^\s\]]*)\s*)?\]/;

/* Pseudo-classes naming a STATE of the element. jsdom has no pointer, no focus
 * and no navigation, so none can be mounted at all, and pseudo-elements go with
 * them. This list decides nothing about coverage — a selector reaching it is
 * refused in whichever case it is written — only WHICH refusal the reader gets,
 * and a pseudo-class name folds case, so `:HOVER` fell through to the words kept
 * for a shape nobody taught this builder. */
const STATE_PSEUDO = /^:(?:hover|active|focus|focus-visible|focus-within|target|link|visited|checked|disabled|enabled|indeterminate|default|placeholder-shown|autofill|user-invalid|user-valid)$/i;

/* Pseudo-classes naming the element's POSITION among its siblings. This builder
 * gives each compound one element and no siblings, so it cannot place a subject
 * at a position — buildable by padding the parent, and not built. */
const POSITION_PSEUDO = /^:(?:first-child|last-child|only-child|first-of-type|last-of-type|only-of-type|nth-child|nth-last-child|nth-of-type|nth-last-of-type|empty|scope)$/i;

/* One compound as the element it describes: a tag name, the classes and ids and
 * attributes on it, and whether it is the document element. Anything this cannot
 * account for gives null, and mount() turns that into a refusal shaped to what
 * it found. `:root` is stripped from the front, where every rule in this repo
 * writes it, and read in any case, a pseudo-class name folding case — matched
 * lower case only, `:ROOT[data-theme="light"] .ui-nav__ic svg` came back refused
 * as an untaught shape, which is a red on correct CSS. */
function parseCompound(part) {
  const out = { tag: '', classes: [], attrs: [], root: false };
  let rest = part;
  if (/^:root/i.test(rest)) { out.root = true; rest = rest.slice(5); }
  const tag = rest.match(/^-?[_a-zA-Z][\w-]*/);
  if (tag) { out.tag = tag[0]; rest = rest.slice(tag[0].length); }
  while (rest) {
    const cls = rest.match(/^\.(-?[_a-zA-Z][\w-]*)/);
    const id = rest.match(/^#(-?[_a-zA-Z][\w-]*)/);
    const attr = rest.match(ATTR);
    if (cls) out.classes.push(cls[1]);
    else if (id) out.attrs.push(['id', id[1]]);
    else if (attr) out.attrs.push([attr[1], (attr[2] ?? '').replace(/^(["'])([\s\S]*)\1$/, '$2')]);
    else return null;
    rest = rest.slice((cls ?? id ?? attr)[0].length);
  }
  return out;
}

/* `isLeaf` tells the two `:is()` shapes apart, and they are different problems.
 * On the leaf the pseudo names the ICON — `.a :where(svg)`. In front of it it
 * names an ANCESTOR — `:is(.ui-btn, .ui-chip) svg` — where the icon is the plain
 * `svg` at the end, and that is the commoner shape by far. */
const refuse = (part, sel, isLeaf) => {
  const pseudo = part.match(/::?[-\w]+/)?.[0] ?? '';
  let why = 'This builds a chain of compounds out of tag names, classes, ids and attributes, and '
    + 'nothing else, so it cannot make an element this one would match. Write the rule in a shape '
    + 'it can mount, or teach it this shape.';
  if (/:(?:is|where|matches)\(/i.test(part) && isLeaf) {
    why = 'The two halves of this machinery are meant to disagree here: compoundIsSvg() reads an '
      + 'icon named inside :is() or :where() as the icon rule it is, and this builder stops short '
      + 'of it, so you get a refusal rather than a rule that leaves coverage in silence. Building '
      + 'it would mean choosing one alternative out of the argument list, which the argument\'s own '
      + 'complex selectors make more than a pseudo taken off.';
  } else if (/:(?:is|where|matches)\(/i.test(part)) {
    why = 'This one names an ancestor of the icon, not the icon — the icon is the compound at the '
      + 'end, and it is recognised. What stops here is the ancestor: this gives each compound one '
      + 'element, and an :is() offers a list of things that element could be, so building it means '
      + 'choosing an alternative out of the argument list, which the argument\'s own complex '
      + 'selectors and attribute selectors make more than a pseudo taken off. Name the ancestor '
      + 'with a plain selector, or write one rule per alternative.';
  } else if (pseudo.startsWith('::') || STATE_PSEUDO.test(pseudo)) {
    why = 'A state or a pseudo-element is not a shape teaching reaches: jsdom has no pointer to '
      + 'hover with and no box for a pseudo-element, so an icon sized in one is unmeasurable here '
      + 'rather than merely unmounted. Measure it somewhere layout and input exist, or size the '
      + 'icon in a rule that is not state-scoped.';
  } else if (POSITION_PSEUDO.test(pseudo)) {
    why = 'This gives each compound one element and no siblings, so it cannot put the subject at a '
      + 'position. That is buildable — pad the parent until the position is right — and not built, '
      + 'because nothing here sizes an icon that way. Teach it, or select the icon by a class.';
  }
  return new Error(`unsupported selector part: ${part} (in ${sel}). ${why}`);
};

/* The smallest DOM satisfying a descendant selector such as
 * `:root[data-theme="light"] .ui-nav__ic svg`. Anything a compound can carry
 * that this cannot set on an element throws, and the caller checks the mounted
 * element against the selector afterwards. The whole selector is parsed before
 * anything is built, so a refusal leaves the document as it found it — a `:root`
 * compound is set on <html> rather than created, and every gate shares one
 * document across every subject. */
export function mount(document, sel, classes) {
  const parts = compoundsOf(sel).map(([comb, part], i, all) => {
    const spec = parseCompound(part);
    if (!spec) throw refuse(part, sel, i === all.length - 1);
    return [comb, spec, part];
  });
  /* `:root` is the document element, so the only chains it can head are a
   * descendant of <html> or a child of it. The two that no document holds are
   * refused here in their own words: routed through refuse() they read as a
   * shape this builder was never taught, which it has done since badge.css. */
  const rootAt = parts.findIndex(([, spec]) => spec.root);
  if (rootAt > 0) {
    throw new Error(`unplaceable selector: ${sel}. :root is the document element, and every element `
      + 'this builder makes hangs inside it, so nothing can stand in front of it. Take the '
      + 'compounds ahead of :root off, or name that ancestor by a class.');
  }
  if (rootAt === 0 && parts.length > 1 && !' >'.includes(parts[1][0])) {
    throw new Error(`unplaceable selector: ${sel}. :root is the document element and the document `
      + 'element has no siblings, so no document matches this rule. Write the icon\'s ancestor as a '
      + 'descendant or a child of :root.');
  }
  /* Everything goes inside one container, which is what the caller removes. A
   * sibling combinator at the top of the chain builds two elements, so "the last
   * child of body" stops being the whole of what was mounted. */
  const top = document.body.appendChild(document.createElement('div'));
  const html = document.documentElement;
  const was = new Map();
  const keep = (name) => { if (!was.has(name)) was.set(name, html.getAttribute(name)); };
  /* Putting <html> back is the container's own job: every gate cleans up with
   * `top.remove()` in a finally and shares one document, so a theme left behind
   * is the theme every later subject is measured in. */
  const drop = top.remove.bind(top);
  /* Everything mounted outside `top`, only ever the head of a chain hanging
   * straight off <html> — the container would otherwise stand between it and the
   * document element and the rule would stop matching. */
  const outside = [];
  top.remove = () => {
    for (const node of outside) node.remove();
    for (const [name, value] of was) {
      if (value === null) html.removeAttribute(name);
      else html.setAttribute(name, value);
    }
    drop();
  };
  let el = null;
  let placed = null;
  for (const [comb, spec] of parts) {
    if (spec.root) {
      // `:root` matches the document element and nothing this could create, so
      // it is set rather than built — and the chain hangs where it always does,
      // which is inside <html> already.
      if (spec.classes.length) keep('class');
      for (const cls of spec.classes) html.classList.add(cls);
      for (const [name, value] of spec.attrs) { keep(name); html.setAttribute(name, value); }
      el = html;
      continue;
    }
    const isSvg = spec.tag === 'svg' || (!spec.tag && spec.classes.some((c) => classes.has(c)));
    const node = isSvg
      ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      : document.createElement(spec.tag || 'div');
    for (const cls of spec.classes) node.classList.add(cls);
    for (const [name, value] of spec.attrs) node.setAttribute(name, value);
    /* A child combinator builds the same nesting a descendant one does; the two
     * sibling combinators put the element beside its predecessor instead. The
     * one place child and descendant part company is straight after `:root`:
     * `:root > .sbc svg` needs `.sbc` to be a child of <html> itself, so it is
     * mounted there and taken down by top.remove(). */
    const parent = placed === null
      ? (rootAt === 0 && comb === '>' ? html : top)
      : ('+~'.includes(comb) ? placed.parentNode : placed);
    parent.appendChild(node);
    if (parent === html) outside.push(node);
    placed = node;
    el = node;
  }
  return { el, top };
}

/* What the declared value resolves to in this element's own context. Comparing
 * computed px against the declared literal would call a winning rule written
 * `1.0625rem` a failure and blame the reset for it. */
export function resolve(getComputedStyle, el, dim, value) {
  const probe = el.cloneNode(false);
  /* The probe is a clone, so it matches every rule the real element matches, and
   * its declaration is `!important` so an `!important` reset — the one remaining
   * way to reintroduce #148 now the reset sits at (0,0,1) — cannot win on the
   * probe and read as agreement. Belt-and-braces: without() catches that
   * regression on its own. What the flag buys is which assertion fires — with it
   * a kit-gate failure names the rule that won, without it it reads "changes
   * nothing" and sends the reader after a redundant rule. */
  probe.style.setProperty(dim, value, 'important');
  el.parentNode.appendChild(probe);
  const got = getComputedStyle(probe).getPropertyValue(dim);
  probe.remove();
  return got;
}

/* What this element computes to with `rule`'s own declaration of `dim` taken
 * away, the rule put back before returning — how a gate proves its comparison
 * was capable of failing. .ui-badge declares 11px and the reset's 1.1em over
 * badge.css's font-size: 10px is also 11px, so that assertion agreed with the
 * winner and the loser alike.
 *
 * It only works because resolve() ran first: jsdom throws its computed-style
 * cache away when the DOM changes, never when a declaration inside a rule does,
 * and what clears it here is resolve() appending a probe and removing it. Call
 * the two in the other order and every check reports `gone` equal to `expected`
 * — a false red on every subject. */
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
