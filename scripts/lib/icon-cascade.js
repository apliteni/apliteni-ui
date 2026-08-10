/* Shared machinery for the three icon-size gates.
 *
 *   src/styles/icon-size.test.js       — the rules inside the package's own stylesheets
 *   scripts/icon-size-surfaces.test.js — the rules on the surfaces the kit renders
 *                                        (the landing site, the Storybook stories)
 *   scripts/icon-size-react.test.js    — the rules in the React workspace's own
 *                                        stylesheets under react/src
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
 * lastIndex state a shared regex would carry between callers. */
export const declRe = (props) => new RegExp(
  `(?:^|[;{])\\s*(${props.join('|')})\\s*:\\s*([^;}]*)`, 'g');

/* CSS with its comments taken out, for every scan that reads raw text rather
 * than the CSSOM. A commented-out `width: 20px` is not a declaration, and a
 * comment warning people off `-webkit-writing-mode` is not one either — read as
 * text, both fire guards on a file that is perfectly fine. The patterns above
 * also stop at `;` or `}`, so a comment sitting between `{` and the first
 * declaration hides that declaration from them entirely. */
export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

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
      if (ch === '\\' && i + 1 < sel.length) { at(ch, false, i); i += 1; at(sel[i], false, i); continue; }
      if (ch === quote) quote = '';
      at(ch, false, i);
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; at(ch, false, i); continue; }
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    at(ch, depth === 0 && !'()[]'.includes(ch), i);
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

/* A top-level block whose two spellings of one axis reach the fold in an order,
 * or with an importance, the file does not declare — the one shape the fold
 * cannot resolve.
 *
 * cssstyle keeps a repeated property once, in its FIRST position carrying its
 * LAST value and its LAST importance. The fold reads position and importance to
 * decide which declaration a browser takes, so it is right whenever that
 * bookkeeping still describes the file, and wrong when it does not. Two ways it
 * stops describing the file, and only two:
 *
 *   .a { width: 10px; inline-size: 33px; width: 12px }
 *
 * straddles — `width` sits on both sides of its twin, so keeping it in its first
 * position moves it in front of a declaration the file puts it behind. A browser
 * renders 12px and the fold gives 33. And
 *
 *   .a { width: 10px !important; width: 12px; inline-size: 33px }
 *
 * repeats a property whose importance changes between the repeats, so the last
 * importance is not the one that wins: a browser renders 10px and the fold, told
 * `width` is not important, hands the axis to `inline-size`. Both are wrong
 * numbers rather than errors, which every gate would report as a pass, and
 * nothing in the CSSOM can recover the truth — rule.cssText is serialised from
 * the same deduplicated block. So this refuses rather than guessing.
 *
 * Every other repeat goes through, because the fold gets it right. All the
 * repeats on one side of the twin is still the file's order after deduplication,
 * whichever side that is; a repeat with no logical twin beside it decides
 * nothing the fold reads and is an ordinary fallback (`width: 100%; width:
 * fit-content`, or a px value ahead of a rem one).
 *
 * A straddle in a rule that sizes no icon is refused along with the rest. The
 * fold does rewrite that rule and does get it wrong, and telling the two apart
 * would mean handing this function the icon classes — which every gate derives,
 * but two of them derive after they have folded. Refusing is the safe direction
 * and the shape is vanishingly rare; widen the signature if it ever turns up. */
