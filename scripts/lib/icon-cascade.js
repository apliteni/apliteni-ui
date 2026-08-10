/* Shared machinery for the three icon-size gates.
 *
 *   src/styles/icon-size.test.js       — the rules inside the package's own stylesheets
 *   scripts/icon-size-surfaces.test.js — the rules on the surfaces the kit renders
 *                                        (the landing site, the Storybook stories
 *                                        and the chrome under .storybook/)
 *   scripts/icon-size-react.test.js    — the rules in the CSS under react/src, in
 *                                        stylesheets and <style> blocks alike
 *
 * All three ask the same question — does the rule that sizes this icon actually
 * win the cascade against the reset in src/styles/base.css — and all three
 * answer it the same way: mount an element matching the rule's selector against
 * the real kit stylesheets and read getComputedStyle back. Only the source of
 * the rules differs, and each gate keeps a subject count of its own so a rule
 * leaving one sweep cannot be cancelled out by a rule arriving in another. This
 * file is the shared half, so no gate can drift into measuring something subtly
 * different from the others.
 *
 * It lives under scripts/ on purpose. `files` in package.json excludes test
 * files from src/ but nothing else, so a plain .js helper under src/ would ship
 * to consumers; scripts/ is outside the tarball entirely, and this one does not.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

/* The two dimensions every contest here is decided in. A rule can name either of
 * them in two spellings, and the second spelling is why this file has a
 * normalization step: jsdom keeps `inline-size` in a cascade of its own that
 * `width` never enters, so a logical declaration measured as written wins every
 * contest it is in, including the ones a browser makes it lose.
 * foldLogicalDims() rewrites it onto its physical counterpart before anything is
 * measured. The argument is under TWO SPELLINGS, ONE CONTEST in the header of
 * src/styles/icon-size.test.js. */
export const DIMS = ['width', 'height'];
export const LOGICAL_DIMS = new Map([['inline-size', 'width'], ['block-size', 'height']]);

/** Both spellings, for the checks that read a rule before it has been folded. */
export const SIZING_PROPS = [...DIMS, ...LOGICAL_DIMS.keys()];

/* Sizing an icon by clamping it, which no gate measures anything about — the
 * argument is in CLAMP_REFUSAL below. Each gate asserts this list lands on no
 * icon, which is how a clamp on an icon reaches a reader instead of passing in
 * silence. Both spellings again, for the same reason as above:
 * `min-inline-size` is `min-width` while the writing mode is horizontal. */
export const CLAMP_PROPS = [
  'min-width', 'max-width', 'min-height', 'max-height',
  'min-inline-size', 'max-inline-size', 'min-block-size', 'max-block-size',
];

/* A declaration of one of `props`, matched in the raw text of a stylesheet
 * rather than in the CSSOM — which is the only place some of them survive, since
 * jsdom drops a declaration whose value it cannot parse and a surface that
 * computes its value at render time hands it exactly that.
 *
 * Anchored on `;` or `{` so that `min-width` cannot be read as `width`. That
 * anchor is the whole reason a caller can ask about SIZING_PROPS and CLAMP_PROPS
 * separately and get two different answers, so scripts/lib/icon-cascade.test.js
 * asserts it rather than trusting it. Fresh each call because the `g` flag makes
 * lastIndex state a shared regex would carry between callers.
 *
 * Case-insensitive because CSS property names are. `WIDTH: 40px` sizes an
 * element in every browser and cssstyle stores it lower-cased, so a scan that
 * only matched lower case read a file the CSSOM did not have — and the guards
 * below, which exist to catch the two of them disagreeing, were the ones blinded
 * by it. The anchor survives the flag: `MAX-WIDTH` still cannot read as `width`.
 *
 * The name comes back spelled as the file spells it, which is right for a report
 * and wrong for anything else. A caller that KEYS on it, or hands it to
 * cssstyle, has to lower-case it first — getPropertyValue() is case-sensitive
 * even though setProperty() is not, so `MAX-WIDTH` asked as written reads back
 * empty and looks like a value jsdom threw away. */
export const declRe = (props) => new RegExp(
  `(?:^|[;{])\\s*(${props.join('|')})\\s*:\\s*([^;}]*)`, 'gi');

/* CSS with its comments taken out, for every scan that reads raw text rather
 * than the CSSOM. A commented-out `width: 20px` is not a declaration, and a
 * comment warning people off `-webkit-writing-mode` is not one either — read as
 * text, both fire guards on a file that is perfectly fine. The patterns above
 * also stop at `;` or `}`, so a comment sitting between `{` and the first
 * declaration hides that declaration from them entirely. */
export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/* The same text with the CONTENTS of every string replaced by spaces — the
 * quotes left where they are, and every offset unmoved. A string is content and
 * not CSS: the data URI in src/styles/input.css can hold
 * `style='height:12px;width:12px'` and a `content` can hold `{ width: 5px`, and
 * read as declarations both make a gate refuse a file a browser is perfectly
 * happy with. A gate that reds on correct code gets switched off.
 *
 * Every scan below that reads raw CSS goes through it first, bar one:
 * kitSheetNames() matches on the quoted sheet name itself, which blanking
 * erases, and the file it reads is nothing but @import lines. A scan that needs
 * the text of a string as well as its position — importsIn() — matches here and
 * reads there, which the preserved offsets are what allow.
 *
 * It walks with the same scanner the selector splits use, so one place knows
 * where a string starts and ends rather than one per caller. Comments come out
 * first everywhere this is called, which leaves one shape unhandled: a comment
 * opener written INSIDE a string, which stripComments() cuts from, taking real
 * CSS with it. That was true before this and is true after it. */
