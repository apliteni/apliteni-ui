/* Rule: below the phone step a coarse pointer gets 44x44 where the layout has
 * the room, nothing is drawn differently, and no control loses a tap it had.
 *
 * Two halves. The SOURCE half runs in CI and reads src/styles/tap-zone.css.
 * The BROWSER half is the measurement, and it needs a real engine: JSDOM lays
 * nothing out, so a hit zone is invisible to every other gate here. It is OFF
 * unless TAP_ZONES=1, because Playwright is deliberately not a dependency of
 * this package — CI does not run it, and the measurement is reported by hand
 * in the pull request. That is this gate's largest limit.
 *
 *   TAP_ZONES=1 node --test stories/tap-zone.test.js
 *
 * Discover subjects from source and check the coverage count.
 * why: docs/foundations.md#a-tap-reaches-the-floor-below-the-phone-step
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TAP_MIN, TARGET_MIN, TAP_EXEMPT } from './guidelines/_accessibility-floor.js';
import { splitSelectorList } from '../scripts/lib/selector-list.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const SHEET = 'src/styles/tap-zone.css';
const css = decomment(read(SHEET));

/* -- The source half -------------------------------------------------------- */

/* Every `--tap-*` this sheet reads, and what it resolves to. A clearance that
 * names a property nobody declares is not a smaller clearance: `var()` on an
 * undeclared custom property is invalid at computed-value time, so the whole
 * `height: min(…, calc(100% + var(--tap-clear-y)))` declaration is dropped and
 * the layer goes to `auto` — measured at 0 x 0 on the picker's page steps,
 * with every gate in this repository still green. */
