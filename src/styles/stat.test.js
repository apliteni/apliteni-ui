// What stat.css guarantees. jsdom lays nothing out and resolves no @container,
// so the layout guarantees are held by their structure and the fold widths by
// the reader page's table they were measured for; the cascade between the
// sheet's own rules is resolved in jsdom.
//
// Two reader pages are read, because the two tables live where their readers
// are: the type ranks are a foundation and the band's folds are the band's own.
// why: docs/components.md#stat-bands
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { statBand } from '../components/stat.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const RAW = readFileSync(path.join(here, 'stat.css'), 'utf8');
const CSS = decomment(RAW);
const FOUNDATIONS = readFileSync(path.join(here, '../../docs/foundations.md'), 'utf8');
const COMPONENTS_DOC = readFileSync(path.join(here, '../../docs/components.md'), 'utf8');
const TOKENS = readFileSync(path.join(here, '../tokens/tokens.css'), 'utf8');

const rules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter((m) => !m[1].trim().startsWith('@'))
  .map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }));
const valueOf = (body, prop) => (new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body) || [])[1]?.trim() ?? null;
const ruleFor = (selector) => rules.find((r) => r.selector === selector);

test('the sheet is being read', () => {
  assert.ok(rules.length >= 20, `parsed ${rules.length} rules out of stat.css`);
});

test('a figure never breaks across lines, and its digits sit on one grid', () => {
  const value = ruleFor('.ui-stat__value');
  assert.ok(value, '.ui-stat__value has no rule of its own');
  assert.equal(valueOf(value.body, 'white-space'), 'nowrap', 'a figure can break, and `€` can land on a line of its own');
  assert.equal(valueOf(value.body, 'font-variant-numeric'), 'tabular-nums');
  assert.equal(valueOf(ruleFor('.ui-stat__change').body, 'white-space'), 'nowrap', 'a change like −61.8% can break at its sign');
});

// A rule on the figure's <dd>s outranked the value's, change's and trend's own
// margins once, and every screenshot showed a value flush under its label.
test('each part of a figure keeps the spacing its own rule gives it', () => {
  const doc = new JSDOM(`<!doctype html><html><head><style>${RAW}</style></head><body>${statBand({
    stats: [
      { label: 'Income', value: '€ 1', delta: { value: '+1%' }, trend: '<svg width="1" height="1"></svg>' },
      { label: 'Gross margin', value: '36.1%', caption: 'of income' },
    ],
  })}</body></html>`).window;
  const margin = (sel) => doc.getComputedStyle(doc.document.querySelector(sel)).marginTop;
  for (const [sel, prop] of [['.ui-stat__value', 'margin-top'], ['dd.ui-stat__caption', 'margin-top'], ['.ui-stat__delta', 'margin-top'], ['.ui-stat__trend', 'margin-top']]) {
    assert.equal(margin(sel), valueOf(ruleFor(sel).body, prop), `${sel} lost its ${prop} to another rule in the sheet`);
  }
});

// The markup order — caption, then figures — is held in src/components/stat.test.js.
// This is the other half of it: a leading caption's air belongs under it, or the
// gap it used to open between itself and the figures moves outside the band.
test('the caption carries its space below it, because it leads the row', () => {
  const margin = valueOf(ruleFor('.ui-stats__basis').body, 'margin');
  assert.ok(margin, '.ui-stats__basis sets no margin');
  const sides = margin.split(/\s+(?![^(]*\))/);
  assert.equal(sides.length, 3, `margin: ${margin} — expected three sides, top x bottom`);
  assert.match(sides[0], /^0(px)?$/, `the caption keeps ${sides[0]} above it, and it leads the row`);
  assert.match(sides[2], /^var\(--space-\d+\)$/, `the caption's space below it is ${sides[2]}, not a spacing step`);
});

/** A rank's size and weight, read off the rank table in docs/foundations.md. */
const rankOf = (name) => {
  const m = new RegExp(`^\\|\\s*\`${name}\`\\s*\\|\\s*\`(--[\\w-]+)\`\\s*\\|\\s*\`(--[\\w-]+)\`\\s*\\|`, 'm').exec(FOUNDATIONS);
  assert.ok(m, `docs/foundations.md has no rank row for ${name}`);
  return { size: m[1], weight: m[2] };
};