export const blankStrings = (css) => {
  let out = '';
  scanTop(css, (ch, _top, _i, inString) => { out += inString ? ' ' : ch; });
  return out;
};

/* Build output and vendored code, skipped by directory name. Two of these exist
 * on a dev machine and never in CI, which is the dangerous shape: site/public/
 * is gitignored, and site/build.mjs folds the entire built Storybook into
 * site/public/storybook/. A developer who has run a full build would otherwise
 * have every sweep below read that vendor bundle — harvesting `<svg class="…">`
 * out of it and deriving a different class set than CI derives from the same
 * commit. This repo has already shipped one local-green/CI-red defect; a walk
 * that reads untracked build output is how you get the next one. */
export const SKIP_DIRS = new Set(['node_modules', 'dist', 'public', 'storybook-static']);

/* Every file under `dir`, depth-first, build output excluded. The pruning is by
 * NAME and so applies at any depth, including inside a directory of hand-written
 * source; pass `skipped` an array and every directory refused lands in it, so a
 * caller sweeping somewhere build output has no business being can say so
 * instead of quietly reading less. */
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
 * Both spellings of the attribute, because the React workspace writes JSX and
 * JSX spells it `className`. A class this returns nothing for is a class every
 * rule targeting it stops being measured against, silently — that is how
 * .ui-fbck was missed in the kit — so reading only `class=` would have taken a
 * React icon rule out of coverage the moment one was written.
 *
 * `dirs` are scanned depth-first; `exts` says which files count. Test files are
 * always skipped, in every extension the repo tests in — a class that only a
 * test writes onto an svg is not a class the kit renders. */
export function svgClassSet(dirs, exts = ['.js']) {
  const found = new Set();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const p of walk(dir)) {
      const name = path.basename(p);
      if (!exts.some((e) => name.endsWith(e))) continue;
      if (/\.test\.[cm]?[jt]sx?$/.test(name)) continue;
      const text = readFileSync(p, 'utf8');
      for (const m of text.matchAll(/<svg[^>]*\s(?:className|class)="([^"${]+)"/g)) {
        for (const c of m[1].trim().split(/\s+/)) found.add(c);
      }
      for (const m of text.matchAll(/\bicon\(\s*'[^']*'\s*,\s*'([^']+)'/g)) {
        for (const c of m[1].trim().split(/\s+/)) found.add(c);
      }
    }
  }
  return found;
}

/* Walk a selector at the top level, stepping over anything inside () or [], and
 * call `at` for every character that is not. Every split below is built on this,
 * because the characters that separate a selector are the same characters an
 * argument list is full of: the `>` in `:has(> .ui-table)` separates nothing and
 * the comma in `:where(ul, ol)` does not start a second selector.
 *
 * Quoted strings are stepped over as well, and for a sharper reason than the
 * separators: `[data-x="]"]` closes no bracket, so counting that `]` takes the
 * depth below zero and NOTHING after it is ever top level again. The leaf of
 * `.a[data-x="]"] svg` stops being `svg`, the rule stops being an icon rule, and
 * it leaves coverage in silence — no error, and no count moves to say so. */
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
 * one. Every caller that used to split on ',' goes through this, since the
 * halves that split produces out of a functional pseudo are not selectors and
 * cannot be reasoned about as if they were. */
export function selectorParts(selectorText) {
  const parts = [''];
  scanTop(selectorText, (ch, top) => {
    if (top && ch === ',') parts.push('');
    else parts[parts.length - 1] += ch;
  });
  return parts.map((s) => s.trim()).filter(Boolean);
}

/* One complex selector split into its compound selectors, each paired with the
 * combinator in front of it. `.a>svg` and `.a > svg` are the same two compounds,
 * which is the point: read as whitespace-separated tokens the first is one
 * token, `svg` is not its leaf, and the rule that decides the icon looks like a
 * rule about nothing. */
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
 * `:has()` and `:not()` are deliberately not among them: the first is about a
 * different element and the second says what the subject is not, so neither
 * makes the subject an icon however its argument reads.
 *
 * Which is why only the TOP level of the compound is collected. An `:is()`
 * nested inside one of the excluded two is that pseudo's argument, not the
 * subject's: `.a:not(:is(svg))` selects everything that is not an svg, and
 * harvesting the `:is()` out of it turned that into an icon rule — a subject the
 * gate then tried to mount, which hard-errors on the `:`. A red on correct CSS,
 * from the one exclusion this function is built around. */
