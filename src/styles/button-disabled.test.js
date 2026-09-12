// why: CONTRIBUTING.md#disabled-button-measurements
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISABLED_FLOOR } from '../../stories/guidelines/_accessibility-floor.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');
const BUTTON_CSS = read('button.css');
const TOKENS = read('../tokens/tokens.css');

/* The grounds a button can land on. Every one is a background the kit itself
 * paints, so a disabled label can end up over any of them — discovered from the
 * token file rather than listed, so a fifth surface joins this gate by existing.
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them */
const GROUNDS = [...new Set(
  [...TOKENS.matchAll(/^\s*(--(?:bg|surface(?:-\d)?))\s*:/gm)].map((m) => m[1]),
)].sort();

/* One theme block's declarations. The themes redeclare the same names, so a
 * block is read whole rather than the file being scanned for a name. */
const themeVars = (theme) => {
  const at = TOKENS.indexOf(`:root[data-theme="${theme}"]`);
  assert.notEqual(at, -1, `no :root[data-theme="${theme}"] block in tokens.css`);
  const body = TOKENS.slice(at, TOKENS.indexOf('\n}', at));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)]
    .map((m) => [m[1], m[2].trim()]));
};

const resolve = (vars, name, depth = 0) => {
  const value = vars[name];
  if (value === undefined || depth > 12) return value;
  const alias = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value);
  return alias ? resolve(vars, alias[1], depth + 1) : value;
};

const rgb = (hex) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  assert.ok(m, `not a hex colour this gate can measure: ${hex}`);
  const full = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

/* WCAG 2.x relative luminance and contrast, the same arithmetic
 * stories/contrast.test.js runs. */