// A figure's caption is a sentence under a number, so it takes the caption rank
// and not the label's: both are 13px and only the weight separates them, and at
// medium the caption would read as the bolder of the two lines under the value.
// Body ink and no fill, because it is words and not a mark.
test("a figure's caption is body ink at the caption rank, on no fill", () => {
  const rule = ruleFor('.ui-stat__caption');
  assert.ok(rule, '.ui-stat__caption has no rule of its own');
  const caption = rankOf('caption');
  assert.equal(valueOf(rule.body, 'font-size'), `var(${caption.size})`);
  assert.equal(valueOf(rule.body, 'font-weight'), `var(${caption.weight})`,
    `the caption is not the rank's weight — at the label's it reads as the bolder line under the value`);
  assert.equal(valueOf(rule.body, 'color'), 'var(--text)', 'the caption is not body ink');
  for (const prop of ['background', 'background-color', 'border', 'padding']) {
    assert.equal(valueOf(rule.body, prop), null, `the caption sets ${prop}; it is a sentence, not a mark`);
  }
});

/* A caption alone and a change are the one row a figure draws under its value,
 * so the two have to be the same box or a band whose figures differ drops half
 * its changes a line lower — measured at 26.2px before this rule, in #512's
 * review. jsdom lays nothing out, so what is held here is the cascade behind
 * that box: the step down to the row and the two things that set its line box.
 * It does not measure the rendered tops, which is why the band is also drawn
 * mixed in the showcase. */
test('a caption alone and a change take the same row box, so a mixed band keeps one line', () => {
  const doc = new JSDOM(`<!doctype html><html><head><style>${RAW}</style></head><body>${statBand({
    basis: 'Against last year',
    id: 'mixed',
    stats: [
      { label: 'Gross margin', value: '36.1%', caption: 'of income' },
      { label: 'Income', value: '€ 1', delta: { value: '+47.1%' } },
    ],
  })}</body></html>`).window;
  const [cap, delta] = ['.ui-stat__caption', '.ui-stat__delta'].map((sel) => doc.getComputedStyle(doc.document.querySelector(sel)));
  for (const prop of ['marginTop', 'fontSize', 'lineHeight']) {
    assert.equal(cap[prop], delta[prop],
      `the caption's ${prop} is ${cap[prop]} and the change's is ${delta[prop]}, so one sits lower than the other`);
  }
  assert.ok(cap.marginTop && cap.fontSize && cap.lineHeight, 'the cascade resolved nothing, so this compared two blanks');
});

/* The one-row guarantee in src/components/stat.test.js is a markup guarantee: it
 * counts <dd>s, and a row that wrapped would still be one. This is the other
 * half — the row is one LINE. A change that wrapped put its arrow at the end of
 * one line and its number at the start of the next, and a caption long enough to
 * wrap dropped its own change 20.1px below the changes beside it, measured in
 * #512's re-review at 32 characters in a 296px tile.
 *
 * jsdom lays nothing out, so what is held here is the cascade that makes the
 * line unbreakable: the row does not wrap, the arrow and the number cannot give
 * way, and the words can. It does not measure a rendered width — the showcase
 * draws a caption past the tile's width for that. */