function alternativesIn(compound) {
  const top = new Set();
  scanTop(compound, (_ch, isTop, i) => { if (isTop) top.add(i); });
  const out = [];
  const re = /:(?:is|where|matches)\(/g;
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
 * The second shape is not cosmetic: .ui-fbck is the largest icon in the kit and
 * an earlier gate that collected only selectors ending in `svg` was blind to it.
 * Outside the package the same shape appears as `.term__copy .ic { width: 15px }`
 * in site/index.html — `ic` is a class written onto the svg tag itself.
 *
 * Asked of the leaf compound, and asked recursively through `:is()`/`:where()`,
 * so the shape a selector is written in decides nothing. `.rx-tbl>svg` and
 * `.rx-tbl+svg` select an svg exactly as `.rx-tbl svg` does; answering "not an
 * icon" for them left a rule that beats the reset with no gate over it and no
 * complaint either, which is the one failure this machinery is for.
 *
 * `.a :where(svg)` selects one too, and is recognised here — but mount() cannot
 * build an element for it and refuses, so the rule is reported rather than
 * measured. That is the two halves of this file disagreeing on purpose. The
 * alternative is answering "not an icon", which is the silence above; a refusal
 * naming the selector sends the reader to the rule instead. Teaching mount() the
 * shape would mean choosing one alternative out of the argument list and
 * building it, which the argument's own complex selectors and attribute
 * selectors make more than a pseudo taken off. */
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
 * at-rules it sits under — innermost first, so a refusal can name them in the
 * order a reader unwraps them.
 *
 * Depth is the point. jsdom parses `@layer x { @media screen { … } }` happily
 * and applies none of it, so a rule buried two levels down contributes no
 * subject, loses no contest and — until this recursed — drew no complaint
 * either. Style rules are descended into as well, because CSS nesting puts a
 * rule under a rule the same way. */
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

/* What a gate says when a stylesheet turns the axes the fold assumes. `what`
 * names the declaration, since the two spellings are found in different places
 * and only one of them can name the rule it sits in. */
/* Whether a declared writing mode leaves the inline axis horizontal. Only the
 * modes that turn it break the fold, and `horizontal-tb` is the mode the fold
 * assumes — refusing it would tell a reader to delete the declaration that makes
 * this gate correct, and a gate that reds on correct code gets switched off.
 * `initial` is horizontal-tb; `inherit` and `unset` name a mode set somewhere
 * this cannot see, so they are refused with the rest. */
const turnsTheAxes = (mode) => !!mode && !['horizontal-tb', 'initial'].includes(mode.trim().toLowerCase());

const writingModeRefusal = (name, what) => `${name}: ${what}. This gate folds inline-size onto `
  + 'width and block-size onto height, which holds only while every icon is laid out '
  + 'horizontally. Take the declaration out, or teach the gate to fold along the writing mode '
  + 'each icon is actually in.';

/* Rewrite `inline-size` onto `width` and `block-size` onto `height` in every
 * rule of `sheet`, so a logical declaration competes in the cascade jsdom does
 * model. Every gate runs this over every sheet of a document as it builds it,
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
/* The text a sheet was parsed from, which two of the checks below have no other
 * source for: jsdom drops `-webkit-writing-mode` and deduplicates a repeated
 * declaration before either reaches the CSSOM. A sheet with no <style> element
 * behind it has no such text, and reading that as an empty string turns both
 * checks off — a constructed CSSStyleSheet has a null ownerNode and a <link>
 * has an element whose textContent is '', so each folds with no complaint
 * whatever it carries. Every gate here builds its document out of <style>
 * elements, which is what makes that a refusal rather than a limitation. */
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
 * the members of a pair and nowhere else, which is what makes the refusal below
 * as narrow as it is. */
const AXES = [...LOGICAL_DIMS].map(([logical, physical]) => [physical, logical]);

/* Every top-level block of a stylesheet's raw text, as [selector, body] — which
 * is exactly the set foldLogicalDims() rewrites, and the reason the check below
 * can be as narrow as it is.
 *
 * A scan rather than a regex, because both halves are things `\{([^{}]*)\}` gets
 * wrong. A `}` inside a string closes a block that is still open, so everything
 * after it in that block goes unread — silently, and in the direction that
 * passes. And the selector taken as "whatever precedes the brace" lands inside a
 * string for `content: "{"`, or swallows the `@import` line above the rule, so a
 * refusal names something the file does not contain.
 *
 * Blocks nested inside another — inside `@media`, or under CSS nesting — are not
 * reported at all: they are at brace depth 1 and the fold never reaches them.
 * Each block says whether it HOLDS one, since the fold skips those too and a `{`
 * looked for in the body text would find the one in `content: "{"`. */
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

/* A top-level block the CSSOM stops describing — the shapes where what every
 * gate measures is not what a browser renders.
 *
 * cssstyle keeps a repeated property once, in its FIRST position carrying its
 * LAST value and its LAST importance. That bookkeeping is what every gate here
 * reads, and it is right whenever it still describes the file. There are two
 * ways it stops, and they are not the same failure.
 *
 * THE WINNER. A browser takes the important declaration wherever it sits, and
 * only then the last one, so the winner of
 *
 *   .ui-btn svg { width: 40px !important; width: 16px }
 *
 * is 40px. The CSSOM holds 16px, not important, because that is the last
 * declaration — and the gate mounts an element, reads 16px back, agrees with
 * itself and reports the rule as measured while the browser renders something
 * else. No logical twin is anywhere near it and none is needed: the measurement
 * is already wrong before the fold is asked anything. That is why this is scoped
 * to the measurement rather than to the fold, and it is the whole of #148 —
 * a rule deciding an icon's size with the thing meant to notice staying quiet —
 * rebuilt inside the fix for it.
 *
 * The line is exactly this: a repeat is misread when SOME declaration of the
 * property is important and the LAST one is not. Nothing else about the repeat
 * matters. Working through the cases —
 *
 *   width: 100%; width: fit-content      no importance anywhere, last wins in
 *                                        both, so the fallback idiom is read
 *                                        correctly and must stay green
 *   width: 10px; width: 12px !important  importance arrives and stays; the last
 *                                        declaration IS the winner
 *   width: 10px !important; width: 12px  importance drops; a browser takes 10px
 *                                        and the CSSOM says 12px — refused
 *   10px !imp; 12px; 14px                the winner is 10px, the CSSOM says 14px
 *   10px; 12px !imp; 14px                the winner is 12px, the CSSOM says 14px
 *   10px; 12px !imp; 14px !imp           the winner is the last one — read right
 *
 * The same holds for `height` and for both logical spellings, since cssstyle
 * deduplicates all four the same way, so all four are asked. Value equality is
 * not a way out: `width: 16px !important; width: 16px` computes the same number
 * and still loses the importance, which is the one thing that decides a contest
 * against an `!important` reset.
 *
 * How the file SPELLS the property is a separate question, and one this scan
 * used to get wrong. `WIDTH` and `width` are one property to CSS and one entry
 * in the CSSOM, so a capital walked past a check that only matched lower case
 * and handed every gate the losing declaration — #148 again, arriving through
 * the spelling. declRe() now reads the name the way CSS does and this keys on it
 * lower-cased, so the two spellings are one repeat here as they are one property
 * there. Two spellings are still outside what it can see, and nothing in this
 * repo writes either. An ESCAPED name, `wid\74 h`, is `width` to a browser and
 * nothing at all to jsdom, which throws the declaration away before the CSSOM
 * has it — so there is no repeat left to refuse and the gate measures whichever
 * declaration survived. A name led by a NO-BREAK SPACE or a BOM goes the other
 * way: a browser drops it, jsdom drops it, the two agree, and the scan counts it
 * regardless, because `\s` in a JavaScript regex covers characters CSS
 * whitespace does not. The first under-reads; the second would refuse a block
 * that is fine.
 *
 * THE ORDER, which is about the fold and needs the twin. In
 *
 *   .a { width: 10px; inline-size: 33px; width: 12px }
 *
 * `width` sits on both sides of its twin, so keeping it in its first position
 * moves it in front of a declaration the file puts it behind. A browser renders
 * 12px and the fold gives 33. Every other arrangement survives: with all the
 * repeats on one side of the twin, whichever side, the deduplicated order is
 * still the file's, and the fold picks the winner a browser picks.
 *
 * Both are wrong numbers rather than errors, which every gate would report as a
 * pass, and nothing in the CSSOM can recover the truth — rule.cssText is
 * serialised from the same deduplicated block. So this refuses rather than
 * guessing.
 *
 * Neither check asks whether the rule sizes an icon, so a repeat in a rule that
 * sizes nothing of the sort is refused with the rest. Telling the two apart
 * would mean handing this function the icon classes — which every gate derives,
 * but two of them derive after they have folded. Refusing is the safe direction,
 * and neither shape is CSS somebody writes on purpose: a declaration that a
 * browser can never take is dead either way. */
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
  /* And the same question of the sheet's raw text, because the CSSOM cannot
   * answer it alone. jsdom drops `-webkit-writing-mode` outright — the rule
   * carrying it reads as empty — and drops any value it does not recognise with
   * it, so the loop above sees nothing in either case. Every browser that
   * honours the prefixed spelling turns the axes exactly as the unprefixed one
   * does, which is what the fold cannot survive. */
  const raw = rawTextOf(sheet, name);
  const prefixed = blankStrings(raw)
    .match(/(?:^|[;{\s])(-[a-z]+-writing-mode)\s*:\s*([^;}]*)/);
  if (prefixed && turnsTheAxes(prefixed[2])) {
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

/* The selector the reset is written under, found by what makes it the reset
 * rather than by what it looks like.
 *
 * The reset and the rules measured against it can share a file, so provenance
 * alone cannot tell them apart — which is the hole this closes. A gate that
 * excluded base.css wholesale swallowed any component rule anybody wrote there,
 * and `.ui-nav__ic svg { width: 40px }` in that file was measured by nothing.
 *
 * So the reset is identified positively, and by the one thing only it does: it
 * sizes an icon with no class on it, no attribute and nothing around it. Every
 * component rule in the kit names a class, on the icon or on an ancestor, so a
 * bare <svg> matches none of them. That is the same icon the gate's own
 * bare-icon test measures, which is what makes this the reset's definition and
 * not a heuristic about its shape.
 *
 * Shape is what must not decide it. jsdom serialises `.x { svg { … } }` as
 * `& svg`, so "the rule with no class in it" reads a nested component rule as
 * the reset and drops it in silence. Nothing here reads a selector's parts:
 * rulesOf() refuses a nested rule by name before this can classify it, and the
 * question below is asked of an element.
 *
 * Asked per selector, since a selector list can hold the reset and a component
 * rule in one block, and asked only of the rules that SIZE an icon — `*` matches
 * a bare svg and decides nothing about it.
 *
 * Exactly one, and the count is the point. A second rule sizing a bare icon is
 * either a reset written twice or a rule like `svg:not([width])` at (0,1,1),
 * which out-ranks every `.ui-btn svg` in the kit from the one file whose rules
 * are not subjects — #148 arriving again with every gate green. Two rules
 * sharing one selector are one reset, since that is one rule split across two
 * blocks. */
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

/* Every @import in a stylesheet's raw text. An @import names a sheet that ships
 * to consumers and that no gate here opens: each one composes the files it finds
 * and nothing else, so the imported rules are measured only if that sheet is
 * itself one of them. src/index.css is the deliberate exception — it is nothing
 * but @imports, and the kit gate's sheet list is derived FROM them, so it is the
 * one sheet whose imports are already followed. */
/* Matched against the text with strings blanked, so `content: "@import zz"` is
 * not an import — but READ back out of the text as written, since the specifier
 * of a real @import is itself a string and blanking it would report a sheet with
 * no name. Blanking keeps every offset, which is what lets the two be different
 * texts. */
export const importsIn = (css) => {
  const text = stripComments(css);
  return [...blankStrings(text).matchAll(/@import\s+([^;]*)/dg)]
    .map(({ indices }) => text.slice(...indices[1]).trim());
};

/* The extensions a stylesheet is written under. The list is what lets the React
 * gate tell `import './DataTable.pcss'` — a sheet its *.css sweep would miss, and
 * the whole reason that guard exists — from `import './polyfills'`, which is a
 * TypeScript module and no concern of a sweep for stylesheets. */
const STYLE_EXTS = ['css', 'pcss', 'postcss', 'scss', 'sass', 'less', 'styl', 'stylus'];

/* Every stylesheet a source file imports by a RELATIVE path, however it binds
 * it: bare for the side effect, or to a name the way a CSS module is imported.
 * A query suffix — `?inline`, `?raw` — is kept on the specifier, since it is
 * part of what the bundler was asked for.
 *
 * Relative only. An import through a path alias (`@/styles/x.css`) resolves
 * through tsconfig or the bundler's config, neither of which this reads, so it
 * is not reported — and the gate's header says so rather than implying the
 * sweep covers it. */
export const styleImportsIn = (source) => [...source.matchAll(
  new RegExp(String.raw`^\s*import\s+(?:[^'"]*\bfrom\s+)?['"](\.[^'"]+\.(?:${STYLE_EXTS.join('|')})(?:\?[^'"]*)?)['"]`,
    'gm'))].map((m) => m[1]);

export const IMPORT_REFUSAL = 'a stylesheet imports another sheet, and no gate here follows it — '
  + 'each composes the files it finds and nothing else, so the imported rules ship unmeasured. '
  + 'Import the sheet from the component or the page instead, so it is a file the sweep finds, or '
  + 'teach the gate to follow @import.';

/* An interpolation no gate could resolve becomes this token. It is a valid CSS
 * identifier on purpose: substituting something invalid would make jsdom drop
 * the declaration, and a dropped icon rule is indistinguishable from a rule that
 * was never there. Kept as a marker so the gates can refuse it. */
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

/* The CSS an expression states outright. A template literal and a quoted string
 * both say it plainly; anything else — a call, a concatenation, a name from
 * another file — is handed back as an interpolation so it reaches UNRESOLVED
 * rather than silence. A string carrying a backslash goes the same way: `\7d` is
 * a CSS escape and `\\n` is a JS one, and reading it as either would put a
 * character in the CSS the file does not have. */
function literalCss(expr) {
  const text = expr.trim();
  const template = text.match(/^`([\s\S]*)`$/);
  if (template) return template[1];
  const quoted = text.match(/^'([^'\\]*)'$/) ?? text.match(/^"([^"\\]*)"$/);
  return quoted ? quoted[1] : `\${${text}}`;
}

/* A JSX expression container with its braces taken off. `.tsx` cannot write CSS
 * between the tags the way a template-literal story does — it writes
 * <style>{`…`}</style> — and handing those braces and backticks to a CSS parser
 * yields a block with no rules in it, which reads as a component with no CSS. */
function unwrapExpression(body) {
  const container = body.match(/^\s*\{([\s\S]*)\}\s*$/);
  return container ? literalCss(container[1]) : body;
}

/* The `__html` of every `<style dangerouslySetInnerHTML={{__html: …}} />`, with
 * the span each one occupies. That is THE React idiom for injecting a CSS
 * string, and the paired-tag pattern below cannot see it — a self-closing tag
 * has nothing between it and `</style>` but the rest of the file, which the
 * pattern would take in as CSS if a later block gave it a closing tag to reach.
 * So these are read first and blanked out of the source the pattern then scans.
 *
 * The expression is found by balancing brackets rather than by matching to the
 * first `}}`, because the CSS itself is full of braces. */
function dangerousStyles(source) {
  const found = [];
  const open = /<style\b[^<]*?dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*/g;
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

/** The CSS of every <style> block in a source file, resolved as far as it can be. */
export function styleBlocksOf(source) {
  const dangerous = dangerousStyles(source);
  let rest = source;
  for (const { at, to } of dangerous) rest = rest.slice(0, at) + ' '.repeat(to - at) + rest.slice(to);
  const paired = [...rest.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => ({ at: m.index, body: unwrapExpression(m[1]) }));
  return [...dangerous.map(({ at, expr }) => ({ at, body: literalCss(expr) })), ...paired]
    .sort((a, b) => a.at - b.at)
    .map(({ body }) => resolveInterpolations(body, source));
}

/* Everything in one block of CSS that a gate cannot see the whole of, split into
 * what it merely could not read and the clamps, which ask for something
 * different — a width nobody could resolve is a gap in resolveInterpolations and
 * nothing more, while a clamp is a shape no gate measures at all, so resolving
 * it is only the first half of the answer and the clamp test is the second.
 *
 * The raw text is asked as well as the parsed sheet, because the parsed sheet
 * cannot answer alone: `width: ${sizeOf(1)}px` becomes a value jsdom rejects, so
 * the declaration is simply gone from the CSSOM. Comments come out first — a
 * commented-out `width: 20px` is not a declaration, and the patterns start at
 * `{` or `;`, so a comment sitting in front of the first declaration in a block
 * hides that declaration from every one of them. Strings are blanked after
 * them, for the reason in blankStrings(): a surface interpolates into a data URI
 * as readily as into a size, and what comes out is an image. */
/* Whether an unresolved interpolation stands where a RULE or a DECLARATION would
 * be — `<style>${SHELL_CSS}</style>`, a `${SHARED}` after the last rule in a
 * block, `.a { ${DECLS} }`. Each of those can hold a rule that sizes an icon, and
 * each is invisible to the three scans in blindSpots(): the value and property
 * scans both need a `:` beside the marker, and the selector scan needs a `{`
 * after it.
 *
 * Asked by POSITION, because the question the guard used to ask — is the marker
 * here and did the sheet parse to no rules — is answered "no" by any one
 * parseable rule written beside the shell. That is the shared-shell refactor
 * itself: one ordinary rule next to `${SHELL_CSS}` and the block reads as fully
 * measured.
 *
 * A marker inside a declaration's VALUE is left alone, whatever the property. A
 * surface interpolates a colour or an image far more often than a size, and
 * refusing `background: ${theme.bg}` is a red on correct code. The sizing and
 * clamp properties are the ones that matter there, and blindSpots() scans them
 * by name.
 *
 * The text arrives with comments out and strings blanked, so every brace left in
 * it is a brace a CSS parser sees. */
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

/* Whether every statement in this text is an at-rule — which is what tells a
 * block cssom modelled nothing of from a block cssom could not read.
 *
 * `@property` and `@charset` reach the CSSOM as no rule at all, so a block that
 * holds one of them and nothing else parses to zero rules exactly as an empty
 * block does. Both are CSS a browser honours, and a gate that reds on correct
 * code gets switched off. Every other at-rule this repo could write is modelled
 * — @media, @supports, @layer, @font-face, @namespace, @import all become a rule
 * — so a block carrying one of those never reaches the caller's question.
 *
 * An at-rule nobody closed is not one of these: it reads to the end of the text
 * with its block still open, which is neither a shape a browser honours nor a
 * reason to go quiet, so it is answered no. So is anything that is not an
 * at-rule at all, which is the concatenated `' + CSS + '` the caller's refusal
 * exists for.
 *
 * The text arrives with comments out and strings blanked, so every brace and
 * every `;` left in it is one a CSS parser sees. */
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
  /* An interpolation nothing could resolve, standing where CSS would be —
   * `<style>${SHELL_CSS}</style>`, a `${SHARED}` after the last rule, a
   * `.a { ${DECLS} }`. Nothing was dropped from a count either, because the count
   * never rose: the block reads as a surface with no CSS in it, and the gate
   * would swear it had measured the page. The argument for asking by position
   * rather than by rule count is in standsWhereCssWouldBe(). */
  if (standsWhereCssWouldBe(text)) {
    blind.push(`${from}: an unresolved interpolation where a rule or a declaration would be`);
  }
  /* And a block that parsed to nothing at all. `'<style>' + CSS + '</style>'` in
   * a source hands this a fragment of JavaScript between the tags: no rules to
   * read, no marker to find, and every guard here quiet while the CSS it
   * concatenates ships and applies.
   *
   * An EMPTY block is not that. `<style></style>`, and one holding nothing but a
   * comment, parse to no rules because there are none, and a gate that reds on
   * correct code gets switched off. Nor is a block that is nothing but an
   * at-rule cssom models nothing of — see onlyAtRules(). Comments are already out
   * of `text` and strings are blanked, so what is left is what the parser was
   * handed. A marker in there is the guard above's to report, since it can say
   * what is actually wrong with it — one block drawing two refusals sends the
   * reader looking for two problems. */
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

/* One sheet, reused, for asking whether a declaration survives being parsed.
 * Built on first use and emptied after each question. A JSDOM per declaration
 * answers the same thing and costs about two seconds across the three gates — a
 * tax big enough to get the check deleted rather than fixed. */
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
 * parsed — the hole a subject count cannot see.
 *
 * jsdom keeps the declarations it understands and discards the rest without a
 * word, so `.zz svg { width: fit-content(20%) }` reaches the CSSOM as a rule
 * that sizes nothing. It contributes no subject; a count only moves when a
 * subject appears or disappears; so a rule added and dropped in the same breath
 * leaves the number exactly where it was, and the rule applies in a browser with
 * nothing watching it. All three gates ask it.
 *
 * The question is asked of the raw text, because the CSSOM is precisely where
 * the answer is missing, and each declaration is re-parsed on its own rather
 * than being looked for by value. `fit-content(20%)` and `anchor-size(width)`
 * are what jsdom drops today and the set grows every time CSS does, so a list of
 * values here would be out of date by the release after this one.
 *
 * ASKED OF THE RULES THAT DECIDE AN ICON, not of every rule in the sheet. What
 * jsdom drops has nothing to do with icons — `width: env(safe-area-inset-left)`
 * on a drawer, `height: CALC(1px + 2px)` on a toast — and refusing those is a
 * red on CSS somebody is going to write and be right to write. Over react/src,
 * two small files, asking everything cost nothing; over src/styles it is a wide
 * net across CSS with no icon anywhere near it. The dropped declaration is gone
 * from the CSSOM, so there is no rule object to ask — but topLevelBlocks()
 * yields the selector out of the raw text and isSvgSubject() answers from that.
 *
 * A CONDITIONAL GROUP IS DESCENDED INTO rather than read flat, because the
 * argument above holds at every depth and the code used to make it only at brace
 * depth 0. `@media` is a wrapper: the declarations under it belong to the rules
 * further in, and each of those has an element selector of its own to be scoped
 * by — bar a keyframe, whose `from` and `50%` name no element and so scope to
 * nothing, which is the right answer, since no icon's cascade runs through a
 * keyframe. Read flat, the block's selector was the at-rule, no selector
 * starting with `@` is an icon, and so every declaration inside was asked
 * about — which refused `width: env(safe-area-inset-left)` on a drawer in a
 * media query while allowing the same declaration one brace out. An icon inside
 * the group is still refused, and has to be: the declaration is gone from the
 * CSSOM, so rulesOf() reads that rule as sizing nothing and this is the only
 * thing that sees it.
 *
 * Three shapes are asked anyway, because scoping them is what would make them
 * silent: an at-rule holding declarations rather than rules, where there is
 * nothing further in to descend to and the prelude is not a selector; a rule
 * with a rule nested inside it, where the inner selector is relative to the
 * outer one and says nothing on its own; and a selector computed at render time,
 * where "not an icon" is a guess rather than an answer. Each is reported with
 * the ground it sits on named, which is coarser than a rule and still sends the
 * reader to the right place.
 *
 * A logical declaration is asked under its PHYSICAL name, which is not the name
 * the file spells. cssstyle waves `inline-size` through whatever the value, so
 * asked as written it always survives — and then foldLogicalDims() rewrites it
 * onto `width`, which refuses the value, and the rule ends up empty anyway. The
 * cascade every gate measures is the physical one, so that is the cascade the
 * declaration has to reach. It is REPORTED as written, since that is the
 * declaration the reader has to go and find.
 *
 * A value holding an unresolved interpolation is left alone: jsdom drops that
 * too, but blindSpots() already reports it and can say what is actually wrong
 * with it, and one rule drawing two refusals under two different messages sends
 * the reader looking for two problems. */
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

/* One attribute selector at the head of what is left of a compound. The
 * operators are all satisfied by setting the attribute to the value written —
 * `~=` on a single token, `^=`/`$=`/`*=` on the whole string — so they take one
 * code path. A case-insensitivity flag (`[a="v" i]`) does not match, which is the
 * safe direction: it is refused rather than built wrong. */
const ATTR = /^\[\s*(-?[_a-zA-Z][\w-]*)\s*(?:[~|^$*]?=\s*("[^"]*"|'[^']*'|[^\s\]]*)\s*)?\]/;

/* Pseudo-classes naming a STATE of the element. jsdom has no pointer, no focus
 * and no navigation, so none of them can be mounted at all — a limit of the
 * environment rather than a gap in this builder. Pseudo-elements go with them:
 * jsdom gives them no box. */
const STATE_PSEUDO = /^:(?:hover|active|focus|focus-visible|focus-within|target|link|visited|checked|disabled|enabled|indeterminate|default|placeholder-shown|autofill|user-invalid|user-valid)$/;

/* Pseudo-classes naming the element's POSITION among its siblings. This builder
 * gives each compound one element and no siblings, so it cannot place a subject
 * at a position — buildable in principle by padding the parent, and not built,
 * because nothing in the repo sizes an icon that way. */
const POSITION_PSEUDO = /^:(?:first-child|last-child|only-child|first-of-type|last-of-type|only-of-type|nth-child|nth-last-child|nth-of-type|nth-last-of-type|empty|scope)$/;

/* One compound as the element it describes: a tag name, the classes and ids and
 * attributes on it, and whether it is the document element. Anything this cannot
 * account for gives null, and mount() turns that into a refusal shaped to what it
 * found. `:root` is stripped from the front because that is where every rule in
 * this repo writes it. */
function parseCompound(part) {
  const out = { tag: '', classes: [], attrs: [], root: false };
  let rest = part;
  if (rest.startsWith(':root')) { out.root = true; rest = rest.slice(5); }
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

/* `isLeaf` is what tells the two `:is()` shapes apart, and they are different
 * problems. On the leaf the pseudo names the ICON — `.a :where(svg)` — and the
 * refusal is the two halves of this file disagreeing on purpose. In front of it
 * the pseudo names an ANCESTOR — `:is(.ui-btn, .ui-chip) svg` — where the icon
 * is the plain `svg` at the end, compoundIsSvg() had nothing to do with it, and
 * a reader sent there to read about an icon named inside `:is()` finds no such
 * thing in their selector. The second is the commoner shape by far. */
const refuse = (part, sel, isLeaf) => {
  const pseudo = part.match(/::?[-\w]+/)?.[0] ?? '';
  let why = 'This builds a chain of compounds out of tag names, classes, ids and attributes, and '
    + 'nothing else, so it cannot make an element this one would match. Write the rule in a shape '
    + 'it can mount, or teach it this shape.';
  if (/:(?:is|where|matches)\(/.test(part) && isLeaf) {
    why = 'The two halves of this machinery are meant to disagree here: compoundIsSvg() reads an '
      + 'icon named inside :is() or :where() as the icon rule it is, and this builder stops short '
      + 'of it, so you get a refusal rather than a rule that leaves coverage in silence. Building '
      + 'it would mean choosing one alternative out of the argument list, which the argument\'s own '
      + 'complex selectors make more than a pseudo taken off.';
  } else if (/:(?:is|where|matches)\(/.test(part)) {
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
 * `.ui-nav--side.is-collapsed .ui-nav__ic svg`, or
 * `:root[data-theme="light"] .ui-nav__ic svg`. Anything a compound can carry that
 * this cannot set on an element throws — and the mounted element is checked
 * against the selector afterwards, which is the catch-all for shapes this builder
 * gets subtly wrong.
 *
 * The whole selector is parsed before anything is built, so a refusal leaves the
 * document exactly as it found it. That matters more than it used to: a `:root`
 * compound is set on <html> rather than created, and every gate here shares one
 * document across every subject in the file. */
export function mount(document, sel, classes) {
  const parts = compoundsOf(sel).map(([comb, part], i, all) => {
    const spec = parseCompound(part);
    if (!spec) throw refuse(part, sel, i === all.length - 1);
    return [comb, spec, part];
  });
  /* `:root` is the document element, so the only chains it can head are the ones
   * a document can hold: a descendant of <html>, or a child of it. Both are built
   * below. The two that no document holds are refused here, and refused in their
   * own words — routed through refuse() they came back as "unsupported selector
   * part: :root", which reads as a shape this builder was never taught and sends
   * the reader off to teach it something it has done since badge.css. */
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
  /* Everything goes inside one container, which is also what the caller
   * removes. A sibling combinator at the top of the chain builds two elements
   * rather than nesting one inside the other, so "the last child of body" stops
   * being the whole of what was mounted. */
  const top = document.body.appendChild(document.createElement('div'));
  const html = document.documentElement;
  const was = new Map();
  const keep = (name) => { if (!was.has(name)) was.set(name, html.getAttribute(name)); };
  /* Putting <html> back is the container's own job, because every gate cleans up
   * with `top.remove()` in a finally and shares one document across every
   * subject. A theme left behind would be the theme every later subject is
   * measured in — green, and measuring the wrong contest. */
  const drop = top.remove.bind(top);
  /* Everything mounted outside `top`, which is only ever the head of a chain
   * hanging straight off <html> — see the child combinator below. It cannot go
   * inside the container, because the container would then stand between it and
   * the document element and the rule would stop matching. */
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
     * sibling combinators put the element beside its predecessor instead, which
     * `+` and `~` both match when it is the one that comes next.
     *
     * The one place the two combinators part company is straight after `:root`,
     * where the descendant form is satisfied by the container inside <body> and
     * the child form is not — `:root > .sbc svg` needs `.sbc` to be a child of
     * <html> itself, so it is mounted there and taken down by top.remove(). */
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
   * `!important` on base.css's two reset declarations fails the kit gate and the
   * surfaces gate by the same counts either way — 56 and 15, the React gate
   * having no subject to fail — but with the flag every kit-gate failure reads
   * "the cascade gives 110px", naming the rule that won, and without it they
   * read "changes nothing", which describes a symptom and sends the reader
   * looking for a redundant rule rather than an important one. */
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
 * asserting non-vacuity is what stops the next instance needing to be.
 *
 * It only works because resolve() ran first, and that is not obvious from
 * either function. jsdom caches an element's computed style and throws the cache
 * away when the DOM changes, never when a declaration inside a rule does — so
 * this reads the same element the caller already measured and would hand back
 * the cached answer. What clears it is resolve() appending a probe and removing
 * it again. Call the two in the other order, or drop resolve() as redundant once
 * `want` is a px literal, and every one of these checks reports `gone` equal to
 * `expected`: a false red on every subject, telling the reader a working rule is
 * redundant and should go. Measured on `.a svg { width: 33px }` under the reset:
 * with resolve(), gone is 110px and the check passes; without it, gone is 33px
 * and it fails. */
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