const tapTokens = (sheet) => ({
  declared: new Set([...sheet.matchAll(/(--tap-[\w-]+)\s*:/g)].map((m) => m[1])),
  read: [...new Set([...sheet.matchAll(/var\(\s*(--tap-[\w-]+)/g)].map((m) => m[1]))],
});
/** The names a rule reads and the `:root` block never declares. */
const danglingIn = (sheet) => {
  const { declared, read } = tapTokens(sheet);
  return read.filter((name) => !declared.has(name)).sort();
};

test('every --tap-* a rule reads is a name this sheet declares', () => {
  const { declared, read } = tapTokens(css);
  assert.ok(
    read.length >= 4 && declared.size >= 4,
    `${SHEET} reads ${read.length} --tap-* names and declares ${declared.size}. A sweep that `
    + 'collapsed to a handful would pass over a dangling clearance and report the same green '
    + 'as one that checked them all.',
  );
  assert.deepEqual(
    danglingIn(css), [],
    `${SHEET} reads ${danglingIn(css).join(', ')} and declares no such property. A clearance `
    + 'whose name does not resolve does not fall back to a smaller zone — it takes the layer '
    + 'off the control entirely. Declare it in :root, or read the one that is there. Do not '
    + 'give the use site a fallback: that hides the break instead of catching it.',
  );
});

test('this gate rejects a clearance whose declaration was renamed', () => {
  // The likeliest way to break it: rename the :root end of a token and leave
  // the use sites, which every text assertion in this repository still passes.
  const renamed = css.replace(/(--tap-gap-bordered)(\s*:)/, '$1XX$2');
  assert.notEqual(
    renamed, css,
    `${SHEET} no longer declares --tap-gap-bordered, so this mutation changes nothing and `
    + 'proves nothing. Point it at a token the sheet does declare.',
  );
  assert.deepEqual(
    danglingIn(renamed), ['--tap-gap-bordered'],
    'The same reading that passes above has to come back with the dangling name once the '
    + 'declaration is renamed, or it is not holding the two ends together.',
  );
});

/* The arithmetic the clearance has to satisfy, rather than the number it
 * happens to be: a control drawn at the smallest mark with a 1px border
 * measures two less at its padding box, which is what the layer sizes
 * against, so the clearance has to carry it the rest of the way to the floor. */
test('the bordered clearance reaches the floor from a padding box', () => {
  const decl = /--tap-gap-bordered:\s*([^;]+);/.exec(css);
  assert.ok(
    decl,
    `${SHEET} declares no --tap-gap-bordered. The containers that raise a bordered control at `
    + `${TARGET_MIN} read it; without it their layers are dropped, not shrunk.`,
  );
  const resolved = Number(new Function(
    `return ${decl[1]
      .replace(/calc\(/g, '(')
      .replace(/var\(--tap-min\)/g, String(TAP_MIN))
      .replace(/var\(--tap-aa\)/g, String(TARGET_MIN))
      .replace(/px/g, '')}`,
  )());
  assert.ok(
    Number.isFinite(resolved),
    `${SHEET} writes --tap-gap-bordered as "${decl[1].trim()}", which this gate cannot resolve `
    + `from ${TAP_MIN} and ${TARGET_MIN} alone. Keep it an expression of the two floors.`,
  );
  // 100% on the layer is the padding box: the border box less its two borders.
  const paddingBox = TARGET_MIN - 2;
  assert.ok(
    paddingBox + resolved >= TAP_MIN,
    `${SHEET} resolves --tap-gap-bordered to ${resolved}px. A ${TARGET_MIN}px control with a `
    + `1px border measures ${paddingBox} at its padding box, so its layer stops at `
    + `${paddingBox + resolved} and never reaches ${TAP_MIN}.`,
  );
});

test('both floors are tokens, each written once', () => {
  const aa = css.match(/--tap-aa:\s*(\d+(?:\.\d+)?)px\s*;/);
  assert.ok(
    aa,
    `${SHEET} declares no --tap-aa. A zone is clamped by its container's clearance, so without `
    + 'a floor under the clamp the two layers this sheet RAISES can be taken below the target '
    + 'the kit already draws — measured at 22 on a checkbox, because `100%` on an absolutely '
    + 'positioned pseudo-element is the padding box and the box has a 1.5px border.',
  );
  assert.equal(
    Number(aa[1]), TARGET_MIN,
    `${SHEET} floors its layers at ${aa[1]}px and the Accessibility minimums page states `
    + `${TARGET_MIN} for WCAG 2.5.8. The lower floor is not this sheet's to move.`,
  );

  const declared = css.match(/--tap-min:\s*(\d+(?:\.\d+)?)px\s*;/);
  assert.ok(
    declared,
    `${SHEET} declares no --tap-min. The floor is the one number this sheet is about and `
    + 'it has to be nameable by a consumer who wants it somewhere else, so it is a custom '
    + 'property rather than a literal repeated at each use.',
  );
  assert.equal(
    Number(declared[1]), TAP_MIN,
    `${SHEET} declares --tap-min: ${declared[1]}px and the Accessibility minimums page states `
    + `${TAP_MIN}. Two numbers for one floor is the drift this gate exists to catch; move both `
    + 'or neither.',
  );

  // Every other px literal at the size of a target would be a second floor. A
  // media prelude is not one: a breakpoint is the one width a token cannot
  // express, and stories/breakpoints.test.js holds the list those come from.
  const strays = [...css
    .replace(/@media[^{]+\{/g, '')
    // The two token declarations themselves are where these numbers belong.
    .replace(/--tap-(?:min|aa):[^;]+;/g, '')
    .matchAll(/(\d+(?:\.\d+)?)px/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= TARGET_MIN);
  assert.deepEqual(
    strays, [],
    `${SHEET} writes ${strays.join(', ')} as a bare px literal at target scale. A size that `
    + 'large in this sheet is a floor, and a third floor nobody named is how the other two '
    + 'stop being true. Use --tap-min or --tap-aa, or a spacing token for a clearance.',
  );
});

test('the query asks about the pointer as well as the width', () => {
  const queries = [...css.matchAll(/@media\s*([^{]+)\{/g)].map((m) => m[1].trim());
  assert.ok(queries.length > 0, `${SHEET} has no @media block, so the layer is live everywhere.`);
  for (const q of queries) {
    assert.match(
      q, /\(pointer:\s*coarse\)/,
      `${SHEET} gates a layer on "${q}", which a desktop window dragged narrow also matches. `
      + 'A transparent layer is a hover surface too, so with a mouse the control lights up '
      + 'with the cursor 8px off it. A coarse pointer has no hover, so the clause that earns '
      + 'the layer is the clause that removes the side effect.',
    );
    assert.match(
      q, /max-width:\s*560px/,
      `${SHEET} gates a layer on "${q}". The phone step is 560px — the list is in `
      + 'docs/foundations.md#breakpoints and stories/breakpoints.test.js holds it.',
    );
  }
});

/** The selectors a `::after` layer is declared on, and the ones given a containing block. */
const listOf = (re) => {
  const m = css.match(re);
  if (!m) return [];
  return splitSelectorList(m[1]);
};
const carriers = listOf(/:where\(([^)]+)\)::after\s*\{/);
const positioned = listOf(/:where\(([^)]+)\)\s*\{\s*position:\s*relative;\s*\}/);

/** Every selector the kit's own stylesheets declare anything for. */
const kitCss = readdirSync(path.join(root, 'src/styles'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => decomment(read(`src/styles/${f}`)))
  .join('\n');
const declares = (selector) => kitCss.includes(selector);

test('every family that carries a layer has something to hang it on', () => {
  assert.ok(
    carriers.length >= 8,
    `${SHEET} declares a layer on ${carriers.length} selectors. The sheet exists to reach a `
    + 'list of families; a list this short means the rule was read out of the wrong block and '
    + 'the gate below would pass over most of the kit.',
  );
  const RELATIVE = /position:\s*(relative|absolute|sticky|fixed)/;
  for (const sel of carriers) {
    if (positioned.includes(sel)) continue;
    // A `host > control` carrier measures against its host, which then has to be the box.
    const host = / ([.\w-]+) > [.\w-]+$/.exec(sel)?.[1];
    if (host && new RegExp(`\\${host} \\{[^}]*position:\\s*relative`).test(kitCss)) continue;
    // `.ui-check input` and friends are handled by their own rule; these are the
    // :where() carriers, each of which must already be a containing block.
    const block = kitCss.split(/(?=\n\S)/).filter((r) => r.trimStart().startsWith(`${sel} {`));
    assert.ok(
      block.some((r) => RELATIVE.test(r)),
      `${SHEET} hangs a layer on ${sel} without putting it in the containing-block list above, `
      + 'and no kit rule positions it either. An absolutely positioned layer then measures '
      + 'against whatever ancestor happens to be positioned — a card, a panel, the page — and '
      + 'lands somewhere else entirely. Add it to the :where(…) { position: relative } list, '
      + 'or take it off the carrier list.',
    );
  }
});

/**
 * Every rule in the sheet that declares a clearance or opens a gap, one entry
 * per SELECTOR — a group of nine written on nine lines is nine containers, and
 * a scan that only matched single selectors skipped every one of them.
 */
const containers = [...css.matchAll(/(?:^|\n)\s*((?:\.[\w-]+(?:\s+\.?[\w-]+)*)(?:\s*,\s*(?:\.[\w-]+(?:\s+\.?[\w-]+)*))*)\s*\{([^{}]*)\}/g)]
  .filter((m) => /--tap-clear|(?:^|[;\s])(?:(?:row-|column-)?gap|margin(?:-[\w-]+)?)\s*:/.test(m[2]))
  .flatMap((m) => splitSelectorList(m[1]).map((sel) => ({ selector: sel, body: m[2] })));

assert.ok(
  containers.length >= 14,
  `${SHEET} parsed ${containers.length} containers. The sheet opens or declares on more than `
  + 'that, so the scan has stopped seeing a shape it used to — a selector group written across '
  + 'several lines was invisible to the first version of this regex, and nine rules went '
  + 'unchecked.',
);

test('every clearance and every opened gap names a container the kit declares', () => {
  const clearances = containers.map((r) => r.selector);
  assert.ok(
    clearances.length >= 4,
    `${SHEET} declares ${clearances.length} container clearances. Each one is the gap a layout `
    + 'actually sets, and the sheet needs them wherever the kit packs controls closer than the '
    + 'default; finding almost none means the block was renamed and the clamp is no longer '
    + 'applied anywhere.',
  );
  for (const { selector, body } of containers) {
    assert.ok(
      declares(selector.split(/\s+/).pop()),
      `${SHEET} declares a clearance for ${selector}, which no stylesheet under src/styles/ `
      + 'mentions. A clearance on a selector nothing matches is a clamp that never runs, and '
      + 'the layer it was meant to hold back reaches a neighbour instead.',
    );
    // An opened gap has to outrank the component sheet that already set one.
    // Without `!important` it wins only while this sheet is read last, and the
    // React bundle ships it without the component sheets at all.
    const opened = body.match(/(^|[;\s])((?:row-|column-)?gap)\s*:([^;]*)/);
    if (opened) {
      assert.match(
        opened[3], /!important/,
        `${SHEET} opens ${opened[2]} on ${selector} without !important. The component sheet that `
        + 'already set a gap there wins whenever this one is not read last — and in the React '
        + 'bundle, which ships this sheet without the component sheets, the order is the '
        + "consumer's.",
      );
    }
  }
});

test('a container that opens a gap declares the clearance to match it', () => {
  for (const { selector, body } of containers) {
    const opened = body.match(/(?:^|[;\s])(?:row-|column-)?gap\s*:\s*var\(--tap-gap\)/);
    if (!opened) continue;
    assert.match(
      body, /--tap-clear-[xy]:\s*var\(--tap-gap\)/,
      `${SHEET} opens ${selector} to --tap-gap and does not tell the layers inside it. The gap `
      + 'is spent and the zone still stops where the old clearance put it, which is the spread '
      + 'without the reach it was for.',
    );
  }
});

/**
 * Every rule in the kit's own sheets that declares a pseudo-element, as
 * `.selector::which`. Read as text: the question is which sheet has already
 * SPOKEN FOR a pseudo-element, and a resolved cascade would not answer it.
 */
const kitPseudos = readdirSync(path.join(root, 'src/styles'))
  .filter((f) => f.endsWith('.css') && f !== path.basename(SHEET))
  .flatMap((f) => [...decomment(read(`src/styles/${f}`)).matchAll(/([^{}]+)\{/g)]
    .flatMap((m) => [...m[1].matchAll(/([.\w-]+)(::(?:before|after))/g)]
      .map((p) => ({ selector: p[1], pseudo: p[2], where: `src/styles/${f}` }))));

/**
 * The phone step, written the way every sheet and story writes it, so the scan
 * below and the sheet cannot disagree about which block is the phone one.
 */
const PHONE_STEP = '@media (max-width: 560px) and (pointer: coarse)';

/** Every .js file under stories/, so a specimen module counts as well as a story. */
const storyJs = readdirSync(path.join(root, 'stories'), { recursive: true })
  .map(String).filter((f) => f.endsWith('.js')).sort();

/** The text of one brace-balanced block, starting at the `{` after `from`. */
const blockAt = (text, from) => {
  const open = text.indexOf('{', from);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  return '';
};

/**
 * Containers a SPECIMEN declares the phone clearance on, as `{ selector, where }`.
 *
 * A story that packs the kit's controls closer than the kit's own rows has to
 * open its own room, and this sheet cannot do it for them: it may only name
 * classes the kit ships, which a specimen's own layout class is not. So the
 * specimen declares --tap-clear-x / --tap-clear-y at the phone step and the
 * browser half below holds it to the floor — the gap the review of #492 found,
 * where a green run said nothing about a new positive example whose switches
 * measured 44x26.
 *
 * Discovered, never listed, for the reason the story sweep is: a specimen that
 * opens its own room is measured the day it does.
 */
const storyContainers = storyJs.flatMap((rel) => {
  const text = decomment(read(`stories/${rel}`));
  const out = [];
  for (let at = text.indexOf(PHONE_STEP); at >= 0; at = text.indexOf(PHONE_STEP, at + 1)) {
    const body = blockAt(text, at + PHONE_STEP.length);
    for (const m of body.matchAll(/(?:^|[;{}\n])\s*([^{}@;]+?)\s*\{([^{}]*)\}/g)) {
      if (!/--tap-clear-[xy]\s*:/.test(m[2])) continue;
      for (const sel of splitSelectorList(m[1])) {
        out.push({ selector: sel, body: m[2], where: `stories/${rel}` });
      }
    }
  }
  return out;
});

test('a specimen that declares the phone clearance is found and names a token', () => {
  assert.ok(
    storyContainers.length >= 2,
    `The story sweep found ${storyContainers.length} specimen containers declaring `
    + '--tap-clear-x or --tap-clear-y at the phone step. The Drawers page declares two, so a '
    + 'count below that is a scan that stopped seeing the shape it reads — and the browser '
    + 'half below would then hold nothing to the floor while still reporting green.',
  );
  for (const { selector, body, where } of storyContainers) {
    assert.match(
      body, /var\(--tap-(min|gap|aa)\)/,
      `${where} declares a clearance on ${selector} in hand-written pixels. The floor and the `
      + "gap are tokens the kit owns; a specimen that copies their numbers keeps its own copy "
      + 'of them, and the two drift the first time one moves.',
    );
  }
});

/** The containers this sheet opens a gap on, as selectors. */
const opened = containers
  .filter((r) => /(?:^|[;\s])(?:row-|column-)?gap\s*:\s*var\(--tap-gap\)/.test(r.body))
  .flatMap((r) => splitSelectorList(r.selector));

test('a container that opens an axis declares the clearance for THAT axis', () => {
  // Per axis, because `gap` is a shorthand and opens both. `.ui-toast` opened
  // both and declared only the vertical half: the horizontal 8px it spent came
  // straight out of the message column, 202px to 178px, and bought no reach
  // because nothing inside could use it.
  for (const { selector, body } of containers) {
    const opens = { x: false, y: false };
    for (const m of body.matchAll(
      /(?:^|[;\s])(row-gap|column-gap|gap|margin-inline-start|margin-inline-end|margin-left|margin-right|margin-block|margin-top|margin-bottom|margin)\s*:\s*var\(--tap-gap\)/g)) {
      if (/^(column-gap|gap|margin-inline|margin-left|margin-right|margin$)/.test(m[1])) opens.x = true;
      if (/^(row-gap|gap|margin-block|margin-top|margin-bottom|margin$)/.test(m[1])) opens.y = true;
    }
    for (const axis of ['x', 'y']) {
      if (!opens[axis]) continue;
      assert.match(
        body, new RegExp(`--tap-clear-${axis}:` + String.raw`\s*var\(--tap-gap\)`),
        `${SHEET} opens ${selector} on the ${axis === 'x' ? 'horizontal' : 'vertical'} axis and `
        + `declares no --tap-clear-${axis} to go with it. The space is spent and no zone inside `
        + 'may use it, so the row is wider or shorter for nothing — which on a full row means '
        + 'its content is narrower instead. Open the other axis only, or declare this one.',
      );
    }
  }
});

test('this gate rejects an axis opened without its clearance', () => {
  // The mutation for the rule above, run against the checker: `.ui-toast` the
  // way this head shipped it.
  const body = 'row-gap: var(--tap-gap) !important; --tap-clear-y: var(--tap-gap);'
    .replace('row-gap', 'gap');
  const opensX = [...body.matchAll(/(?:^|[;\s])(row-gap|column-gap|gap)\s*:\s*var\(--tap-gap\)/g)]
    .some((m) => m[1] !== 'row-gap');
  assert.ok(
    opensX && !/--tap-clear-x:\s*var\(--tap-gap\)/.test(body),
    'The shorthand `gap` did not read as opening the horizontal axis, so the check above would '
    + 'pass over a row that spends space nothing can use.',
  );
});

test('a carrier is never given a pseudo-element another sheet already owns', () => {
  // The defect this is written for shipped: `.ui-nav__tab::after` is the active
  // underline nav.css draws, and listing that family here moved the indicator
  // from under the label into the middle of it, where it read as a
  // strikethrough. The sheet's own comments show the question was asked by hand
  // for two families out of thirteen; nothing held the other eleven.
  const taken = [];
  for (const sel of carriers) {
    const leaf = sel.split(/\s+/).pop();
    for (const p of kitPseudos) {
      if (p.selector === leaf && p.pseudo === '::after') taken.push(`${sel}::after (${p.where})`);
    }
  }
  assert.deepEqual(
    taken, [],
    `${SHEET} hangs its zone on a pseudo-element another kit sheet already draws with: `
    + `${taken.join(', ')}. The zone's own declarations land on that drawing instead of on a `
    + 'box of their own — a `top` and a `width` on an indicator that had `bottom` and `right`, '
    + 'which over-constrains it and moves it. Use the other pseudo-element if it is free, or '
    + 'take the family off the carrier list.',
  );
});

test('the two families that reuse an existing layer really have one', () => {
  // The inverse, and it is the reason the rule above can be absolute. These two
  // do not get a ::after; they grow a ::before that input.css and callout.css
  // already draw as a hit layer. If either stopped drawing one, this sheet
  // would be inventing a box rather than raising one.
  const reused = [...css.matchAll(/^\s*([.\w-]+(?:\s+[.\w-]+)*)::before\s*[,{]/gm)].map((m) => m[1]);
  assert.ok(
    reused.length >= 2,
    `${SHEET} no longer raises an existing ::before on any family. The checkbox and the toast `
    + 'close are the two the kit floored by hand in #219, and this sheet is supposed to carry '
    + 'them to the same floor as the rest.',
  );
  for (const sel of reused) {
    const leaf = sel.split(/\s+/).pop();
    assert.ok(
      kitPseudos.some((p) => p.selector === leaf && p.pseudo === '::before'),
      `${SHEET} sizes ${sel}::before, and no other kit sheet draws one there. This rule is meant `
      + 'to RAISE the hit layer #219 added, not to invent one — an invented box is the same '
      + 'defect as overwriting a drawn one, in the other direction.',
    );
  }
});

test('this gate rejects the nav tab going back on the carrier list', () => {
  // The mutation for the rule two tests up, run against the checker.
  const mutated = [...carriers, '.ui-nav__tab'];
  const taken = mutated.filter((sel) => kitPseudos
    .some((p) => p.selector === sel.split(/\s+/).pop() && p.pseudo === '::after'));
  assert.deepEqual(
    taken, ['.ui-nav__tab'],
    'Putting .ui-nav__tab back on the carrier list did not trip the check above, so the check '
    + 'would pass over the defect it exists for.',
  );
});

test('the exempt ledger is real, and nothing on it also carries a layer', () => {
  assert.ok(TAP_EXEMPT.length > 0, 'TAP_EXEMPT is empty, so the page claims the floor is universal.');
  for (const entry of TAP_EXEMPT) {
    const leaf = entry.selector.split(/\s+/).pop();
    assert.ok(
      declares(leaf),
      `TAP_EXEMPT names ${entry.selector}, which no stylesheet under src/styles/ declares. An `
      + 'entry for a control the kit no longer ships reads as a known gap that nobody can close.',
    );
    assert.ok(
      entry.why && entry.why.length > 60,
      `TAP_EXEMPT entry for ${entry.selector} gives no reason worth reading. An entry without `
      + 'the cause is a control quietly left under the floor.',
    );
    assert.ok(
      !carriers.includes(entry.selector),
      `TAP_EXEMPT names ${entry.selector} and ${SHEET} also gives it a layer. One of the two is `
      + 'out of date, and whichever it is, the page is telling a reader the opposite of the kit.',
    );
  }
});

test('the guideline page carries both rules, and its specimen redraws the real expression', () => {
  const page = read('guidelines/accessibility-floor.md');
  for (const id of ['tap-zone', 'tap-spacing']) {
    assert.match(
      page, new RegExp(`<!-- rule: ${id} -->`),
      `guidelines/accessibility-floor.md has no "${id}" rule. The sheet is the mechanism and the `
      + 'page is where a reader is told the spacing it needs; one without the other is a device '
      + 'nobody can apply.',
    );
  }
  // The specimen cannot reveal the real layer — it is gated on a coarse pointer
  // and a phone width — so it redraws it. Both expressions are read here so the
  // drawing cannot drift from the thing it draws.
  const sizeOf = (text) => {
    const w = text.match(/width:\s*(min\(max\(100%,\s*var\(--tap-min\)\),\s*calc\(100% \+ var\(--tap-clear-x\)\)\))/);
    const h = text.match(/height:\s*(min\(max\(100%,\s*var\(--tap-min\)\),\s*calc\(100% \+ var\(--tap-clear-y\)\)\))/);
    return [w && w[1], h && h[1]];
  };
  const sheet = sizeOf(css);
  const specimen = sizeOf(decomment(read('stories/guidelines/_accessibility-floor.js')));
  assert.deepEqual(
    specimen, sheet,
    'The Do specimen on the Accessibility minimums page draws a layer that is no longer the one '
    + `${SHEET} declares. The page would then be showing a reader a rule the kit does not run.`,
  );
});

test('this gate rejects a sheet that drops the pointer clause', () => {
  // The mutation the source half exists to catch, run against the checker rather
  // than asserted about it. why: AGENTS.md, new gates prove their own rejection.
  const mutated = css.replace('and (pointer: coarse)', '');
  const queries = [...mutated.matchAll(/@media\s*([^{]+)\{/g)].map((m) => m[1].trim());
  assert.ok(
    queries.some((q) => !/\(pointer:\s*coarse\)/.test(q)),
    'Removing the pointer clause left every query still matching it, so the check above would '
    + 'pass over a sheet that hovers controls under a mouse.',
  );
});

test('this gate rejects a toolbar margin that closes one theme', () => {
  // The mutation: a single --space-10 figure both themes used to take. In dark
  // the stack's own gap is --space-5, so that figure closed the 20px gap to
  // zero and laid the card over the bar's last row. The margin must read the
  // themed --ui-block-gap, never one figure.
  const collapsed = css.replace(
    /margin-bottom:\s*calc\(var\(--tap-gap\)\s*-\s*var\(--ui-block-gap,\s*0px\)\)/,
    'margin-bottom: calc(var(--tap-gap) - var(--space-10))',
  );
  assert.notEqual(collapsed, css, 'The mutation did not apply, so it proves nothing.');
  assert.ok(
    !/margin-bottom:\s*calc\(var\(--tap-gap\)\s*-\s*var\(--ui-block-gap,\s*0px\)\)/.test(collapsed),
    'A single --space-10 figure still reads as the themed rule, so the check above would '
    + 'pass over a sheet that closes the dark gap to zero.',
  );
});

test('this gate rejects a sheet that drops the date-picker drawer growth', () => {
  // The mutation: the opened grid outgrows the md drawer (45vh), whose body
  // scrolls and clips the last week's tap layers at the scroll edge.
  const cut = css.replace(/\s*\.ui-drawer:has\(\.ui-datepicker__body\.is-sheet\)\s*\{\s*--drawer-h:\s*72vh;\s*\}/, '');
  assert.notEqual(cut, css, 'The mutation did not apply, so it proves nothing.');
  const rule = /\.ui-drawer:has\(\.ui-datepicker__body\.is-sheet\)\s*\{\s*--drawer-h:\s*72vh;/;
  assert.ok(
    !rule.test(cut),
    'Removing the 72vh sheet drawer left the rule the gate would still read, so the check above '
    + 'would pass over a sheet that clips the last week.',
  );
});

test('this gate rejects a cap read from the viewport instead of the content', () => {
  // The mutation: `full` is the viewport height, clamped to VIEW_CAP, so it
  // never exceeds the cap and `cut: full > VIEW_CAP` is always false. A story
  // taller than the cap is then measured only to the cap, and everything below
  // it is silently unmeasured instead of rejected below.
  const rig = read('stories/lib/tap-zone.js');
  const clamped = rig.replace(/\bcut:\s*content\s*>\s*VIEW_CAP\b/, 'cut: full > VIEW_CAP');
  assert.notEqual(clamped, rig, 'The mutation did not apply, so it proves nothing.');
  assert.ok(
    !/\bcut:\s*content\s*>\s*VIEW_CAP\b/.test(clamped),
    'The cap still reads the content height, so the oversized-story assertion below would pass '
    + 'over a story taller than the rig lays out.',
  );
});

test('the shrink check reads an edge-stopped side as a lower bound', async () => {
  // The mutation half of the edge rule: the same 1px loss fails on a side another
  // control stops, and passes only where the viewport edge stops the pass with the sheet.
  const { shrinks } = await import('./lib/tap-zone.js');
  const t = (sides, edges) => ({ drawn: [40, 30], sides, edges });
  const free = [false, false, false, false];
  const atLeft = [true, false, false, false];
  const A = t([3, 2, 4, 4], free);
  assert.equal(shrinks(t([2, 2, 4, 4], atLeft), A, TAP_MIN), false,
    'A box that wrapped to the viewport edge lost reach only to the edge, and was failed for it.');
  assert.equal(shrinks(t([3, 1, 4, 4], atLeft), A, TAP_MIN), true,
    'A side another control stops lost a pixel beside an edge-stopped side, and passed.');
  assert.equal(shrinks(t([3, 2, 4, 3], atLeft), A, TAP_MIN), true,
    'An edge on one axis hid a loss on the other axis.');
  assert.equal(shrinks(t([2, 2, 4, 4], free), A, TAP_MIN), true,
    'A loss on a side another control stops passed.');
  // A 60px button at x=10 reaches 10px to the viewport edge. A control laid over
  // those 10px takes them, and the edge no longer stops that side.
  assert.equal(shrinks({ drawn: [60, 30], sides: [0, 11, 7, 7], edges: free },
    { drawn: [60, 30], sides: [10, 11, 7, 7], edges: atLeft }, TAP_MIN), true,
    'An edge in the pass without the sheet hid the reach a control took in the pass with it.');
});

/* A filter chip has no remove mark, so its trigger is the chip's one control and reads the
 * bar's clearance. A chip that zeroed it kept the trigger at its 30px box on a phone. Limit:
 * this reads the sheet's declarations only; the browser half below measures the reach. #885 */
const chipClearance = (sheet) => [...sheet.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
  .filter((m) => /\.ui-filter-bar__chip\b/.test(m[1]) && /--tap-clear-[xy]\s*:/.test(m[2]))
  .map((m) => m[1].trim());

test('a filter chip does not shut the clearance its trigger reads', () => {
  assert.deepEqual(chipClearance(css), [], 'A chip sets its own clearance, so its trigger stays under 44.');
  const shut = css.replace(/\.ui-filter-bar \{/, '.ui-filter-bar__chip { --tap-clear-x: 0px; --tap-clear-y: 0px; }\n  .ui-filter-bar {');
  assert.notEqual(shut, css, 'The mutation did not apply, so it proves nothing.');
  assert.equal(chipClearance(shut).length, 1, 'The check passed a chip that shuts its clearance again.');
});

/* The two passes the browser half compares read each story at one shared viewport, so a
 * 70vh region cuts its rows the same way in both. This reads the source, so it sees the
 * passes' arguments and not the heights they settle to. */
const sharedPasses = (src) => [['before', 'without'], ['after', 'withCss']].every(([pass, sheet]) =>
  new RegExp(`const ${pass} = await at\\(390, true, ${sheet}, subjects, shared\\);`).test(src));

test('the two sheets are measured at one shared viewport', () => {
  const src = read('stories/tap-zone.test.js');
  assert.ok(sharedPasses(src), 'A pass settles its own viewport, so a 70vh region can cut a row in one pass only.');
  const own = src.replace(/const before = await at\(390, true, without, subjects, shared\);/, 'const before = await at(390, true, without);');
  assert.notEqual(own, src, 'The mutation did not apply, so it proves nothing.');
  assert.equal(sharedPasses(own), false, 'The check passed a pass that settles its own viewport.');
});

/* -- The browser half ------------------------------------------------------- */

const RUN = process.env.TAP_ZONES === '1';

test('measured at 390 on a coarse pointer', { skip: !RUN && 'set TAP_ZONES=1' }, async (t) => {
  const { storySubjects, rowFixtures, kitStylesheet, pass, settle, playwright, flatten, name, shrinks, STAT_VARIANTS, STAT_PLACES, STAT_CARDS } =
    await import('./lib/tap-zone.js');

  const pw = await playwright();
  assert.ok(
    pw,
    'TAP_ZONES=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one — '
    + 'scripts/evidence/README.md has the recipe — or leave the variable unset. A browser gate '
    + 'that quietly skipped would report the same green as one that measured.',
  );

  const { subjects: stories, problems } = await storySubjects();
  assert.deepEqual(
    problems, [],
    'Stories that would not render are not skipped here: an unmeasured subject is a failure.',
  );
  assert.ok(
    stories.length >= 300,
    `${stories.length} stories rendered. The sweep is the coverage, and a sweep that collapsed `
    + 'to a handful would pass while measuring almost nothing.',
  );
  const showcases = stories.filter((s) => s.id.startsWith('apps-'));
  assert.ok(
    showcases.length >= 40,
    `${showcases.length} apps-* showcases rendered. The sweep must include the served showcases; `
    + 'a filter that drops them still clears the aggregate floor above while measuring far less.',
  );

  // Plus the rows no story puts on screen, and two a consumer would write.
  const fixtures = await rowFixtures();
  assert.ok(
    fixtures.length >= 45,
    `${fixtures.length} row fixtures. These are the gate's answer to a defect the story sweep `
    + 'could not see, and a list that shrank would quietly give that coverage back.',
  );
  const subjects = [...stories, ...fixtures];

  const withCss = kitStylesheet();
  const without = kitStylesheet({ without: ['styles/tap-zone.css'] });
  assert.match(
    withCss, /\.rx-modal\b/,
    'The measurement CSS does not include the React stylesheet (react/dist/index.css), so the '
    + 'migrated fixtures — a React Confirm is an .rx-modal — are measured unstyled.',
  );
  const browser = await (await playwright()).chromium.launch({ executablePath: process.env.UI_CHROME });

  try {
    // The exempt selectors ride along in `families` so a target can say it is on
    // the ledger; the per-family report below still walks `carriers` alone.
    const exempt = TAP_EXEMPT.map((e) => e.selector);
    const specimens = storyContainers.map((c) => c.selector);
    const at = (width, coarse, sheet, which = subjects, viewportHeight) =>
      pass(browser, {
        subjects: which,
        css: sheet,
        width,
        coarse,
        size: TAP_MIN,
        families: [...carriers, ...exempt],
        within: [...opened, ...specimens],
        viewportHeight,
      });

    // Both sheets measure each story at ONE viewport, the taller of its two settles. A
    // 70vh scroll region never settles, so two passes that each settled stopped at
    // different heights, and the region's lower edge cut a row in one pass and showed 3px
    // of it in the other: the Tasks table's last title link was a target only with the
    // sheet. Limit: the shared viewport is where the settle stopped, so a row at a capped
    // region's lower edge is cut the same way in both passes, not measured at a settled
    // height.
    const settled = [await settle(browser, { subjects, css: without, width: 390, coarse: true }),
      await settle(browser, { subjects, css: withCss, width: 390, coarse: true })];
    const shared = new Map(subjects.map((s) => [s.id, Math.max(...settled.map((h) => h.get(s.id)))]));
    const before = await at(390, true, without, subjects, shared);
    const after = await at(390, true, withCss, subjects, shared);

    assert.deepEqual(
      after.media, { coarse: true, hover: false, width: 390 },
      'The rig did not report a coarse pointer at 390, so the sheet under test never applied and '
      + 'everything below would have measured the desktop kit and called it green.',
    );

    const A = flatten(before.rows);
    const B = flatten(after.rows);
    assert.equal(A.length, B.length, 'The two runs found different numbers of targets.');
    assert.ok(
      B.length >= 1000,
      `${B.length} targets measured at 390. The count is the coverage; a collapse here is a `
      + 'selector that stopped matching, not a kit that got smaller.',
    );

    // A control below the rig's page cap has no reach, so a story cut there is unmeasured.
    assert.deepEqual(
      [...before.rows, ...after.rows].filter((r) => r.cut).map((r) => r.story), [],
      'A story is taller than the rig lays out. Raise VIEW_CAP in stories/lib/tap-zone.js.',
    );

    await t.test('no control is drawn at a different size', () => {
      const moved = B.filter((b, i) => b.drawn[0] !== A[i].drawn[0] || b.drawn[1] !== A[i].drawn[1]);
      assert.deepEqual(
        moved.map((b) => `${b.story} ${name(b)}`), [],
        'A control changed size with the sheet loaded. The whole premise of #488’s answer is '
        + 'that the drawn control does not move; a layer that changes layout is a visible change '
        + 'the issue rejected.',
      );
    });

    await t.test('a target count that differs is still rejected at a shared viewport', async () => {
      // Two mutations of the Tasks table, the story whose last link the region's edge cut
      // in one pass. Settled once for each sheet, the two passes count different targets,
      // so the shared viewport is what makes them agree. At the shared viewport, a sheet
      // that hides the title links still counts fewer, so the count check still sees a
      // target that a sheet really removes.
      const tasks = subjects.filter((s) => s.id === 'showcases-tasks--table');
      assert.equal(tasks.length, 1, 'The Tasks table story is not in the sweep.');
      const own = (sheet) => at(390, true, sheet, tasks);
      assert.notEqual(
        flatten((await own(without)).rows).length, flatten((await own(withCss)).rows).length,
        'Each sheet settled on its own counted the same targets, so this check no longer shows '
        + 'that the shared viewport is needed. Find a story whose capped region cuts a row.',
      );
      const one = shared.get(tasks[0].id);
      const hidden = withCss + '.ui-table__title a { display: none !important; }';
      assert.ok(
        flatten((await at(390, true, hidden, tasks, one)).rows).length
          < flatten((await at(390, true, withCss, tasks, one)).rows).length,
        'A sheet that hides the title links counted the same targets at the shared viewport.',
      );
    });

    await t.test('a vh-capped region measured once is rejected', async () => {
      // The mutation: one viewport read, the way the pass measured before it
      // settled the pair. A max-height:70vh scroll region reads its cap, not
      // its rows, on a short box, so the finance table draws a different size
      // in the two passes.
      const finance = subjects.filter((s) => s.id === 'components-finance-composition--comparison');
      assert.equal(finance.length, 1, 'The finance story is not in the sweep.');
      const oneShot = (sheet) => pass(browser, {
        subjects: finance, css: sheet, width: 390, coarse: true, size: TAP_MIN, rounds: 1,
      });
      const A1 = flatten((await oneShot(without)).rows);
      const B1 = flatten((await oneShot(withCss)).rows);
      const moved = B1.filter((b, i) => b.drawn[0] !== A1[i].drawn[0] || b.drawn[1] !== A1[i].drawn[1]);
      assert.ok(
        moved.length > 0,
        'One viewport read drew the vh-capped region the same size in both passes, so the '
        + 'settling loop in stories/lib/tap-zone.js would be removable and the finance defect '
        + 'would return.',
      );
      t.diagnostic(`${moved.length} control(s) drawn differently on one read — the check rejects it`);
    });

    await t.test('no control has a drawn pixel that runs another control', () => {
      // Layout-independent, and it has to be: opening a row's gap MOVES the
      // controls in it, so "the point this control owned before" is no longer
      // a question with an answer. The property that survives is absolute —
      // a tap anywhere on a control's own drawn box runs that control — and
      // the comparison is by who collides with whom, not by where.
      //
      // The kit does not start clean: pairs of its own controls already overlap
      // at 390 before any of this loads, most of them a shell whose rail does
      // not fold. So the test is that the set does not GROW.
      const pairs = (rows) => {
        const out = new Set();
        for (const t of rows) {
          for (const [, to] of t.lostTo) {
            if (to === 'nothing') continue;
            out.add(`${t.story} — ${name(t)} ← ${to.split(' “')[0]}`);
          }
        }
        return out;
      };
      // Limit: a point in the one pixel two ABUTTING controls share is excused when the
      // neighbour's own drawn box reaches into it, so an overreach smaller than that pixel
      // is unread at such an edge. Both mutations below measure that line. #496, #518
      const was = pairs(A);
      const now = pairs(B);
      const added = [...now].filter((p) => !was.has(p));
      assert.deepEqual(
        added, [],
        `${added.length} control(s) now have a drawn pixel that runs a different control. This is `
        + 'the failure the clamp and the opened gaps exist to prevent: a zone that reaches past '
        + 'the gap routes a tap into the neighbour, and on a menu that neighbour was the '
        + 'destructive row. Open that container to --tap-gap, or declare the --tap-clear-x / '
        + '--tap-clear-y it really gives.',
      );
      t.diagnostic(`colliding pairs: ${was.size} without the sheet, ${now.size} with it`);
    });

    // The selection boxes of a selectable table in each density, which no story renders in
    // compact. A box is 19px and its layer reaches 44 down only where the rows are far
    // enough apart: 58px default, 33px compact, so the dense and compact rows must stay at
    // the 24px floor down (#619). The limit: only the four centre lines of each control are
    // walked, and a layer that reaches a neighbour only past a corner is not seen.
    // Scoped to these fixtures on purpose: other families already hand a neighbour a point
    // nearer its box (a nav item and the filter chip beside it, two switches in a drawer),
    // and widening this check to them is a separate decision for each of those sheets.
    const SELECTABLE = /^fixture:selectable-/;
    const stolenIn = (rows) => rows.filter((r) => SELECTABLE.test(r.story))
      .flatMap((r) => r.stolen.map((w) => `${r.story} — ${name(r)} ${w}`));

    await t.test('no selection layer takes a point nearer another row’s box than its own', () => {
      const was = new Set(stolenIn(A));
      const added = stolenIn(B).filter((p) => !was.has(p));
      assert.deepEqual(
        added, [],
        `${added.length} control(s) own a point nearer a neighbour's box than their own. Two `
        + 'layers that overlap hand each other the pixels nearest the other box, so a tap just '
        + 'below one row’s checkbox selects the next row. Keep the layer inside the room the '
        + 'rows leave: a table that shares an edge between rows grows no layer down.',
      );
    });

    // A stat band's change with a tooltip is its own 44px target in the row on a touch phone,
    // also the short `1%`: in a folded band, over a trend, in each variant in each container
    // in both themes, and in a Card with its own padding or paint. No layer reaches past it.
    // The limit: the fixtures fold to one column, at 390 only.
    const statCases = [...STAT_VARIANTS.flatMap((variant) => STAT_PLACES.map((place) => `${variant}-${place}`)),
      ...STAT_CARDS.map(([card]) => `card-${card}`)].flatMap((id) => ['dark', 'light'].map((theme) => `stat-${id}-${theme}`));
    const changes = (rows, id) => rows.filter((r) => r.story === `fixture:${id}` && r.cls.split(/\s+/).includes('ui-focusable'));
    const shortChanges = (rows) => [['stat-links', 3], ['stat-trend', 2], ...statCases.map((id) => [id, 3])]
      .flatMap(([id, count]) => {
        const mine = changes(rows, id);
        if (mine.length !== count) return [`${id}: ${mine.length} changes measured, ${count} expected`];
        return mine.filter((b) => Math.min(...b.drawn, ...b.reach) < TAP_MIN).map((b) => `${id}: draws ${b.drawn.join('x')}, reaches ${b.reach.join('x')}`);
      });
    const statRows = (rows) => rows.filter((r) => /^fixture:stat-/.test(r.story));
    const takenByChange = (rows) => statRows(rows).flatMap((r) => r.lostTo.map(([, to]) => `${r.story} — ${name(r)} ← ${to}`));
    // Two drawn boxes in one fixture that share more than an edge. A control inside another is not counted.
    const overlaps = (rows) => statRows(rows).flatMap((a, i, all) => all.slice(i + 1)
      .filter((b) => b.story === a.story && Math.min(a.box[0] + a.drawn[0], b.box[0] + b.drawn[0]) - Math.max(a.box[0], b.box[0]) > 1
        && Math.min(a.box[1] + a.drawn[1], b.box[1] + b.drawn[1]) - Math.max(a.box[1], b.box[1]) > 1)
      .map((b) => `${a.story} — ${name(a)} over ${name(b)}`));

    await t.test('a stat change is a 44px target in the row and overlaps no other target', () => {
      assert.equal(statCases.length, 30, 'Three variants in four containers and three Cards, in two themes.');
      assert.deepEqual(shortChanges(B), []);
      assert.deepEqual(takenByChange(B), []);
      assert.deepEqual(overlaps(B), []);
      t.diagnostic(`stat changes draw ${['stat-links', 'stat-trend', ...statCases]
        .map((id) => `${id} ${changes(B, id).map((b) => b.drawn.join('x')).join(', ')}`).join(' / ')}`);
    });

    await t.test('a stat change without its touch size is rejected', async () => {
      const own = fixtures.filter((f) => /^fixture:stat-/.test(f.id));
      const sheet = withCss.replace(/@media \(max-width: 560px\) and \(pointer: coarse\) \{\s*\.ui-stat__delta [^}]*\}/, '@media (max-width: 560px) and (pointer: coarse) {');
      assert.notEqual(sheet, withCss, 'The mutation did not apply, so it proves nothing.');
      const short = new Set(shortChanges(flatten((await at(390, true, sheet, own)).rows)).map((p) => p.split(':')[0]));
      assert.equal(short.size, 2 + statCases.length, `A change at its line height passed in some fixtures: ${[...short]}`);
    });

    /* The chart head's range trigger is a text trigger, 34px drawn, between the
     * figure, which is text, and the plot. The row declares its clearance, so the
     * trigger reaches 44px down the centre line, and its layer touches neither the
     * figure nor the plot. Limit: one story, the real Head, in both themes, and
     * only the centre line is hit-tested. #863 */
    const HEAD = 'react-chart--head';
    const headAt = async (sheet, theme) => {
      const subject = subjects.find((s) => s.id === HEAD);
      assert.ok(subject, `${HEAD} is not in the sweep, so the chart head is not measured.`);
      const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce' });
      try {
        const page = await ctx.newPage();
        await page.setContent(`<!doctype html><html lang="en" data-theme="${theme}"><head><style>html,body{margin:0;padding:0}${sheet}</style></head><body>${subject.html}</body></html>`);
        return await page.evaluate(() => {
          const t = document.querySelector('.ui-chart__range .ui-dropdown__trigger');
          if (!t) return null;
          const b = t.getBoundingClientRect();
          const layer = Number.parseFloat(getComputedStyle(t, '::after').height);
          const cx = b.x + b.width / 2;
          const cy = b.y + b.height / 2;
          const owns = (y) => t.contains(document.elementFromPoint(cx, y));
          let up = 0; while (up < 44 && owns(b.top - 0.5 - up)) up += 1;
          let down = 0; while (down < 44 && owns(b.bottom - 0.5 + down)) down += 1;
          return {
            drawn: b.height,
            reach: b.height + up + down,
            top: cy - layer / 2,
            bottom: cy + layer / 2,
            figure: document.querySelector('.ui-chart__summary > .ui-stat__value').getBoundingClientRect().bottom,
            plot: document.querySelector('.ui-chart__frame').getBoundingClientRect().top,
          };
        });
      } finally {
        await ctx.close();
      }
    };
    const headMisses = (m, theme) => {
      if (!m) return [`${theme}: no range trigger in the chart head`];
      const out = [];
      if (m.drawn >= TAP_MIN) out.push(`${theme}: the trigger draws ${m.drawn}px, so this check measures nothing`);
      if (m.reach < TAP_MIN - 0.5) out.push(`${theme}: the trigger reaches ${m.reach}px down its centre line`);
      if (m.top < m.figure) out.push(`${theme}: the layer reaches ${(m.figure - m.top).toFixed(2)}px into the figure`);
      if (m.bottom > m.plot) out.push(`${theme}: the layer reaches ${(m.bottom - m.plot).toFixed(2)}px into the plot`);
      return out;
    };

    await t.test('the chart head\'s range trigger reaches 44px, clear of the figure and the plot', async () => {
      const misses = [];
      for (const theme of ['light', 'dark']) {
        const m = await headAt(withCss, theme);
        misses.push(...headMisses(m, theme));
        t.diagnostic(`${theme}: ${m && `${m.drawn.toFixed(2)} drawn, ${m.reach.toFixed(2)} reached, `
          + `${(m.top - m.figure).toFixed(2)}px under the figure, ${(m.plot - m.bottom).toFixed(2)}px over the plot`}`);
      }
      assert.deepEqual(misses, []);
    });

    await t.test('a chart head\'s range row without its clearance is rejected', async () => {
      const shut = withCss.replace(/\.ui-chart__range \{ --tap-clear-y: [^}]*\}/, '');
      assert.notEqual(shut, withCss, 'The mutation did not apply, so it proves nothing.');
      const misses = [];
      for (const theme of ['light', 'dark']) misses.push(...headMisses(await headAt(shut, theme), theme));
      assert.equal(misses.filter((m) => /reaches [\d.]+px down/.test(m)).length, 2,
        `The trigger kept its 44px without the row's clearance: ${misses.join(' / ') || 'no miss'}`);
    });

    await t.test('each wordless option owns a 44px target without crossing the shared middle', () => {
      // The chart/table switch in a card's tools: two 24px glyph pills in a 32px
      // track. The symmetric clamp left each at 28 across, so a tap at the pill's
      // edge ran the neighbour; the fix opens the LEFT option left and the RIGHT
      // option right, past the pill's outer edge, never into the shared middle.
      const wordless = B.filter((b) => b.story === 'fixture:wordless-switch' && b.cls.split(/\s+/).includes('ui-seg--icon'));
      assert.equal(wordless.length, 2, `expected 2 wordless options, found ${wordless.length}`);
      const [left, right] = wordless;
      for (const b of wordless) {
        assert.ok(b.reach[0] >= 44 - 0.5 && b.reach[1] >= 44 - 0.5, `${name(b)} reaches ${b.reach.join('x')}, not 44x44`);
      }
      // The outer side opens past the pill's edge, not by centring into the gap.
      assert.ok(left.sides[0] >= 13, `the left option opens ${left.sides[0]}px left, not past the pill's edge`);
      assert.ok(right.sides[1] >= 13, `the right option opens ${right.sides[1]}px right, not past the pill's edge`);
      // The shared middle is respected: neither option crosses the gap's midpoint.
      assert.ok(left.sides[1] <= 4, `the left option reaches ${left.sides[1]}px into the gap, crossing the shared middle`);
      assert.ok(right.sides[0] <= 4, `the right option reaches ${right.sides[0]}px into the gap, crossing the shared middle`);
      // No drawn pixel runs the neighbour.
      assert.deepEqual(left.lost, [], `the left option has a drawn pixel the neighbour owns`);
      assert.deepEqual(right.lost, [], `the right option has a drawn pixel the neighbour owns`);
    });

    await t.test('a wordless option that reads the strip clearance instead of the outer one is rejected', async () => {
      // The mutation: put the 4px shadow back on every strip, so the wordless
      // options read 4px instead of the tools' 20px and fall short of 44px —
      // the 32px target the review measured. The check above has to fail on it.
      const broken = withCss.replace(
        /\.ui-seg:not\(:has\(button\.ui-seg--icon\)\) \{ --tap-clear-x: var\(--space-1, 4px\); \}/,
        '.ui-seg { --tap-clear-x: var(--space-1, 4px); }',
      );
      assert.notEqual(broken, withCss, 'The mutation did not apply, so it proves nothing.');
      const own = fixtures.filter((f) => f.id === 'fixture:wordless-switch');
      const mutated = flatten((await at(390, true, broken, own)).rows)
        .filter((b) => b.cls.split(/\s+/).includes('ui-seg--icon'));
      assert.equal(mutated.length, 2, `expected 2 wordless options, found ${mutated.length}`);
      assert.ok(
        mutated.some((b) => b.reach[0] < 44),
        'A wordless option kept a 44px target after the outer clearance was shadowed again, so '
        + 'the check above would pass over the defect it was written for.',
      );
      t.diagnostic(`shadowed clearance: ${mutated.map((b) => `${name(b)} ${b.reach.join('x')}`).join(' / ')}`);
    });

    await t.test('every density of a selectable table is measured, header and rows', () => {
      const boxes = B.filter((b) => SELECTABLE.test(b.story) && b.cls === '' && b.tag === 'input');
      for (const density of ['default', 'dense', 'compact']) {
        const mine = boxes.filter((b) => b.story === `fixture:selectable-${density}`);
        assert.equal(
          mine.length, 5,
          `${density}: ${mine.length} selection boxes measured, 5 expected (the header's and four `
          + 'rows’). A table that was not measured proves nothing about its rows.',
        );
        const reach = mine.map((b) => b.reach[1]);
        t.diagnostic(`${density}: layer reaches ${reach.join(', ')} px tall`);
        // The floor, not 44: a dense row must not buy its height with a neighbour's pixels.
        for (const b of mine) assert.ok(b.floorMiss === 0 || density !== 'default', `${density} box short of the floor: ${b.reach.join('x')}`);
        for (const b of mine) assert.ok(b.reach[1] >= 24 - 0.5, `${density} box reaches ${b.reach[1]}px tall, under the 24px floor.`);
      }
    });

    await t.test('a selection layer that grows down in a compact or dense table is rejected', async () => {
      const broken = withCss.replace(
        /\.ui-table--dense \.ui-table__selection,\s*\.ui-table--compact \.ui-table__selection \{[^}]*\}/,
        '',
      );
      assert.notEqual(broken, withCss, 'The mutation did not apply, so it proves nothing.');
      const mutated = flatten((await at(390, true, broken)).rows);
      const was = new Set(stolenIn(A));
      const added = stolenIn(mutated).filter((p) => !was.has(p));
      assert.ok(
        added.some((p) => /selectable-compact/.test(p)) && added.some((p) => /selectable-dense/.test(p)),
        'A selection layer reaching 44px down in a dense and a compact table took no point from '
        + 'the box beside it, so the check above would pass over the defect it was written for. '
        + `Saw: ${added.slice(0, 4).join('; ') || 'nothing'}`,
      );
      t.diagnostic(`a 44px selection layer takes ${added.length} point(s) from a neighbour — the check rejects it`);
    });

    await t.test('the floor is reached where the layout has the room', () => {
      const reached = (rows) => rows.filter((r) => r.floorMiss === 0).length;
      const gained = reached(B) - reached(A);
      assert.ok(
        gained >= 100,
        `Only ${gained} more targets reach ${TAP_MIN}x${TAP_MIN} with the sheet than without `
        + `(${reached(A)} → ${reached(B)}). The sheet is meant to buy a measurable number of `
        + 'them; a drop means a carrier stopped matching or a clearance was clamped to nothing.',
      );

      // Every family the sheet names has to be LIVE — some target of it must
      // reach further than it did. A family that gains nothing is a selector
      // that stopped matching, or a clearance clamped to zero, and either way
      // the sheet claims a reach it does not deliver.
      //
      // Whether a family then CLEARS 44 is a question for the layout around
      // it, reported below and stated on the guideline page rather than
      // asserted here. The kit's own gaps are 8 to 12px, a layer may take only
      // half of one, and widening them is the visible change #488 ruled out —
      // so some families land in the high thirties and the honest place for
      // that is the page, not a ledger entry pretending it is an exception.
      const dead = [];
      const report = [];
      for (const sel of carriers) {
        const mine = B.map((b, i) => [b, A[i]]).filter(([b]) => (b.fam || []).includes(sel));
        const grew = mine.filter(([b, a]) => b.reach[0] > a.reach[0] || b.reach[1] > a.reach[1]);
        const atFloor = mine.filter(([b]) => b.floorMiss === 0).length;
        if (mine.length && !grew.length) dead.push(sel);
        const best = mine.reduce((m, [b]) => Math.max(m, Math.min(b.reach[0], b.reach[1])), 0);
        report.push(
          `${sel}: ${mine.length} seen, ${grew.length} grew, ${atFloor} at the floor, `
          + `best ${Math.round(best)}px`,
        );
      }
      assert.deepEqual(
        dead, [],
        'These families are named in the sheet and no target of theirs reaches a pixel further '
        + 'with it loaded, so the layer is not live for them at all.',
      );
      t.diagnostic(`targets at the floor: ${reached(A)} → ${reached(B)} of ${B.length}`);
      for (const line of report) t.diagnostic(line);
    });

    // #868: a drawer title cut by its ellipsis is a Tab stop and a tap target. The title clips
    // its own text, so its layer hangs on the readout trigger around it.
    const CUT_TITLE = 'react-drawer--status-long-title';
    const cutTitles = (rows) => rows.filter((b) => b.story === CUT_TITLE && b.cls.split(/\s+/).includes('ui-drawer__title'));
    await t.test('a cut drawer title reaches the floor', () => {
      const titles = cutTitles(B);
      assert.equal(titles.length, 1, `${titles.length} cut titles measured in ${CUT_TITLE}, not 1.`);
      assert.deepEqual(titles.filter((b) => b.floorMiss > 0).map((b) => `${name(b)} ${b.reach.join('x')}`), []);
    });

    await t.test('a cut drawer title without its layer is rejected', async () => {
      const sheet = withCss.replace(/\.ui-drawer__lead > \.ui-tip-host > span:not\(\.ui-tip\) > \.ui-drawer__title::after \{[^}]*\}/, '');
      assert.notEqual(sheet, withCss, 'The mutation did not apply, so it proves nothing.');
      const titles = cutTitles(flatten((await at(390, true, sheet, subjects.filter((s) => s.id === CUT_TITLE))).rows));
      assert.equal(titles.length, 1);
      assert.ok(titles[0].floorMiss > 0, `Without its layer the cut title still reached ${titles[0].reach.join('x')}.`);
    });

    // #885: a filter chip has no remove mark, so its trigger is the one control in it. Measured
    // at the three phone widths the review used, because the row wraps differently at each.
    // Limit: only the stories and fixtures that draw a chip, and only the chip's trigger.
    const CHIP_WIDTHS = [360, 390, 466];
    const chipSubjects = subjects.filter((s) => s.html.includes('ui-filter-bar__chip'));
    const chipTriggers = async (width, sheet) => flatten((await pass(browser, {
      subjects: chipSubjects, css: sheet, width, coarse: true, size: TAP_MIN,
      families: [...carriers, ...exempt], within: ['.ui-filter-bar__chip'],
    })).rows).filter((b) => b.within.length && b.cls.split(/\s+/).some((c) => c === 'ui-dropdown__trigger' || c === 'ui-query__remove'));
    await t.test('a filter chip trigger and a query chip remove mark reach 44 at 360, 390 and 466', async () => {
      assert.ok(chipSubjects.length >= 10, `${chipSubjects.length} subjects draw a filter chip, 10 or more expected.`);
      for (const width of CHIP_WIDTHS) {
        const off = await chipTriggers(width, without);
        const on = await chipTriggers(width, withCss);
        assert.ok(on.length >= 30, `${width}: ${on.length} chip triggers measured, 30 or more expected.`);
        assert.equal(on.length, off.length, `${width}: the two runs found different chip triggers.`);
        assert.deepEqual(on.filter((b, i) => b.drawn.join() !== off[i].drawn.join()).map((b) => `${b.story} ${name(b)}`), [],
          `${width}: the sheet changed how big a chip trigger draws.`);
        assert.deepEqual(on.filter((b) => b.floorMiss > 0).map((b) => `${b.story} ${name(b)} reaches ${b.reach.join('x')}`), [],
          `${width}: a chip trigger misses the ${TAP_MIN}px floor.`);
        assert.deepEqual(on.filter((b, i) => b.lostTo.length > off[i].lostTo.length).map((b) => `${b.story} ${name(b)} <- ${b.lostTo.map(([, w]) => w)}`), [],
          `${width}: a chip trigger lost a drawn pixel to another control.`);
        // #866: a query chip's remove mark is measured too, so a sweep that stopped reading it fails.
        assert.ok(on.filter((b) => b.cls.split(/\s+/).includes('ui-query__remove')).length >= 3, `${width}: fewer than 3 query chip remove marks measured.`);
        t.diagnostic(`${width}: ${on.length} chip triggers, drawn height ${[...new Set(on.map((b) => b.drawn[1]))].join('/')}, `
          + `smallest reach ${Math.min(...on.map((b) => Math.min(...b.reach)))}`);
      }
    });

    // #866: the wordless view switch at the end of a query toolbar. Each option reaches 44.
    // A story with an open menu, panel or dialog covers the switch with that part, so it is not a
    // subject. The sidebar's fold button is always expanded and opens nothing over the page.
    const viewSubjects = subjects.filter((s) => s.html.includes('ui-query') && s.html.includes('ui-seg--icon')
      && !/aria-modal="true"|<(?![^>]*ui-app__fold)[^>]*aria-expanded="true"/.test(s.html));
    await t.test('a view option on a query toolbar reaches 44 at 360, 390 and 466', async () => {
      assert.ok(viewSubjects.length >= 2, `${viewSubjects.length} subjects draw a query toolbar view switch, 2 or more expected.`);
      // The options open outward, past the pill's edge, as the wordless switch above does.
      // So the check reads the reach and the side into the shared middle, not a centred square.
      for (const width of CHIP_WIDTHS) {
        const on = flatten((await pass(browser, {
          subjects: viewSubjects, css: withCss, width, coarse: true, size: TAP_MIN,
          families: [...carriers, ...exempt], within: ['.ui-toolbar:has(> .ui-query) > .ui-seg'],
        })).rows).filter((b) => b.within.length && b.cls.split(/\s+/).includes('ui-seg--icon'));
        assert.ok(on.length >= 4, `${width}: ${on.length} view options measured, 4 or more expected.`);
        assert.deepEqual(on.filter((b) => b.reach[0] < TAP_MIN - 0.5 || b.reach[1] < TAP_MIN - 0.5)
          .map((b) => `${b.story} ${name(b)} reaches ${b.reach.join('x')}`), [],
        `${width}: a view option misses the ${TAP_MIN}px floor.`);
        assert.deepEqual(on.filter((b) => Math.min(b.sides[0], b.sides[1]) > 4)
          .map((b) => `${b.story} ${name(b)} opens ${b.sides.slice(0, 2).join(' and ')}`), [],
        `${width}: a view option crosses the shared middle.`);
        assert.deepEqual(on.filter((b) => b.lost.length).map((b) => `${b.story} ${name(b)}`), [],
          `${width}: a view option has a drawn pixel that another control owns.`);
      }
    });

    await t.test('a chip that shuts its clearance again is rejected', async () => {
      const shut = withCss.replace(/(\.ui-filter-bar \{ gap: var\(--tap-gap\) !important;[^}]*\})/,
        '$1\n  .ui-filter-bar__chip { --tap-clear-x: 0px; --tap-clear-y: 0px; }');
      assert.notEqual(shut, withCss, 'The mutation did not apply, so it proves nothing.');
      const short = (await chipTriggers(390, shut)).filter((b) => b.floorMiss > 0);
      assert.ok(short.length > 0, 'Chip triggers under a zero clearance still reached 44, so the check above holds nothing.');
      t.diagnostic(`a shut chip clearance leaves ${short.length} trigger(s) under the floor, at ${short[0].reach.join('x')}`);
    });

    // The selection bar's Clear draws a 4px band as its border, so its layer starts inside the
    // band and needs the count's own clearance to reach 44. Limit: only Clear, at the three
    // phone widths, and the bar's clearance lives in the React sheet, which both passes load.
    const clearSubjects = subjects.filter((s) => s.html.includes('ui-selection-bar__count'));
    const clears = async (width, sheet) => flatten((await pass(browser, {
      subjects: clearSubjects, css: sheet, width, coarse: true, size: TAP_MIN,
      families: [...carriers, ...exempt], within: ['.ui-selection-bar__count'],
    })).rows).filter((b) => b.within.length && b.cls.split(/\s+/).includes('ui-selection-bar__control'));
    await t.test('the selection bar\'s Clear reaches 44 at 360, 390 and 466', async () => {
      assert.ok(clearSubjects.length >= 4, `${clearSubjects.length} subjects draw a selection bar, 4 or more expected.`);
      for (const width of CHIP_WIDTHS) {
        const on = await clears(width, withCss);
        // A guideline page draws more than one bar, so each subject gives one Clear or more.
        assert.deepEqual(clearSubjects.filter((s) => !on.some((b) => b.story === s.id)).map((s) => s.id), [],
          `${width}: a subject that draws a selection bar had no Clear measured.`);
        assert.deepEqual(on.filter((b) => b.floorMiss > 0).map((b) => `${b.story} ${name(b)} reaches ${b.reach.join('x')}`), [],
          `${width}: the selection bar's Clear misses the ${TAP_MIN}px floor.`);
        assert.deepEqual(on.filter((b) => b.lostTo.some(([, w]) => w !== 'nothing')).map((b) => `${b.story} ${name(b)} <- ${b.lostTo.map(([, w]) => w)}`), [],
          `${width}: the selection bar's Clear lost a drawn pixel to another control.`);
        t.diagnostic(`${width}: ${on.length} Clear controls, smallest reach ${Math.min(...on.map((b) => Math.min(...b.reach)))}`);
      }
    });

    await t.test('a Clear on the bar\'s own clearance is rejected', async () => {
      const shut = withCss.replace(/\.ui-selection-bar__count \{\s*--tap-clear-y: var\(--tap-gap\);\s*\}/, '');
      assert.notEqual(shut, withCss, 'The mutation did not apply, so it proves nothing.');
      const short = (await clears(390, shut)).filter((b) => b.floorMiss > 0);
      assert.ok(short.length > 0, 'Clear on the bar\'s 16px clearance still reached 44, so the check above holds nothing.');
      t.diagnostic(`the bar's clearance leaves ${short.length} Clear control(s) under the floor, at ${short[0].reach.join('x')}`);
    });

    await t.test('no target reaches less than it did without the sheet', async () => {
      // The floor only ever goes up. The gate used to assert that the COUNT of
      // targets at 44 rises, which is a different claim: at 992c2a2 every
      // checkbox and radio in the kit quietly fell from a 24px hit layer to 22
      // — under the kit's own 2.5.8 minimum — and the count still rose, because
      // the checkbox is not on the per-family list and nothing printed its
      // number. A per-target floor catches that whoever is looking.
      // Half a pixel of slack: a reach is sampled on the integer grid, so a box
      // whose edge moves within one pixel can read one either way. A side the
      // viewport edge stops is not counted: a gap that wraps a control to x=0
      // takes no reach from it there.
      const shrunk = [];
      for (let i = 0; i < B.length; i++) {
        if (shrinks(B[i], A[i], TAP_MIN)) {
          shrunk.push(`${B[i].story} — ${name(B[i])} ${A[i].reach.join('x')} → ${B[i].reach.join('x')}`);
        }
      }
      assert.deepEqual(
        shrunk.slice(0, 10), [],
        `${shrunk.length} target(s) reach LESS with this sheet loaded than without it. A floor `
        + 'that takes hit area away from a control has made the phone worse at the one width it '
        + 'is about. Check the clamp against the control’s own box: `100%` on an absolutely '
        + 'positioned pseudo-element is the PADDING box, so a control with a border measures '
        + 'smaller than it draws.',
      );
    });

    await t.test('a clamp that drops a layer under the kit’s own floor is rejected', async () => {
      // The mutation: 992c2a2's hand-written 5px clearance, which is what took
      // the checkbox to 22. The check above has to fail on it.
      const broken = withCss.replace(
        /\.ui-check input::before,\n(\s*)\.ui-toast__close::before \{/,
        '.ui-check input,\n$1.ui-toast__close { --tap-clear-x: 5px; --tap-clear-y: 5px; }\n'
        + '$1.ui-check input::before,\n$1.ui-toast__close::before {',
      ).replace(/max\(var\(--tap-aa\), (min\(max\(100%, var\(--tap-min\)\), calc\(100% \+ var\(--tap-clear-[xy]\)\)\))\)/g, '$1');
      assert.notEqual(broken, withCss, 'The mutation did not apply, so it proves nothing.');
      const mutated = flatten((await at(390, true, broken)).rows);
      const shrunk = mutated.filter((m, i) => shrinks(m, A[i], TAP_MIN));
      assert.ok(
        shrunk.length > 0,
        'Taking the --tap-aa floor off the two raised layers shrank nothing, so the check above '
        + 'would pass over the defect it was written for.',
      );
      t.diagnostic(`unfloored clamp shrinks ${shrunk.length} target(s) — the check rejects it`);
    });

    await t.test('every opened container has something inside it that grew', async () => {
      // The accent picker opened to --tap-gap and spread four swatches that
      // carry no layer at all: 0 of 4 gained a pixel. An opening that buys no
      // reach is a visible change for nothing.
      const grewIn = new Map(opened.map((sel) => [sel, 0]));
      const seenIn = new Map(opened.map((sel) => [sel, 0]));
      for (let i = 0; i < B.length; i++) {
        for (const sel of B[i].within || []) {
          seenIn.set(sel, (seenIn.get(sel) || 0) + 1);
          if (B[i].reach[0] > A[i].reach[0] || B[i].reach[1] > A[i].reach[1]) {
            grewIn.set(sel, (grewIn.get(sel) || 0) + 1);
          }
        }
      }
      const barren = opened.filter((sel) => seenIn.get(sel) > 0 && grewIn.get(sel) === 0);
      assert.deepEqual(
        barren, [],
        `${SHEET} opens ${barren.join(', ')} and no target inside reached a pixel further for it. `
        + 'The row is wider or taller and nothing uses the room — a visible change that buys no '
        + 'tap area. Put the control on the carrier list, or stop opening the row.',
      );
      for (const sel of opened) {
        t.diagnostic(`opened ${sel}: ${seenIn.get(sel)} targets seen, ${grewIn.get(sel)} grew`);
      }
    });

    await t.test('every control inside a specimen that opened its own room reaches the floor', async () => {
      // The gap the review of #492 found: the sheet's own containers are the
      // only ones `within` knew about, so a new positive example whose switches
      // measured 44x26 at 390 sat inside a green run. A specimen that declares
      // the clearance is making a claim about a finger, and this is where the
      // claim is checked. Not every control in the tree — the kit's own rows
      // land in the high thirties and the guideline page says so — only the
      // ones a specimen opened room for.
      const onLedger = new Set(exempt);
      const seen = new Map(specimens.map((sel) => [sel, 0]));
      const short = [];
      for (const b of B) {
        for (const sel of b.within || []) {
          if (!seen.has(sel)) continue;
          seen.set(sel, seen.get(sel) + 1);
          if (b.floorMiss === 0) continue;
          // A family on the ledger carries no layer at all, and the ledger
          // already says why; a specimen cannot answer for it.
          if ((b.fam || []).some((f) => onLedger.has(f))) continue;
          short.push(`${b.story} — ${name(b)} inside ${sel} reaches ${b.reach.join('x')}`);
        }
      }
      for (const [sel, n] of seen) {
        assert.ok(
          n > 0,
          `${sel} declares the phone clearance and no target was measured inside it. An `
          + 'unmeasured subject is a failure here: the selector was renamed, or the story that '
          + 'rendered it stopped rendering, and either way this check now holds nothing.',
        );
        t.diagnostic(`specimen ${sel}: ${n} targets measured, all at the floor`);
      }
      assert.deepEqual(
        short, [],
        `${short.length} control(s) sit inside a specimen that declares the phone clearance and `
        + `still do not reach ${TAP_MIN}x${TAP_MIN}. The container opened the room and the layer `
        + 'did not take it: check that the control is on the carrier list in '
        + `${SHEET}, and that the clearance is at least ${TAP_MIN} minus the control's PADDING `
        + 'box, which is smaller than it draws wherever it has a border.',
      );
    });

    await t.test('every control in the Button gallery reaches the floor', async () => {
      // The gallery shows a consumer how to place a button, so its specimens stand
      // in kit rows that open the room. Limit: only the React Button gallery is held.
      // The other component galleries still place controls outside such rows. #903
      const GALLERY = 'react-button--';
      const mine = B.filter((b) => b.story.startsWith(GALLERY));
      assert.ok(
        new Set(mine.map((b) => b.story)).size >= 7 && mine.length >= 10,
        `${mine.length} targets measured in the Button gallery. The gallery has seven stories `
        + 'and ten controls, so a smaller count is a story that stopped rendering.',
      );
      const short = mine.filter((b) => b.floorMiss > 0)
        .map((b) => `${b.story} — ${name(b)} reaches ${b.reach.join('x')}`);
      assert.deepEqual(
        short, [],
        `${short.length} Button gallery control(s) do not reach ${TAP_MIN}x${TAP_MIN}. Place the `
        + 'specimen in a kit row that declares the phone clearance, such as .ui-toolbar.',
      );
      // The mutation: the gallery as it stood at 8473a5c3, with no kit row around a button.
      const bare = subjects.filter((s) => s.id.startsWith(GALLERY))
        .map((s) => ({ ...s, html: s.html.replace(/class="ui-toolbar"/g, '') }));
      const missed = flatten((await at(390, true, withCss, bare)).rows).filter((b) => b.floorMiss > 0);
      assert.ok(
        missed.length > 0,
        'The Button gallery without its kit rows still reached the floor, so the check above '
        + 'would pass over the defect it was written for.',
      );
      t.diagnostic(`Button gallery: ${mine.length} targets at the floor; ${missed.length} miss it without the kit rows`);
    });

    await t.test('this gate rejects a specimen whose clearance is taken away', async () => {
      // The mutation: the Drawers page before the review of #492 — the same
      // rows, packed, with no clearance declared. The check above has to fail
      // on it or it is checking nothing.
      let cut = 0;
      const shut = subjects.map((s2) => {
        const html = s2.html.replace(/--tap-clear-[xy]:\s*var\(--tap-(?:min|gap|aa)\);?/g, '');
        if (html !== s2.html) cut++;
        return { ...s2, html };
      });
      assert.ok(cut > 0, 'The mutation reached no subject, so it proves nothing.');
      const mutated = flatten((await at(390, true, withCss, shut)).rows);
      const missing = mutated.filter((m) => (m.within || []).some((sel) => specimens.includes(sel)))
        .filter((m) => m.floorMiss > 0);
      assert.ok(
        missing.length > 0,
        'Taking every specimen clearance out of the markup left every control inside those '
        + 'containers at the floor, which means the check above would pass over the defect it '
        + 'was written for.',
      );
      t.diagnostic(`${cut} subject(s) stripped; ${missing.length} target(s) then miss the floor — the check rejects it`);
    });

    await t.test('a zone sized to the floor with the gaps shut is rejected', async () => {
      // The mutation, and it has to close the gaps as well as unclamp the zone:
      // once the kit's own rows open to --tap-gap, an unclamped zone has the
      // room and crosses nothing. Shutting them and reaching 44 anyway is
      // exactly what #488's first pass did, and the check above has to fail on
      // it or it is checking nothing.
      const broken = withCss
        .replace('--tap-gap: var(--space-5, 20px);', '--tap-gap: 0px;')
        .replace(
          /--tap-clear-x: var\(--tap-gap\);\n\s*--tap-clear-y: var\(--tap-gap\);/,
          '--tap-clear-x: 999px;\n  --tap-clear-y: 999px;',
        );
      assert.notEqual(broken, withCss, 'The mutation did not apply, so it proves nothing.');
      const collisions = (rows) => new Set(rows.flatMap((r) => r.lostTo
        .filter(([, to]) => to !== 'nothing')
        .map(([, to]) => `${r.story} — ${name(r)} <- ${to.split(' “')[0]}`)));
      const already = collisions(A);
      const added = [...collisions(flatten((await at(390, true, broken)).rows))]
        .filter((pair) => !already.has(pair));
      assert.ok(
        added.length > 0,
        'An unclamped layer put no control’s drawn pixels under another control, which means '
        + 'the check above would pass over the very defect it was written for.',
      );
      t.diagnostic(`zones at the floor with the gaps shut add ${added.length} colliding pair(s) — the check rejects it`);
    });

    await t.test('a menu row whose layer reaches into the next row is rejected', async () => {
      // The case the whole-pixel sampling could have excused, and the one the
      // message above names: a menu row's layer reaching past a shared edge
      // into the row below, which on an action menu is the destructive row.
      const broken = `${withCss}\n.ui-dropdown__item { position: relative; }\n`
        + '.ui-dropdown__item::after { content: ""; position: absolute; left: 50%; top: 50%;'
        + ' transform: translate(-50%, -50%); width: 100%;'
        + ' height: calc(100% + var(--tap-gap)); }\n';
      assert.notEqual(broken, withCss, 'The mutation did not apply, so it proves nothing.');
      const collisions = (rows) => new Set(rows.flatMap((r) => r.lostTo
        .filter(([, to]) => to !== 'nothing')
        .map(([, to]) => `${r.story} — ${name(r)} <- ${to.split(' \u201c')[0]}`)));
      const already = collisions(A);
      const added = [...collisions(flatten((await at(390, true, broken)).rows))]
        .filter((pair) => !already.has(pair));
      const rows = added.filter((pair) => /ui-dropdown__item.*<- div\.ui-dropdown__item/.test(pair));
      assert.ok(
        rows.length > 0,
        'A layer reaching half of --tap-gap past every menu row put no row\'s drawn pixels '
        + 'under the row below it, so the collision check is sampling too little to see the '
        + 'defect it exists for.',
      );
      t.diagnostic(`an overreaching menu-row layer adds ${added.length} colliding pair(s), ${rows.length} row-on-row — the check rejects it`);
    });

    await t.test('a layer reaching over a fractional edge is rejected, and a shared pixel is not', async () => {
      // The narrowing this rig carried for one round read only the pixels a box wholly
      // covers, which hid a layer reaching 8.2px into the box beside it whenever that box's
      // own edge fell on a fraction. Measured by click: the same tap at (100.5, 40.5) runs
      // Keep without the layer and Delete with it, and the narrowed rig reported nothing
      // either way. Reading every pixel centre the box holds sees it; the one pixel two
      // ABUTTING boxes share is answered by asking who took it instead, so the rounding
      // award that reads the same with no sheet loaded is still forgiven. Both halves are
      // measured here, because each one is the other's failure mode. #496, #518
      const GAP = '#safe,#danger{position:absolute;top:20.2px;height:44px;width:80.6px;border:0;border-radius:0}'
        + '#safe{left:20.2px}#danger{left:108.8px}'
        + '#danger::after{content:"";position:absolute;inset:0;left:var(--reach,0px)}';
      const ABUT = '#first,#second{position:absolute;left:10px;width:120px;height:20.7px;border:0;border-radius:0}'
        + '#first{top:10px}#second{top:30.7px}';
      const pair = (a, b) => `<button id="${a}">Keep</button><button id="${b}">Delete</button>`;
      const edge = [
        { id: 'fractional-gap', html: pair('safe', 'danger') },
        { id: 'abutting-rows', html: pair('first', 'second') },
      ];
      const took = async (reach) => {
        const rows = flatten((await at(390, true, `${GAP}${ABUT}:root{--reach:${reach}}`, edge)).rows);
        return Object.fromEntries(edge.map((s) => [s.id, rows
          .filter((r) => r.story === s.id && r.text === 'Keep')
          .flatMap((r) => r.lostTo.map(([, who]) => who))]));
      };
      const clean = await took('0px');
      assert.deepEqual(
        clean['fractional-gap'], [],
        'The fixture is dirty before the mutation, so the mutation below proves nothing.',
      );
      assert.deepEqual(
        clean['abutting-rows'], [],
        'The one pixel row two abutting controls share is being read as an overreach. Chromium '
        + 'awards it by rounding and answers the same with no sheet loaded, so this is the false '
        + 'positive narrowing the sampling was meant to answer — and the narrowing is what hid '
        + 'the case below.',
      );
      const broken = await took('-8.2px');
      assert.ok(
        broken['fractional-gap'].some((who) => /Delete/.test(who)),
        'A layer reaching 8.2px over a fractional edge took a point a tap lands on — measured by '
        + 'click, the same tap runs Keep without the layer and Delete with it — and the rig did '
        + 'not see it. The sampling is reading too little again.',
      );
      assert.deepEqual(
        broken['abutting-rows'], [],
        'The abutting pair carries no layer in either run, so anything it reports here is the '
        + 'sampling and not the sheet.',
      );
      t.diagnostic(`fractional edge: ${broken['fractional-gap'].join(', ') || 'nothing'} took the point, and the shared pixel row stays forgiven`);
    });

    await t.test('1280 and a fine pointer are untouched', async () => {
      for (const [width, coarse] of [[1280, false], [390, false]]) {
        const off = flatten((await at(width, coarse, without)).rows);
        const on = flatten((await at(width, coarse, withCss)).rows);
        assert.equal(off.length, on.length, `${width}px: the two runs found different targets.`);
        const differing = on.filter((t2, i) =>
          JSON.stringify([t2.drawn, t2.reach, t2.floorMiss, t2.lost])
          !== JSON.stringify([off[i].drawn, off[i].reach, off[i].floorMiss, off[i].lost]));
        assert.deepEqual(
          differing.slice(0, 6).map((d) => `${d.story} ${name(d)}`), [],
          `At ${width}px with pointer ${coarse ? 'coarse' : 'fine'} the sheet changed `
          + `${differing.length} target(s). It is supposed to reach nothing there: 1280 is above `
          + 'the step, and a fine pointer is the clause that keeps a cursor off a layer it is '
          + 'not over.',
        );
      }
    });
  } finally {
    await browser.close();
  }
});

/* A scroll panel shows its first row and clips the next two. Under the panel, a button's
 * tap layer reaches up over the clipped rows' layout boxes. A tap there runs the button,
 * which is correct, because the rows are not drawn there. The mutation reads each row's
 * layout box, as the probe did before #902, and must report the rows as losing pixels to
 * the button. Limit: one panel that clips on the block axis. The sweep holds the rest. */
test('a row that a scroll panel clips has no drawn pixel under the panel', { skip: !RUN && 'set TAP_ZONES=1' }, async () => {
  const { PROBE, playwright } = await import('./lib/tap-zone.js');
  const html = '<div style="height:40px;overflow:auto">'
    + '<button style="display:block;width:200px;height:40px">One</button>'
    + '<button style="display:block;width:200px;height:40px">Two</button>'
    + '<button style="display:block;width:200px;height:40px">Three</button></div>'
    + '<style>.t{position:relative;display:block;width:200px;height:20px;margin-top:100px}'
    + '.t::after{content:"";position:absolute;inset:-90px 0 0}</style><button class="t">Box</button>';
  const args = { html, size: TAP_MIN, interior: 8, families: [], within: [] };
  const source = PROBE.toString();
  const unclipped = source.replace('const drawnBox = (el) => {', 'const drawnBox = (el) => el.getBoundingClientRect();\n  const clipped = (el) => {');
  assert.notEqual(unclipped, source, 'The mutation found no drawnBox in the probe.');
  const browser = await (await playwright()).chromium.launch({ executablePath: process.env.UI_CHROME });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const thieves = async (probe) => (await page.evaluate(`(${probe})(${JSON.stringify(args)})`))
      .filter((t) => t.text !== 'Box').flatMap((t) => t.lostTo.map(([, to]) => `${t.text} ← ${to}`));
    assert.deepEqual(await thieves(source), [], 'A row that the panel clips lost pixels it does not draw.');
    const mutated = await thieves(unclipped);
    assert.ok(
      mutated.some((pair) => /^(Two|Three) ← button\.t/.test(pair)),
      `The probe without the clip reported ${JSON.stringify(mutated)}, so this case does not prove the clip.`,
    );
  } finally {
    await browser.close();
  }
});