test('a change is one line: the arrow keeps its number, and the words clip instead', () => {
  const doc = new JSDOM(`<!doctype html><html><head><style>${RAW}</style></head><body>${statBand({
    stats: [{ label: 'Operating margin', value: '12.4%', caption: 'of income before tax and refunds', delta: { value: '+1.2 pts', basis: 'against the 40% target' } }],
  })}</body></html>`).window;
  const style = (sel) => doc.getComputedStyle(doc.document.querySelector(sel));
  assert.equal(style('.ui-stat__delta').flexWrap, 'nowrap', 'the change can wrap, so its arrow can land on a line without its number');
  for (const sel of ['.ui-stat__delta svg', '.ui-stat__change']) {
    // `flex: none` resolves to its longhands; the middle one is what matters.
    assert.equal(style(sel).flexShrink, '0', `${sel} can give way, and then the number it belongs to moves`);
  }
  for (const sel of ['.ui-stat__delta .ui-stat__caption', '.ui-stat__basis']) {
    const got = style(sel);
    assert.equal(got.minWidth, '0px', `${sel} cannot shrink, so a long one widens the row instead of clipping`);
    assert.equal(got.overflow, 'hidden', `${sel} spills out of the figure`);
    assert.equal(got.textOverflow, 'ellipsis', `${sel} is cut with no mark that it was cut`);
    assert.equal(got.whiteSpace, 'nowrap', `${sel} takes a second line of its own`);
  }
  // Clipping is CSS, so the whole string a caller passed is still in the markup
  // for a screen reader and for a copy. This is what makes clipping acceptable.
  assert.equal(doc.document.querySelector('.ui-stat__caption').textContent, 'of income before tax and refunds');
  // And clipping has to be what happens. A figure is never narrower than its own
  // content, so a line free to size itself widens the figure and takes the room
  // from the figures beside it rather than giving way. Measured in Chrome before
  // these three: a 39-character caption made its tile 363px beside 263px
  // neighbours; after them every tile is 288px and the caption clips.
  for (const sel of ['.ui-stat__delta .ui-stat__caption', '.ui-stat__basis']) {
    const got = style(sel);
    assert.equal(got.width, '0px', `${sel} starts from its own text, so its text sets the figure's width`);
    assert.equal(got.maxWidth, 'max-content', `${sel} grows past its own text and pushes the change away`);
    assert.equal(got.flexGrow, '1', `${sel} never reaches its own text, because nothing grows it`);
  }
  // The lone caption is a block, not a flex item, so it is bounded the other way.
  const alone = new JSDOM(`<!doctype html><html><head><style>${RAW}</style></head><body>${statBand({
    stats: [{ label: 'Gross margin', value: '36.1%', caption: 'March revenue in EUR, excluding refunds' }],
  })}</body></html>`).window;
  assert.equal(alone.getComputedStyle(alone.document.querySelector('dd.ui-stat__caption')).contain, 'inline-size',
    'a caption alone sizes its figure by its text instead of being sized by it');
});

/* One row holds words and nothing else: a caption with no change beside it. It
 * has no arrow and no number to keep together, which is the only reason the clip
 * exists, so it is not clipped — a second line costs nobody anything and losing
 * words costs the reader the whole point of them. The clip reached it once, and
 * 43% of a caption went.
 *
 * Measured on the elements themselves rather than on the row around them: a test
 * that read the row's `flex-wrap` passed while the caption inside it could not
 * break. jsdom lays nothing out, so what this holds is which rules reach which
 * element; the showcase draws a caption past the width in both rows for the rest. */
test('a caption standing alone keeps every word, and the change row clips', () => {
  const win = (stats) => new JSDOM(`<!doctype html><html><head><style>${RAW}</style></head><body>${statBand({ stats })}</body></html>`).window;
  const LONG = 'March revenue in EUR, excluding refunds';
  const alone = win([{ label: 'Gross margin', value: '36.1%', caption: LONG }]);
  const clipped = win([{ label: 'Net margin', value: '8.0%', caption: LONG, delta: { value: '+0.4 pts' } }]);
  const styleOf = (w, sel) => w.getComputedStyle(w.document.querySelector(sel));

  const standing = styleOf(alone, 'dd.ui-stat__caption');
  assert.notEqual(standing.whiteSpace, 'nowrap', 'a caption alone cannot break, so a long one is cut rather than wrapped');
  assert.notEqual(standing.overflow, 'hidden', 'a caption alone is clipped, and it has no arrow to keep beside a number');

  // The control: the same string in the row that does hold a change still clips,
  // so the scoping above did not simply switch the clip off.
  const inRow = styleOf(clipped, '.ui-stat__delta .ui-stat__caption');
  assert.equal(inRow.whiteSpace, 'nowrap', 'the caption beside a change may break, and then the change drops below its neighbours');
  assert.equal(inRow.overflow, 'hidden', 'the caption beside a change is not clipped');
});

