// Source CSS contracts; browser evidence covers actual wrapping and scrolling.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('./segmented.css', import.meta.url), 'utf8');

/**
 * Rules as `{ media, selector, body }` in source order, with `media` empty for
 * the top level — order is half of the cascade this file reads.
 * The sheet nests one level deep; a block inside a block would arrive here as
 * part of its parent's text rather than silently, which the rail tests below
 * would read as a missing restatement.
 */
const parse = (text) => {
  const css = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const take = (body, media) => {
    for (const [, selector, decls] of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      out.push({ media, selector: selector.trim(), body: decls });
    }
  };
  let at = 0;
  while (at < css.length) {
    const start = css.indexOf('@media', at);
    if (start === -1) { take(css.slice(at), ''); break; }
    take(css.slice(at, start), '');
    const open = css.indexOf('{', start);
    let depth = 0;
    let end = open;
    for (; end < css.length; end += 1) {
      if (css[end] === '{') depth += 1;
      else if (css[end] === '}' && (depth -= 1) === 0) break;
    }
    take(css.slice(open + 1, end), css.slice(start, open).replace(/\s+/g, ' ').trim());
    at = end + 1;
  }
  return out;
};

const RULES = parse(CSS);
const TOP = RULES.filter((rule) => !rule.media);

const valueOf = (selector, prop) => {
  const matches = TOP.filter((rule) => rule.selector === selector);
  assert.equal(matches.length, 1, `expected one top-level rule for ${selector}`);
  return new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(matches[0].body)?.[1].trim();
};

test('pill strips wrap within their container', () => {
  assert.equal(valueOf('.ui-seg', 'flex-wrap'), 'wrap', 'long pill strips must wrap rather than widen the page');
});

test('underline strips scroll on one row', () => {
  assert.equal(valueOf('.ui-seg--underline', 'flex-wrap'), 'nowrap', 'underline tabs must override the pill wrap');
  assert.equal(valueOf('.ui-seg--underline', 'overflow'), 'auto', 'tabs that exceed the row must remain reachable');
});

/* -- One accent signal on the chosen tab (#544) -----------------------------
 * The cascade below is this sheet's, not a browser's: descendant pairs such as
 * `.ui-seg--underline button.is-active`, class-column specificity, source order,
 * and nothing else. It is blind to inheritance, shorthand expansion (`outline: 0`
 * and `outline-color` are separate keys here), `!important`, which the sheet does
 * not use, and to what the pixels do — the run's screenshots cover that.
 */

/** The parts of one compound: `.is-active`, `[aria-pressed="true"]`, `:hover`, `:not(.x)`, `button`. */
const partsOf = (compound) => compound.match(/:not\([^)]*\)|\[[^\]]*\]|[.#][\w-]+|::?[\w-]+|[\w-]+/g) ?? [];

const attrOf = (part) => {
  const [, name, value] = /\[([\w-]+)(?:\s*=\s*"?([^"\]]*)"?)?\]/.exec(part);
  return [name, value];
};

/** Does one compound select `subject`? */
const selects = (compound, subject) => partsOf(compound).every((part) => {
  if (part.startsWith(':not(')) return !selects(part.slice(5, -1), subject);
  if (part.startsWith('.')) return subject.classes.includes(part.slice(1));
  if (part.startsWith('[')) {
    const [name, value] = attrOf(part);
    return value === undefined ? name in subject.attrs : subject.attrs[name] === value;
  }
  if (part.startsWith(':')) return subject.states.includes(part.replace(/^:+/, ''));
  return subject.tag === part;
});