const luminance = (colour) => {
  const [r, g, b] = rgb(colour).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const THEMES = ['dark', 'light'];
const BARE_INK = '--disabled-ink-bare';

/* Every ground, in both themes, for one ink token. */
const onEveryGround = (ink) => {
  const measured = {};
  for (const theme of THEMES) {
    const vars = themeVars(theme);
    for (const ground of GROUNDS) {
      measured[`${theme} ${ground}`] = Number(contrast(resolve(vars, ink), resolve(vars, ground)).toFixed(2));
    }
  }
  return measured;
};

test('the surfaces a disabled label can land on are discovered, not listed', () => {
  assert.ok(GROUNDS.length >= 4,
    `only ${GROUNDS.length} ground tokens found — the sweep is reading almost nothing`);
  assert.ok(GROUNDS.includes('--surface-3'),
    '--surface-3 is the worst ground the ghost button reached, so it has to be in the set');
});

/* A disabled button that paints --disabled-surface reads its ink on that one
 * ground, wherever the button is put. */
test(`disabled ink clears ${DISABLED_FLOOR}:1 on the surface a disabled button paints for itself`, () => {
  const under = [];
  for (const theme of THEMES) {
    const vars = themeVars(theme);
    const ratio = contrast(resolve(vars, '--disabled-ink'), resolve(vars, '--disabled-surface'));
    if (Math.round(ratio * 100) / 100 < DISABLED_FLOOR) {
      under.push(`${theme} — ${ratio.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(under, [], 'the disabled pair itself has drifted below the band #220 settled');
});

/* The numbers button.css argues from, pinned exactly so the argument and the
 * arithmetic cannot drift apart: if a token moves, this fails and the comment
 * gets rewritten with it.
 *
 * The first table is why a box-less disabled control cannot use --disabled-ink:
 * three grounds are under the floor. The second is the ink it uses instead.
 * why: CONTRIBUTING.md#a-number-a-comment-argues-for-is-pinned-by-a-measured-test */
test('the ink a box-less disabled button is read in is pinned on every ground', () => {
  const plain = onEveryGround('--disabled-ink');
  assert.deepEqual(plain, {
    'dark --bg': 5.82,
    'dark --surface': 5.18,
    'dark --surface-2': 5.56,
    'dark --surface-3': 4.66,
    'light --bg': 6.11,
    'light --surface': 6.11,
    'light --surface-2': 5.66,
    'light --surface-3': 5.26,
  }, 'a surface or --disabled-ink moved — rewrite the numbers in button.css with these');
  assert.deepEqual(
    Object.keys(plain).filter((where) => plain[where] < DISABLED_FLOOR),
    ['dark --surface', 'dark --surface-3', 'light --surface-3'],
    'the grounds that cannot carry --disabled-ink without a box have changed',
  );

  assert.deepEqual(onEveryGround(BARE_INK), {
    'dark --bg': 7.00,
    'dark --surface': 6.24,
    'dark --surface-2': 6.69,
    'dark --surface-3': 5.62,
    'light --bg': 6.50,
    'light --surface': 6.50,
    'light --surface-2': 6.01,
    'light --surface-3': 5.60,
  }, `a surface or ${BARE_INK} moved — rewrite the numbers in button.css with these`);
});

/* The invariant: wherever a ghost is put, its disabled label clears the floor. */
test(`${BARE_INK} clears ${DISABLED_FLOOR}:1 on every ground, in both themes`, () => {
  const measured = onEveryGround(BARE_INK);
  const under = Object.keys(measured).filter((where) => measured[where] < DISABLED_FLOOR);
  assert.deepEqual(under, [], `${BARE_INK} is under the floor here`);
});

/* The other direction, which is how #273's first fix failed: a disabled ghost
 * must not out-weigh the live ghost beside it. With no box, the ink is the only
 * paint the two differ by, so it has to stay quieter on every ground. */
test(`${BARE_INK} stays quieter than the live ghost ink on every ground`, () => {
  const live = /\.ui-btn--ghost\s*\{[^}]*?\bcolor:\s*var\((--[\w-]+)\)/.exec(BUTTON_CSS);
  assert.ok(live, '.ui-btn--ghost declares no color this gate can read');
  const liveInk = onEveryGround(live[1]);
  const bare = onEveryGround(BARE_INK);
  const louder = Object.keys(bare).filter((where) => bare[where] >= liveInk[where]);
  assert.deepEqual(louder, [], `the disabled ghost reads at least as strong as the live ${live[1]} here`);
});

/* A disabled rule may give its box back to the ground, as the ghost does. When
 * it does, its label is read on any ground, so the same rule has to say it
 * paints --disabled-ink-bare — the ink measured on every ground above.
 *
 * The reading is the sibling gate's (src/styles/pagination.test.js): comments
 * blanked first, `[^{}]*` for a body so a rule nested in an at-rule is read as
 * itself, and every declaration of a property rather than the first. The
 * spellings are named because "transparent" is only one of them: a fully
 * transparent colour is transparent however it is written, `initial`/`revert`/
 * `unset` resolve a background to transparent, and `inherit` hands it to
 * whatever is behind.
 */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const unimportant = (value) => value.replace(/!\s*important\s*$/i, '');
const INVISIBLE = new RegExp(
  '^\\s*(transparent|none|initial|inherit|unset|revert(-layer)?'
  + '|#(0{3,4}|0{6}|0{8})'
  + '|rgba?\\([^)]*[,/]\\s*0*(\\.0+)?%?\\s*\\)'
  + '|hsla?\\([^)]*[,/]\\s*0*(\\.0+)?%?\\s*\\))\\s*$',
  'i',
);
/* Every way the sheet can spell "this control is off". */
const DISABLED_SELECTOR = /:disabled|:not\(\s*:enabled\s*\)|\[disabled\]|\[aria-disabled\s*=\s*("true"|'true'|true)\]/i;
const BARE = new RegExp(`^\\s*var\\(\\s*${BARE_INK}\\s*\\)\\s*$`);

/* The disabled rules of a sheet, at-rule bodies read as themselves, each with
 * the last value it declares for a property. */
const disabledRules = (css) => [...decomment(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trimStart().startsWith('@') && DISABLED_SELECTOR.test(selector))
  .map(([, selector, body]) => ({
    selector: selector.trim().replace(/\s+/g, ' '),
    values: (pattern) => [...body.matchAll(pattern)].map((m) => unimportant(m.at(-1))),
  }));
const BOX = /(background(?:-color)?|border(?:-color)?)\s*:\s*([^;]+)/gi;
const INK = /(?:^|[;\s])color\s*:\s*([^;]+)/gi;

const boxlessWithoutBareInk = (css) => {
  const offenders = [];
  for (const rule of disabledRules(css)) {
    if (!rule.values(BOX).some((value) => INVISIBLE.test(value))) continue;
    const inks = rule.values(INK);
    if (!inks.length || !BARE.test(inks.at(-1))) offenders.push(rule.selector);
  }
  // A rule need not touch the box to repaint the label: a later disabled ghost
  // rule that sets only `color` wins the cascade over the one above. So the
  // last ink any disabled ghost rule declares has to be the bare one too.
  const ghostInks = disabledRules(css)
    .filter((rule) => rule.selector.includes('.ui-btn--ghost'))
    .flatMap((rule) => rule.values(INK).map((ink) => ({ ink, selector: rule.selector })));
  const last = ghostInks.at(-1);
  if (last && !BARE.test(last.ink)) offenders.push(`${last.selector} (color: ${last.ink.trim()})`);
  return offenders;
};

test(`a disabled rule that gives its box back to the ground paints ${BARE_INK}`, () => {
  assert.deepEqual(boxlessWithoutBareInk(BUTTON_CSS), [],
    'a disabled button paints no surface or no border of its own, so its label is read on'
    + ` whatever is behind it — and it does not paint ${BARE_INK}, the one ink measured there.`);
});

/* The scan above is only worth anything if it refuses what it is written to
 * refuse. Each of these gives the box back and keeps an ink that was never
 * measured on the ground behind it. */
test('the scan refuses every spelling of a box-less disabled rule without the bare ink', () => {
  const caught = (rule) => boxlessWithoutBareInk(`${BUTTON_CSS}\n${rule}\n`).length > 0;

  const missed = [
    '.ui-btn--ghost:disabled { background: transparent; }',
    '.ui-btn--ghost:disabled { border-color: transparent; }',
    '.ui-btn--ghost:disabled { background: rgba(0, 0, 0, 0); }',
    '.ui-btn--ghost:disabled { background: rgb(0 0 0 / 0); }',
    '.ui-btn--ghost:disabled { background: hsl(0 0% 0% / 0); }',
    '.ui-btn--ghost:disabled { background: #0000; }',
    '.ui-btn--ghost:disabled { background: #00000000; }',
    '.ui-btn--ghost:disabled { background: initial; }',
    '.ui-btn--ghost:disabled { background: unset; }',
    '.ui-btn--ghost:disabled { background: inherit; }',
    '.ui-btn--ghost:disabled { background: revert; }',
    '.ui-btn--ghost:disabled { background: var(--disabled-surface); background: transparent; }',
    '.ui-btn--ghost:disabled { background: transparent; color: var(--disabled-ink); }',
    '.ui-btn--ghost:disabled { background: transparent; color: var(--disabled-ink-bare); color: var(--muted); }',
    '.ui-btn--ghost:disabled { background: transparent; border-color: var(--disabled-ink-bare); }',
    '@media (min-width: 560px) { .ui-btn--ghost:disabled { background: transparent; } }',
    '@supports (color: red) { .ui-btn--ghost:disabled { background: transparent; } }',
    '.ui-btn--ghost[disabled] { background: transparent; }',
    ".ui-btn--ghost[aria-disabled='true'] { background: transparent; }",
    '.ui-btn--ghost[aria-disabled=true] { background: transparent; }',
    '/* .ui-btn--ghost:disabled { color: var(--disabled-ink-bare); } */\n.ui-btn--ghost:disabled { background: transparent; }',
    // Found by the review of the first draft of this scan.
    '.ui-btn--ghost:disabled { color: var(--muted); }',
    '.ui-btn--ghost:disabled { background: transparent !important; }',
    '.ui-btn--ghost:disabled { background: rgb(0 0 0 / 0%); }',
    '.ui-btn--ghost:not(:enabled) { background: transparent; }',
  ].filter((rule) => !caught(rule));
  assert.deepEqual(missed, [], 'these give the box back with an unmeasured ink and the scan lets them through');

  // And it does not fire on a rule that paints a box, a box-less rule that
  // paints the bare ink, a rule that is not about the disabled state, or a comment.
  for (const fine of [
    '.ui-btn--ghost:disabled { background: var(--disabled-surface); }',
    '.ui-btn--ghost:disabled { background: transparent; color: var(--disabled-ink-bare); }',
    '.ui-btn--ghost:hover { background: transparent; }',
    '/* .ui-btn--ghost:disabled { background: transparent; } */',
  ]) {
    assert.equal(caught(fine), false, `false positive on: ${fine}`);
  }
});

test('the rules the gate reads are still declared, so it is checking something', () => {
  assert.match(BUTTON_CSS, /\.ui-btn:disabled[\s\S]*?background:\s*var\(--disabled-surface\)/,
    '.ui-btn:disabled no longer paints --disabled-surface');
  assert.match(BUTTON_CSS, /\.ui-btn:disabled[\s\S]*?color:\s*var\(--disabled-ink\)/,
    '.ui-btn:disabled no longer paints --disabled-ink');
  assert.match(BUTTON_CSS, /\.ui-btn--ghost:disabled[^{]*\{[^}]*color:\s*var\(--disabled-ink-bare\)/,
    '.ui-btn--ghost:disabled no longer paints --disabled-ink-bare');
});