/* The band's caption governs every figure and a figure's caption governs one,
 * so the wider statement is never set smaller. Both sit on the caption rank;
 * this reads the px behind the tokens so a later edit to either one fails. */
test("the band's caption is never set under a caption inside one figure", () => {
  const size = (rule) => {
    const token = /var\((--[\w-]+)\)/.exec(valueOf(rule.body, 'font-size') ?? '');
    assert.ok(token, `${rule.selector} does not set its font-size from a token`);
    const px = new RegExp(`${token[1]}\\s*:\\s*([\\d.]+)px`).exec(TOKENS);
    assert.ok(px, `${token[1]} is not a px value in src/tokens/tokens.css`);
    return Number(px[1]);
  };
  const band = size(ruleFor('.ui-stats__basis'));
  const figure = size(ruleFor('.ui-stat__caption'));
  assert.ok(band >= figure,
    `the band's caption is ${band}px and a figure's is ${figure}px, so the eye lands on one figure's words first`);
});

// The two tests above hold which parts a tone paints. This holds that the
// caption is not one of them: it reports no change, so there is no news to colour.
test('no tone reaches a figure\'s caption', () => {
  const painted = rules.filter((r) => r.selector.includes('.ui-stat__caption') && /color/.test(r.body));
  assert.deepEqual(painted.map((r) => r.selector), ['.ui-stat__caption'],
    'a second rule colours the caption, and the only colour it takes is body ink');
  // Leading a change, the caption sits inside the element a tone paints, so the
  // rule above is not enough on its own: this is the cascade resolved.
  const doc = new JSDOM(`<!doctype html><html><head><style>${RAW}</style></head><body>${statBand({
    variant: 'band',
    stats: [{ label: 'Operating margin', value: '12.4%', caption: 'of income', delta: { value: '+1.2 pts', tone: 'good' } }],
  })}</body></html>`).window;
  const colour = (sel) => doc.getComputedStyle(doc.document.querySelector(sel)).color;
  assert.equal(colour('.ui-stat__caption'), 'var(--text)', 'the figure\'s tone painted the caption beside the change');
  assert.equal(colour('.ui-stat__delta'), 'var(--chip-success-ink)', 'the tone stopped reaching the change, so this compared nothing');
});

test('a figure is never narrower than its value, so a band wraps rather than overlaps', () => {
  assert.equal(valueOf(ruleFor('.ui-stats__list').body, 'flex-wrap'), 'wrap', 'a band that cannot wrap has to overflow');
  assert.equal(valueOf(ruleFor('.ui-stat').body, 'min-width'), 'min-content',
    'a figure may shrink below its own value, and the nowrap value then runs into the next one');
  const zeroed = rules.filter((r) => /\.ui-stat\b(?!_)/.test(r.selector) && /^0(px)?$/.test(valueOf(r.body, 'min-width') ?? ''));
  assert.deepEqual(zeroed.map((r) => r.selector), [], 'a later rule lets a figure shrink to nothing');
});

test('the band lays out from its own width, never the window\'s', () => {
  assert.equal(valueOf(ruleFor('.ui-stats').body, 'container-type'), 'inline-size');
  assert.doesNotMatch(CSS, /@media/, 'a fold keyed to the viewport: a band beside a rail is narrower than the window');
});

// Each selector in a list on its own: `.ui-stat__delta, .ui-stat--good .ui-stat__delta`
// carries the tone class and still paints every change.
test('colour on a change comes from its tone, never from its direction', () => {
  const painted = rules.filter((r) => /chip-(success|danger)-ink/.test(r.body));
  assert.ok(painted.length >= 4, `found ${painted.length} toned rules`);
  for (const r of painted) {
    for (const one of r.selector.split(',').map((s) => s.trim())) {
      assert.match(one, /^\.ui-stat--(good|bad) /, `${one} paints a change without asking its tone`);
    }
  }
  assert.doesNotMatch(CSS, /--(up|down|increase|decrease|rise|fall)\b/, 'a class keyed to direction');
});