function refuseRepeatedAxis(css, name) {
  for (const [selector, body, holdsBlock] of topLevelBlocks(css)) {
    // Not a style rule, or a rule with a rule inside it — the fold skips both,
    // and rulesOf() is what has something to say about the second.
    if (selector.startsWith('@') || holdsBlock) continue;
    const decls = new Map();
    let n = 0;
    for (const d of body.matchAll(declRe(SIZING_PROPS))) {
      const list = decls.get(d[1]) ?? [];
      list.push({ at: n, important: /!\s*important/i.test(d[2]) });
      decls.set(d[1], list);
      n += 1;
    }
    for (const axis of AXES) {
      if (!axis.every((p) => decls.has(p))) continue;
      const repeated = axis.find((p) => decls.get(p).length > 1);
      if (!repeated) continue;
      const [a, b] = axis.map((p) => decls.get(p));
      const apart = a[a.length - 1].at < b[0].at || b[b.length - 1].at < a[0].at;
      const steady = axis.every((p) => decls.get(p).every((d, _i, all) => d.important === all[0].important));
      if (apart && steady) continue;
      const other = axis.find((p) => p !== repeated);
      throw new Error(`${name}: "${selector}" ${apart
        ? `repeats ${repeated} with an !important on one of them and not the other, beside `
          + `a declaration of ${other}`
        : `declares ${repeated} both before and after ${other}`}. A browser takes the declaration `
        + 'that wins on importance and then the last one; the CSSOM this gate reads keeps a '
        + 'repeated property once, in its first position with its last value and its last '
        + 'importance, so the fold would pick the winner out of an order this file does not '
        + 'declare and report it as a size. Declare the axis once.');
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
  const prefixed = raw
    .match(/(?:^|[;{\s])(-[a-z]+-writing-mode)\s*:\s*([^;}]*)/);
  if (prefixed && turnsTheAxes(prefixed[2])) {
    throw new Error(writingModeRefusal(name, `a rule declares ${prefixed[1]}: `
      + `${prefixed[2].trim()}, which jsdom parses away before this gate can read it`));
  }
  refuseRepeatedAxis(raw, name);
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

/* Every @import in a stylesheet's raw text. An @import names a sheet that ships
 * to consumers and that no gate here opens: each one composes the files it finds
 * and nothing else, so the imported rules are measured only if that sheet is
 * itself one of them. src/index.css is the deliberate exception — it is nothing
 * but @imports, and the kit gate's sheet list is derived FROM them, so it is the
 * one sheet whose imports are already followed. */
export const importsIn = (css) => [...stripComments(css).matchAll(/@import\s+([^;]*)/g)]
  .map((m) => m[1].trim());

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
 * hides that declaration from every one of them. */
export function blindSpots(from, css, sheet) {
  const blind = [];
  const clampedBlind = [];
  const text = stripComments(css);
  for (const rule of sheet.cssRules) {
    if (!rule.selectorText) continue;
    const dims = DIMS.filter((d) => rule.style.getPropertyValue(d));
    if (!dims.length) continue;
    const values = dims.map((d) => rule.style.getPropertyValue(d));
    if (rule.selectorText.includes(UNRESOLVED) || values.some((v) => v.includes(UNRESOLVED))) {
      blind.push(`${from}: ${rule.selectorText} { ${dims.join(', ')} }`);
    }
  }
  /* A block whose WHOLE body was one interpolation nothing could resolve.
   * `<style>${SHELL_CSS}</style>` becomes the bare identifier UNRESOLVED — no
   * braces, no declarations — so the loop above sees no rules, and both text
   * guards below need a `{` or a literal width/height to fire. Nothing was
   * dropped from a count either, because the count never rose. The block reads
   * as a surface with no CSS in it, and the gate would swear it had measured
   * the page. */
  if (text.includes(UNRESOLVED) && sheet.cssRules.length === 0) {
    blind.push(`${from}: a <style> block whose entire body is an unresolved interpolation`);
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
 * nothing watching it. Every gate asks this of everything it sweeps.
 *
 * The question is asked of the raw text, because the CSSOM is precisely where
 * the answer is missing, and each declaration is re-parsed on its own rather
 * than being looked for by value. `fit-content(20%)` and `anchor-size(width)`
 * are what jsdom drops today and the set grows every time CSS does, so a list of
 * values here would be out of date by the release after this one.
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
export function droppedDecls(from, css) {
  const out = [];
  const text = stripComments(css);
  for (const props of [SIZING_PROPS, CLAMP_PROPS]) {
    for (const [, prop, raw] of text.matchAll(declRe(props))) {
      const value = raw.trim();
      if (value.includes(UNRESOLVED)) continue;
      if (!survivesParsing(LOGICAL_DIMS.get(prop) ?? prop, value)) out.push(`${from}: ${prop}: ${value}`);
    }
  }
  return out;
}

export const DROPPED_REFUSAL = 'a stylesheet sizes something with a value jsdom cannot parse, so '
  + 'the declaration is gone from the CSSOM these gates measure and the rule reads as if it sized '
  + 'nothing. Nothing else notices: it contributes no subject, so the count that would catch a rule '
  + 'leaving coverage sits exactly where it was. If the rule lands on an icon it applies in a '
  + 'browser and is measured by nobody. Write the size in a form jsdom parses, or teach the gate to '
  + 'measure it somewhere layout exists.';

export const BLIND_REFUSAL = 'a surface writes a sizing rule whose selector or value is computed '
  + 'at render time. The gate substituted a placeholder for it, so it cannot tell whether it sizes '
  + 'an icon and cannot measure it if it does. Teach resolveInterpolations().';

export const CLAMPED_BLIND_REFUSAL = 'a surface clamps a size with a value computed at render '
  + 'time. jsdom drops a declaration it cannot parse, so the clamp test reads a sheet this '
  + 'declaration is no longer in, and the raw text is the only place it survives. Teach '
  + 'resolveInterpolations() and the two of them can then say whether this clamp lands on an icon '
  + '— and if it does, that test refuses it, because no gate measures anything about a clamp. The '
  + 'argument is in CLAMP_REFUSAL.';

/* The smallest DOM satisfying a descendant selector such as
 * `.ui-nav--side.is-collapsed .ui-nav__ic svg`. Every icon selector the kit
 * renders is a chain of compound class/element parts. Anything else throws — and
 * the mounted element is checked against the selector afterwards, which is the
 * catch-all for shapes this builder gets subtly wrong. */
export function mount(document, sel, classes) {
  /* Everything goes inside one container, which is also what the caller
   * removes. A sibling combinator at the top of the chain builds two elements
   * rather than nesting one inside the other, so "the last child of body" stops
   * being the whole of what was mounted. */
  const top = document.body.appendChild(document.createElement('div'));
  let el = null;
  for (const [comb, part] of compoundsOf(sel)) {
    if (/[[:*&\\]/.test(part)) {
      throw new Error(`unsupported selector part: ${part} (in ${sel}). This builds a chain of `
        + 'compound class/element parts and nothing else, so it cannot make an element this one '
        + 'would match. Write the rule in a shape it can mount, or teach it this shape — except '
        + 'for a state or a pseudo-element (`svg:hover`, `svg::before`), which no amount of '
        + 'teaching reaches: jsdom has no pointer to hover with and no box for a pseudo-element, '
        + 'so an icon sized in one is unmeasurable here rather than merely unmounted. If the part '
        + 'names an icon inside :is() or :where(), the two halves of this machinery are meant to '
        + 'disagree: compoundIsSvg() reads it as the icon rule it is, and this builder stops short '
        + 'of it, so you get a refusal rather than a rule that leaves coverage in silence.');
    }
    const bare = part.replace(/\..*$/, '');
    const isSvg = bare === 'svg' || (!bare && part.split('.').slice(1).some((c) => classes.has(c)));
    const node = isSvg
      ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      : document.createElement(bare || 'div');
    for (const cls of part.split('.').slice(1)) node.classList.add(cls);
    // A child combinator builds the same nesting a descendant one does; the two
    // sibling combinators put the element beside its predecessor instead, which
    // `+` and `~` both match when it is the one that comes next.
    (el === null ? top : '+~'.includes(comb) ? el.parentNode : el).appendChild(node);
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
