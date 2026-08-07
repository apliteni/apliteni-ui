/* Rule: a destructive control is quiet at rest and --pink on hover.
 *
 * Two halves, and this file gates both.
 *
 * 1. Never the accent. A rule that names itself destructive must never paint
 *    with the brand accent. Under Phoenix the accent is ember and under Nebula
 *    it is purple; either way "delete" would light up in the colour the kit
 *    uses for "go".
 *
 * 2. Quiet until you point at it. A destructive control that already shouts
 *    --pink before the pointer reaches it spends the signal on a row the
 *    reader is only scrolling past, and leaves hover with nothing to say. The
 *    reference implementations are button.css (.ui-btn--danger), dropdown.css
 *    (.ui-dropdown__item.is-danger) and nav.css (.ui-nav__item.is-danger):
 *    --muted at rest, --pink on hover.
 *
 * The at-rest gate is default-deny. Anything in src/styles that marks itself
 * destructive and paints with the danger signal outside a hover/focus/active
 * state is an offence unless it appears in AT_REST_EXEMPT below with a reason.
 * A new component that gets this wrong is caught without anyone naming it.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STYLES = fileURLToPath(new URL('../src/styles/', import.meta.url));

// A selector that marks itself destructive: `.is-danger` or a `--danger`
// BEM modifier. `(?![\w-])` keeps `--danger-contrast` (a token, never a
// selector) from ever counting as one.
const DANGER_SELECTOR = /is-danger|--danger(?![\w-])/;

// The brand accent, in any of its forms (--accent, --accent-strong, …).
const ACCENT_VALUE = /var\(\s*--accent[\w-]*/;

// The danger signal, in any of the forms the kit paints it with.
const SIGNAL_VALUE = /var\(\s*--(?:pink|glow-pink|chip-danger-(?:ink|fill))\s*\)/;

// A selector that only applies while the reader is pointing at, pressing, or
// keyboard-focusing the control — i.e. not the resting state.
const STATEFUL = /:(?:hover|active|focus|focus-visible|focus-within)\b/;

const RULE = /([^{}]+)\{([^{}]*)\}/g;

const decomment = (css) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const squash = (s) => s.trim().replace(/\s+/g, ' ');

/* Surfaces that carry the danger signal at rest and are allowed to. None of
 * them is an action: the reader cannot press any of these, so "quiet until
 * you point at it" has nothing to be quiet for. Anything added here has to be
 * something you read, not something you click. */
const AT_REST_EXEMPT = [
  {
    selector: '.ui-badge--danger',
    why: 'a status badge reports a state that already exists; there is nothing to press',
  },
  {
    selector: '.ui-nav__badge.is-danger',
    why: 'a counter riding on a nav row — the badge is the label, the row is the control',
  },
  {
    selector: '.ui-callout--danger',
    why: 'a callout is a message about something that happened, not an action to take',
  },
  {
    selector: '.ui-callout--danger .ui-callout__icon',
    why: 'the icon of that same message',
  },
  {
    selector: '.ui-toast--danger',
    why: 'a toast reports an outcome; its danger paint is the report, not an offer',
  },
];

const EXEMPT = new Set(AT_REST_EXEMPT.map((e) => e.selector));

/** Every rule in src/styles whose selector marks itself destructive. */
function dangerRules() {
  const found = [];
  for (const file of readdirSync(STYLES).filter((f) => f.endsWith('.css')).sort()) {
    const css = decomment(readFileSync(STYLES + file, 'utf8'));
    for (const m of css.matchAll(RULE)) {
      const [, selector, body] = m;
      if (selector.trimStart().startsWith('@')) continue;
      if (!DANGER_SELECTOR.test(selector)) continue;
      const start = m.index + selector.length - selector.trimStart().length;
      found.push({
        file,
        line: css.slice(0, start).split('\n').length,
        selector: squash(selector),
        body: squash(body),
      });
    }
  }
  return found;
}

const at = (r) => `${r.file}:${r.line}  ${r.selector} { ${r.body} }`;

test('a destructive control is quiet at rest', () => {
  const offences = dangerRules()
    .filter((r) => !STATEFUL.test(r.selector))
    .filter((r) => SIGNAL_VALUE.test(r.body))
    .filter((r) => !EXEMPT.has(r.selector))
    .map(at);

  assert.deepStrictEqual(
    offences,
    [],
    'destructive control shouting the danger signal before it is hovered —\n'
    + 'go quiet at rest (--muted) and turn --pink on :hover, or add it to\n'
    + `AT_REST_EXEMPT with a reason it is not an action:\n  ${offences.join('\n  ')}`,
  );
});

test('a danger rule never resolves to var(--accent)', () => {
  const offences = dangerRules()
    .filter((r) => ACCENT_VALUE.test(r.body))
    .map(at);

  assert.deepStrictEqual(
    offences,
    [],
    `destructive rule painting with the accent — use --pink:\n  ${offences.join('\n  ')}`,
  );
});

test('the danger scan actually reaches the kit', () => {
  const rules = dangerRules();
  const atRest = rules.filter((r) => !STATEFUL.test(r.selector));
  const onHover = rules.filter((r) => STATEFUL.test(r.selector) && SIGNAL_VALUE.test(r.body));

  // Without these the two gates above pass by matching nothing at all.
  assert.ok(atRest.length > 0, 'no at-rest destructive rule found — the at-rest gate checks nothing');
  assert.ok(onHover.length > 0, 'no destructive hover rule paints --pink — the scan is not reading the kit');
});

test('every at-rest exemption still names a live rule', () => {
  const selectors = new Set(dangerRules().map((r) => r.selector));
  const stale = AT_REST_EXEMPT
    .filter((e) => !selectors.has(e.selector))
    .map((e) => `${e.selector} — exempt because ${e.why}`);

  assert.deepStrictEqual(
    stale,
    [],
    'AT_REST_EXEMPT names a selector that no longer exists — a renamed component\n'
    + `silently lost its exemption, and the list is now lying:\n  ${stale.join('\n  ')}`,
  );
});