// The rule above holds that only a tone paints. This holds which ink each tone
// takes, so good and bad cannot be swapped and still pass, and a tone nobody
// declared has no rule to paint it at all.
test('good news takes the success ink, bad news the danger ink, and nothing else is painted', () => {
  for (const part of ['delta', 'trend']) {
    for (const [tone, ink] of [['good', 'success'], ['bad', 'danger']]) {
      const rule = ruleFor(`.ui-stat--${tone} .ui-stat__${part}`);
      assert.ok(rule, `.ui-stat--${tone} .ui-stat__${part} has no rule, so ${tone} news is not painted`);
      assert.equal(valueOf(rule.body, 'color'), `var(--chip-${ink}-ink)`,
        `${tone} news is not painted with the ${ink} ink`);
    }
  }
  const tones = new Set(rules.flatMap((r) => [...r.selector.matchAll(/\.ui-stat--([a-z]+)\b/g)].map((m) => m[1])));
  assert.deepEqual([...tones].sort(), ['bad', 'good'],
    'the sheet paints a tone the component never sets, or stopped setting one it paints');
});

// The fold widths were measured in a browser over every layout at 2, 3 and 4
// figures, and docs/components.md carries the table. Each fold is read whole —
// its range, which figures it matches and the basis it sets — so a width, a
// basis or an overlap between two ranges moved in one place fails here.
/* Every `@container` block in the sheet, split by what it actually does: a FOLD
 * changes how many figures sit on a row (`flex-basis`), a STEP changes the rank
 * the figure is set in (`font-size`). Both are read from the same sweep, so a
 * new block of either kind has to be accounted for below rather than slipping
 * past a count that only knew about folds. */
