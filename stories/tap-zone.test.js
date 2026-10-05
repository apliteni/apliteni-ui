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
  return m[1].split(',').map((x) => x.trim()).filter(Boolean);
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
  .flatMap((m) => m[1].split(',').map((sel) => ({ selector: sel.trim(), body: m[2] })));

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
      for (const sel of m[1].split(',')) {
        out.push({ selector: sel.trim(), body: m[2], where: `stories/${rel}` });
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
  .flatMap((r) => r.selector.split(',').map((x) => x.trim()));

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

/* -- The browser half ------------------------------------------------------- */

const RUN = process.env.TAP_ZONES === '1';

test('measured at 390 on a coarse pointer', { skip: !RUN && 'set TAP_ZONES=1' }, async (t) => {
  const { storySubjects, rowFixtures, kitStylesheet, pass, playwright, flatten, name } =
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
    stories.length >= 150,
    `${stories.length} stories rendered. The sweep is the coverage, and a sweep that collapsed `
    + 'to a handful would pass while measuring almost nothing.',
  );

  // Plus the rows no story puts on screen, and two a consumer would write.
  const fixtures = await rowFixtures();
  assert.ok(
    fixtures.length >= 9,
    `${fixtures.length} row fixtures. These are the gate's answer to a defect the story sweep `
    + 'could not see, and a list that shrank would quietly give that coverage back.',
  );
  const subjects = [...stories, ...fixtures];

  const withCss = kitStylesheet();
  const without = kitStylesheet({ without: ['styles/tap-zone.css'] });
  const browser = await (await playwright()).chromium.launch();

  try {
    // The exempt selectors ride along in `families` so a target can say it is on
    // the ledger; the per-family report below still walks `carriers` alone.
    const exempt = TAP_EXEMPT.map((e) => e.selector);
    const specimens = storyContainers.map((c) => c.selector);
    const at = (width, coarse, sheet, which = subjects) =>
      pass(browser, {
        subjects: which,
        css: sheet,
        width,
        coarse,
        size: TAP_MIN,
        families: [...carriers, ...exempt],
        within: [...opened, ...specimens],
      });

    const before = await at(390, true, without);
    const after = await at(390, true, withCss);

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

    await t.test('no control is drawn at a different size', () => {
      const moved = B.filter((b, i) => b.drawn[0] !== A[i].drawn[0] || b.drawn[1] !== A[i].drawn[1]);
      assert.deepEqual(
        moved.map((b) => `${b.story} ${name(b)} ${A[B.indexOf(b)]}`), [],
        'A control changed size with the sheet loaded. The whole premise of #488’s answer is '
        + 'that the drawn control does not move; a layer that changes layout is a visible change '
        + 'the issue rejected.',
      );
    });

    await t.test('no control has a drawn pixel that runs another control', () => {
      // Layout-independent, and it has to be: opening a row's gap MOVES the
      // controls in it, so "the point this control owned before" is no longer
      // a question with an answer. The property that survives is absolute —
      // a tap anywhere on a control's own drawn box runs that control — and
      // the comparison is by who collides with whom, not by where.
      //
      // The kit does not start clean: 73 pairs of its own controls already
      // overlap at 390 before any of this loads, most of them a shell whose
      // rail does not fold. So the test is that the set does not GROW.
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

    await t.test('no target reaches less than it did without the sheet', async () => {
      // The floor only ever goes up. The gate used to assert that the COUNT of
      // targets at 44 rises, which is a different claim: at 992c2a2 every
      // checkbox and radio in the kit quietly fell from a 24px hit layer to 22
      // — under the kit's own 2.5.8 minimum — and the count still rose, because
      // the checkbox is not on the per-family list and nothing printed its
      // number. A per-target floor catches that whoever is looking.
      const shrunk = [];
      for (let i = 0; i < B.length; i++) {
        const dx = B[i].reach[0] - A[i].reach[0];
        const dy = B[i].reach[1] - A[i].reach[1];
        // Half a pixel of slack: a reach is sampled on the integer grid, so a
        // box whose edge moves within one pixel can read one either way.
        if (dx < -0.5 || dy < -0.5) {
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
      const shrunk = mutated.filter((m, i) =>
        m.reach[0] - A[i].reach[0] < -0.5 || m.reach[1] - A[i].reach[1] < -0.5);
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