/** Specificity as one number: a class, attribute or pseudo-class outranks any count of types. */
const weight = (compound) => partsOf(compound).reduce((total, part) => {
  if (part.startsWith(':not(')) return total + weight(part.slice(5, -1));
  if (part.startsWith('::')) return total + 1;
  return total + (/^[.#[:]/.test(part) ? 100 : 1);
}, 0);

/** An element the sheet can paint, read out of a compound such as `button.is-active`. */
const subjectFor = (compound, states = []) => {
  const parts = partsOf(compound);
  return {
    tag: parts.find((part) => /^[\w-]+$/.test(part)) ?? 'button',
    classes: parts.filter((part) => part.startsWith('.')).map((part) => part.slice(1)),
    attrs: Object.fromEntries(parts.filter((part) => part.startsWith('[')).map((part) => {
      const [name, value] = attrOf(part);
      return [name, value ?? ''];
    })),
    states,
  };
};

const STRIP = { tag: 'div', classes: ['ui-seg', 'ui-seg--underline'], attrs: {}, states: [] };

/** The winning value per property for a tab inside an underline strip. */
const resolve = (rules, button) => {
  const applied = [];
  rules.forEach((rule, order) => {
    const scores = rule.selector.split(',').map((one) => one.trim().split(/\s+/))
      .filter((pair) => pair.length === 2 && selects(pair[0], STRIP) && selects(pair[1], button))
      .map((pair) => weight(pair[0]) + weight(pair[1]));
    if (!scores.length) return;
    const score = Math.max(...scores);
    for (const [, prop, value] of rule.body.matchAll(/(?:^|;)\s*([-\w]+)\s*:\s*([^;]+)/g)) {
      applied.push({ prop: prop.trim(), value: value.trim(), score, order });
    }
  });
  const won = new Map();
  for (const decl of applied.sort((a, b) => a.score - b.score || a.order - b.order)) won.set(decl.prop, decl.value);
  return won;
};

/** Every winning declaration that spends the accent. */
const accentMarks = (won) => [...won]
  .filter(([, value]) => /var\(\s*--accent\b/.test(value))
  .map(([prop, value]) => `${prop}: ${value}`).sort();

/**
 * The chosen-tab spellings this sheet paints, discovered from it rather than
 * listed: every target compound under `.ui-seg--underline` that sets the rail to
 * the accent. A spelling dropped from the sheet changes this count and fails the
 * first test rather than quietly going unmeasured.
 */
const spellingsIn = (rules) => [...new Set(rules.filter((rule) => !rule.media
  && /border-bottom-color\s*:\s*var\(--accent\)/.test(rule.body))
  .flatMap((rule) => rule.selector.split(',').map((one) => one.trim()))
  .filter((one) => one.startsWith('.ui-seg--underline '))
  .map((one) => one.split(/\s+/)[1]))];

test('the chosen tab in an underline strip carries one accent mark', () => {
  const spellings = spellingsIn(RULES);
  assert.deepEqual(spellings, ['button.is-active', 'button[aria-pressed="true"]', 'button[aria-selected="true"]'],
    'the underline rail is painted for the class, the pressed state and the copied aria-selected markup; '
    + 'a spelling added or removed here needs its own measurement below');
  for (const spelling of spellings) {
    const won = resolve(TOP, subjectFor(spelling));
    assert.deepEqual(accentMarks(won), ['border-bottom-color: var(--accent)'],
      `${spelling} must spend the accent on the rail alone — the appearance's selection mark. #544`);
    assert.equal(won.get('color'), 'var(--strong)', `${spelling} must also read as chosen in ink, not only on the rail`);
    assert.equal(won.get('background'), 'transparent', `${spelling} must not take the pill fill`);
  }
});

test('a chosen tab under keyboard focus takes the kit ring, not a native outline', () => {
  for (const spelling of spellingsIn(RULES)) {
    const won = resolve(TOP, subjectFor(spelling, ['focus-visible']));
    assert.equal(won.get('box-shadow'), 'var(--ring)', `${spelling} must show the kit ring on keyboard focus`);
    assert.equal(won.get('outline'), '2px solid transparent',
      `${spelling} must hold the outline transparent so the browser's own ring never paints`);
  }
});

test('forced colours leave the chosen tab distinguishable', () => {
  assert.ok(RULES.some((rule) => /forced-colors/.test(rule.media)),
    'the mode repaints every border in the system ink, so the rail needs a restatement the mode keeps');
  const resting = resolve(RULES, subjectFor('button')).get('border-bottom-color');
  assert.match(resting, /^[A-Z][A-Za-z]+$/, 'the resting rail must be restated in a system colour, which forced colours keeps');
  for (const spelling of spellingsIn(RULES)) {
    const chosen = resolve(RULES, subjectFor(spelling)).get('border-bottom-color');
    assert.match(chosen, /^[A-Z][A-Za-z]+$/, `${spelling} must restate its rail in a system colour`);
    assert.notEqual(chosen, resting, `${spelling} must not read the same as a resting tab in forced colours`);
  }
});

test('the checks above reject the faults they were written for', () => {
  // #544 as it stood: the rail and the pill's accent edge at once.
  const twoMarks = parse(CSS.replace(' outline: 0;', ''));
  assert.deepEqual(
    accentMarks(resolve(twoMarks.filter((rule) => !rule.media), subjectFor('button.is-active'))),
    ['border-bottom-color: var(--accent)', 'outline: 1px solid var(--accent)'],
    'dropping `outline: 0` must bring the second accent mark back, or the first test proves nothing',
  );
  // A sheet that leaves the focus ring to the browser.
  const noRing = parse(CSS.replace('.ui-seg button:focus-visible { outline: 2px solid transparent; box-shadow: var(--ring); }', ''));
  assert.equal(resolve(noRing.filter((rule) => !rule.media), subjectFor('button.is-active', ['focus-visible'])).get('box-shadow'), undefined,
    'removing the ring rule must leave the focused tab without one, or the ring test proves nothing');
  // A forced-colours block that restates only the chosen rail.
  const noResting = parse(CSS.replace('  .ui-seg--underline button { border-bottom-color: Canvas; }\n', ''));
  assert.equal(
    resolve(noResting, subjectFor('button')).get('border-bottom-color'),
    undefined,
    'without the resting restatement a resting tab keeps only the transparent border the mode makes visible, '
    + 'and the forced-colours test must fail on that',
  );
});