const CONTAINER_BLOCKS = [...CSS.matchAll(/@container\s*\(([^)]*)\)\s*\{\s*([\s\S]*?)\n\}/g)]
  .flatMap(([, cond, inner]) => [...inner.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .map(([, sel, body]) => ({ cond, sel: sel.trim().replace(/\s+/g, ' '), body })));

test('the folds are the ones the specification records, and their ranges do not overlap', () => {
  const folds = CONTAINER_BLOCKS.filter((b) => valueOf(b.body, 'flex-basis')).map(({ cond, sel, body }) => {
    const upper = /width\s*<=\s*(\d+)rem/.exec(cond);
    const lower = /(\d+)rem\s*<\s*width/.exec(cond);
    assert.ok(upper, `a fold without an upper width: ${cond}`);
    const plain = sel.replace(':not(.ui-stats--open)', '');
    return {
      layout: plain.includes('.ui-stats--open') ? 'open' : 'band',
      kind: sel.includes(':nth-child(4):last-child') ? 'pairs' : sel.includes('nth-child(odd)') ? 'odd' : 'column',
      upper: Number(upper[1]),
      lower: lower ? Number(lower[1]) : 0,
      basis: valueOf(body, 'flex-basis'),
      excludesOpen: sel.includes(':not(.ui-stats--open)'),
    };
  });
  assert.equal(folds.length, 6, `found ${folds.length} folds`);
  const row = (name) => {
    const m = new RegExp(`^\\|\\s*${name}\\s*\\|\\s*(\\d+)rem\\s*\\|\\s*(\\d+)rem\\s*\\|\\s*(\\d+)rem\\s*\\|`, 'm').exec(COMPONENTS_DOC);
    assert.ok(m, `docs/components.md has no fold row for ${name}`);
    return { pairs: Number(m[1]), odd: Number(m[2]), column: Number(m[3]) };
  };
  for (const [layout, name] of [['band', 'Band and tiles'], ['open', 'Open']]) {
    const mine = Object.fromEntries(folds.filter((f) => f.layout === layout).map((f) => [f.kind, f]));
    const spec = row(name);
    for (const kind of ['pairs', 'odd', 'column']) {
      assert.equal(mine[kind]?.upper, spec[kind], `${layout} ${kind} folds at ${mine[kind]?.upper}rem, docs/components.md says ${spec[kind]}rem`);
    }
    // Two per row: more than a third, and room for the gap beside a half.
    const pct = Number.parseFloat(mine.pairs.basis);
    assert.ok(pct > 100 / 3 && pct < 50, `the pairs fold sets flex-basis ${mine.pairs.basis}, which is not two per row`);
    assert.equal(mine.odd.basis, '100%');
    assert.equal(mine.column.basis, '100%');
    // The pairs rule outranks the one-column rule, so it must stop where that one starts.
    assert.equal(mine.pairs.lower, mine.column.upper, `${layout}: two per row still applies below the one-column fold`);
  }
  assert.ok(folds.find((f) => f.layout === 'band' && f.kind === 'pairs').excludesOpen,
    'the band\'s pairs fold reaches the open layout, whose figures are wider');
});

/* The other thing a container width does, added for #505. Stacking runs out
 * before a phone does: one figure to a row, a value can still be wider than the
 * box holding it, and it may neither wrap nor truncate. Below the width where
 * its own figure stops fitting, the value takes the rank under it.
 *
 * Read the same way the folds are — from the sheet, against the table in the
 * specification — because the width is the whole guarantee and a number moved in
 * one place and not the other is the failure this catches.
 *
 * WHAT THIS DOES NOT REACH: whether the stepped rank actually fits. jsdom
 * resolves no @container and lays nothing out; the widths come from a browser
 * sweep of every band in the kit's own stories, recorded in the specification. */
test('the figure steps down at the width the specification records, one rank per layout', () => {
  const steps = CONTAINER_BLOCKS.filter((b) => valueOf(b.body, 'font-size'));
  assert.equal(steps.length, 2, `found ${steps.length} type steps, not one per layout`);

  const stepFor = (layout) => {
    const open = layout === 'open';
    // `:not(.ui-stats--open)` carries the open class as a substring, so the band's
    // own step answers a bare `includes` for the open one. Strip the guard first.
    const block = steps.find((b) => open
      ? b.sel.replace(':not(.ui-stats--open)', '').includes('.ui-stats--open')
      : b.sel.includes(':not(.ui-stats--open)'));
    assert.ok(block, `no step scoped to the ${layout} layout`);
    const upper = /width\s*<=\s*(\d+)rem/.exec(block.cond);
    assert.ok(upper, `the ${layout} step has no upper width: ${block.cond}`);
    return { upper: Number(upper[1]), size: valueOf(block.body, 'font-size'), sel: block.sel };
  };

  // The fourth column of the same table the folds are read from.
  const recorded = (name) => {
    const m = new RegExp(`^\\|\\s*${name}\\s*\\|\\s*\\d+rem\\s*\\|\\s*\\d+rem\\s*\\|\\s*\\d+rem\\s*\\|\\s*(\\d+)rem\\s*\\|`, 'm').exec(COMPONENTS_DOC);
    assert.ok(m, `the specification records no step width for ${name}`);
    return Number(m[1]);
  };

  // The rank each layout rests in, so the step is read as "the one below" rather
  // than as a literal this test would have to be told twice.
  const RANKS = ['--text-xs', '--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl'];
  const below = (token) => `var(${RANKS[RANKS.indexOf(token) - 1]})`;
  const resting = {
    band: valueOf(ruleFor('.ui-stat__value').body, 'font-size'),
    open: valueOf(ruleFor('.ui-stats--open .ui-stat__value').body, 'font-size'),
  };

  for (const [layout, name] of [['band', 'Band and tiles'], ['open', 'Open']]) {
    const step = stepFor(layout);
    assert.equal(step.upper, recorded(name),
      `the ${layout} figure steps at ${step.upper}rem, the specification says ${recorded(name)}rem`);
    const rest = /var\((--text-[a-z0-9]+)\)/.exec(resting[layout]);
    assert.ok(rest, `the ${layout} layout's resting size is not a rank token: ${resting[layout]}`);
    assert.equal(step.size, below(rest[1]),
      `the ${layout} step sets ${step.size}; one rank under ${resting[layout]} is ${below(rest[1])}`);
  }

  // A tile pads its figure and an open band does not, so the two stop fitting at
  // different widths. Equal widths would mean one of them was never measured.
  assert.notEqual(stepFor('band').upper, stepFor('open').upper,
    'both layouts step at the same width, which no measurement produced');
});
