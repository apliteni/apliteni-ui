// Check that no hover fades its fill, ink or border: a hover change lands at once.
//
// why: docs/foundations.md#motion
//
/* Limits:
 * - Ancestor compounds are matched by position, as motion-coverage.test.js matches them.
 * - A candidate can add a state, a modifier class or an attribute, such as `:focus-visible`,
 *   `.is-active` or `[aria-busy]`, because a hovered element can also have it. Only a state that
 *   the hover part puts in `:not()`, or `:disabled` against `:enabled`, keeps them apart. So two
 *   modifiers that never meet on one element can still give a report.
 * - A `transition-duration` alone is read as `all`, the initial `transition-property`.
 * - A fade of a custom property that `@property` registers is a paint fade when a hover sets
 *   that property, because the paint that reads it fades too. A field's veil fades for focus,
 *   and no hover sets the veil. A custom property with no `@property` changes at once.
 * - Any registered custom property that a hover sets counts as paint, also one that feeds no paint.
 * - Paint that a script writes, and paint a custom property carries into a rule
 *   without `:hover`, are not read.
 * - A later `transition: none` does not clear an earlier fade; remove the fade instead.
 * - The markup is not read. When one element carries two classes, a fade on the class
 *   that the hover rule does not name is not found.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSelectorList } from '../scripts/lib/selector-list.js';
import {
  sheets as allSheets, sheetsUnder, leafRules, inNet, splitTop, partsOf, compounds, dropFunctional, identity, hooks, sameElement,
} from './lib/motion-css.js';

// Fill, ink and border, and the edge and ring a hover can paint.
const PAINT = /^(background(-color|-image)?|color|-webkit-text-fill-color|fill|stroke|filter|box-shadow|text-decoration-color|outline-color|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?)$/;
const TIME = /^-?\d*\.?\d+m?s$|^var\(--dur-/;

/** The custom properties that `@property` registers in `texts`. Only these can fade. */
const registered = (texts) => new Set(texts.flatMap((t) => [...t.matchAll(/@property\s+(--[\w-]+)/g)].map((m) => m[1])));

/** Does a transition of `t` move property `p`? `border` moves `border-color`, and the reverse. */
const covers = (t, p) => t === 'all' || t === p || p.startsWith(`${t}-`) || t.startsWith(`${p}-`)
  || (t === 'border-color' && /^border-.*-color$/.test(p));

/**
 * The properties one rule transitions: the first word of each item, or `all` when it names none.
 * A `transition-duration` alone moves the property that the cascade gives, and its initial value
 * is `all`, so it is read as `all`.
 */
const moved = (rule) => {
  const props = rule.decls
    .filter((d) => d.prop === 'transition' || d.prop === 'transition-property')
    .flatMap((d) => splitTop(d.value, (ch) => ch === ',').map((item) => {
      const first = item.trim().split(/\s+/)[0];
      return d.prop === 'transition' && TIME.test(first) ? 'all' : first;
    }));
  const timed = rule.decls.some((d) => d.prop === 'transition-duration'
    && splitTop(d.value, (ch) => ch === ',').some((t) => !/^0m?s$/.test(t.trim())));
  return (props.length === 0 && timed ? ['all'] : props).filter((t) => t !== 'none');
};

/** A part's states: every pseudo-class and hook outside `:not()`, `:where()`, `:is()` and `:has()`. */
const states = (part) => {
  const bare = dropFunctional(part);
  return new Set([...(bare.match(/(?<!:):[\w-]+/g) || []), ...(bare.match(hooks()) || [])]);
};

/** The states a part rules out: each simple state, hook or attribute inside a `:not()`. */
const ruledOut = (part) => new Set([...part.matchAll(/:not\(([^()]*)\)/g)]
  .flatMap((m) => [...(m[1].match(/(?<!:):[\w-]+/g) || []), ...(m[1].match(hooks()) || []),
    ...(m[1].match(/\[[^\]]+\]/g) || [])]));

// Two states that one element never has at once.
const APART = [[':enabled', ':disabled']];

/**
 * Can an element match both parts at once? A candidate state can join the hover, such as
 * focus on a hovered button, unless the hover part rules it out.
 */
const together = (part, candidate) => {
  const own = states(part);
  const off = ruledOut(part);
  const attrs = dropFunctional(compounds(candidate).at(-1)).match(/\[[^\]]+\]/g) || [];
  return [...states(candidate), ...attrs].every((s) => !off.has(s)
    && !APART.some(([a, b]) => (s === a && own.has(b)) || (s === b && own.has(a))));
};

/** A trailing `:is(a, b)` or `:where(a, b)` names two elements; split it into two parts. */
const alternatives = (part) => {
  const m = /^(.*?)(:is|:where)\(([^()]*)\)$/.exec(part);
  if (!m) return [part];
  return splitTop(m[3], (ch) => ch === ',').map((alt) => `${m[1]}${alt}`);
};

/**
 * The candidate's element, widened to every element it can also be: a BEM modifier names
 * its base, and an attribute, such as `[aria-busy="true"]`, is a state the element can take.
 */
const widen = (part) => {
  const parts = compounds(part);
  const last = parts.at(-1);
  const bases = [...new Set([...last.matchAll(/\.([\w-]+?)--[\w-]+/g)].map((m) => `.${m[1]}`))]
    .filter((b) => !new RegExp(`${b.replace('.', '\\.')}(?![\\w-])`).test(last));
  const open = dropFunctional(last).replace(/\[[^\]]+\]/g, '');
  const widened = `${open || '*'}${bases.join('')}`;
  return part.slice(0, part.length - last.length) + widened;
};

const isHover = (part) => /:hover(?![\w-])/.test(part.replace(/:not\([^()]*\)/g, ''));

const rulesOf = (sheets) => sheets.flatMap((s) => leafRules(s.text).filter((r) => !inNet(r)).map((r) => ({ ...r, where: s.where })));

/**
 * Each hover part in `sheets` that paints, and each rule in `context` that fades the same
 * element. The React sheets restyle kit classes, so the context is both trees.
 */
export const hoverFades = (sheets, context = sheets) => {
  const rules = rulesOf(sheets);
  const custom = registered(context.map((s) => s.text));
  const paints = (prop) => PAINT.test(prop) || custom.has(prop);
  const candidates = rulesOf(context).flatMap((r) => (moved(r).length === 0 ? [] : partsOf(r.selector)
    .flatMap(alternatives).map((part) => ({ part, rule: r, moves: moved(r) }))));
  const subjects = [];
  const fades = [];
  // A fade on an element with no type, class or attribute, such as `.x > *`, cannot be matched.
  const unmeasured = candidates
    .filter((c) => c.moves.some((t) => t === 'all' || paints(t))
      && identity(compounds(widen(c.part)).at(-1)).toks.size === 0)
    .map((c) => `${c.rule.where}:${c.rule.line}  ${c.part} — this fade's element has no type or class to match`);
  for (const r of rules) {
    const paint = r.decls.filter((d) => paints(d.prop));
    if (paint.length === 0) continue;
    for (const part of partsOf(r.selector).flatMap(alternatives).filter(isHover)) {
      subjects.push({ where: r.where, line: r.line, part });
      if (identity(compounds(part).at(-1)).toks.size === 0) {
        unmeasured.push(`${r.where}:${r.line}  ${part} — its element has no type, class or attribute to match`);
        continue;
      }
      for (const c of candidates) {
        if (!together(part, c.part)) continue;
        // A class the candidate adds, such as a modifier or `.is-active`, is the same element.
        if (!sameElement(part, widen(c.part), true)) continue;
        for (const d of paint) {
          const t = c.moves.find((x) => covers(x, d.prop));
          if (t) fades.push(`${r.where}:${d.line}  ${part} { ${d.prop} } fades through ${c.rule.where}:${c.rule.line} ${c.part} { transition: ${t} }`);
        }
      }
    }
  }
  return { subjects, fades, unmeasured };
};

/**
 * The coverage count, read without the gate's parser: for each line where a leaf rule that
 * paints starts, the number of selectors in its list that name `:hover` outside `:not()`.
 * It skips the reduced-motion net and keyframes, as the gate does. `custom` holds the
 * registered custom properties, which the gate also reads as paint.
 */
export const hoverCensus = (text, custom = new Set()) => {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const census = new Map();
  const open = [];
  let from = 0;
  for (let i = 0; i < src.length; i += 1) {
    if (src[i] === '{') {
      open.push({ head: src.slice(from, i), at: from, body: i + 1 });
      from = i + 1;
    } else if (src[i] === '}') {
      const block = open.pop();
      from = i + 1;
      const head = block.head.trim();
      const body = src.slice(block.body, i);
      if (head.startsWith('@') || body.includes('{')) continue;
      if (open.some((b) => /prefers-reduced-motion\s*:\s*reduce|@keyframes/.test(b.head))) continue;
      if (!body.split(';').some((d) => { const prop = d.split(':')[0].trim(); return PAINT.test(prop.toLowerCase()) || custom.has(prop); })) continue;
      const count = splitSelectorList(head).filter((sel) => /:hover(?![\w-])/.test(sel.replace(/:not\([^()]*\)/g, ''))).length;
      if (count === 0) continue;
      const start = block.at + (block.head.length - block.head.trimStart().length);
      census.set(src.slice(0, start).split('\n').length, count);
    } else if (src[i] === ';' && open.length === 0) {
      from = i + 1;
    }
  }
  return census;
};

/** Each census line where the gate found fewer hover parts than the census counts. */
export const lostSubjects = (sheets, subjects, custom = new Set()) => sheets.flatMap((sheet) => [...hoverCensus(sheet.text, custom)]
  .filter(([line, count]) => subjects.filter((s) => s.where === sheet.where && s.line === line).length < count)
  .map(([line, count]) => `${sheet.where}:${line} has ${count} hover selectors, the gate read fewer`));

// Each workspace is checked on its own, so an empty sweep in one cannot hide behind the other.
for (const dir of ['src', 'react/src']) {
  const sheets = sheetsUnder(dir);
  const { subjects, fades, unmeasured } = hoverFades(sheets, allSheets());
  test(`${dir}: every hover changes its fill, ink and border at once (${subjects.length} hover parts)`, () => {
    assert.ok(subjects.length > 0, `no painting hover rule found in ${sheets.length} sheets under ${dir}: the sweep has stopped matching`);
    // Coverage: every hover selector that the census counts gave the gate a subject.
    assert.deepStrictEqual(lostSubjects(sheets, subjects, registered(allSheets().map((s) => s.text))), [],
      'hover selectors that the gate did not read');
    assert.equal(unmeasured.length, 0, `hover parts the gate cannot measure:\n${unmeasured.join('\n')}`);
    assert.equal(fades.length, 0, 'a hover must not fade. Move the transition to the state that keeps motion '
      + `(press, focus, a caret):\n${fades.join('\n')}`);
  });
}

test('the gate rejects a hover fade and accepts a fade kept for focus', () => {
  const read = (text) => hoverFades([{ where: 'fixture.css', text }]);
  const fade = read('.x { transition: background var(--dur-fast) var(--ease); }\n.x:hover { background: red; }');
  assert.equal(fade.fades.length, 1, 'a base fade under a hover fill was not reported');
  const all = read('.x { transition: 150ms; }\n.y .x:hover { border-top-color: red; }');
  assert.equal(all.fades.length, 1, 'a bare `transition: 150ms` is `all`, and it was not reported');
  const cell = read('.t tr td { transition: color 1s; }\n.t tr:hover > :is(td, th) { color: red; }');
  assert.equal(cell.fades.length, 1, 'a fade on a cell named through :is() was not reported');
  const focus = read('.x:focus-visible { transition: border-color 1s; }\n.x:hover:not(:focus-visible) { border-color: red; }');
  assert.deepStrictEqual(focus.fades, [], 'a fade kept for focus was reported as a hover fade');
  const press = read('.x { transition: transform 1s; }\n.x:hover { background: red; }');
  assert.deepStrictEqual(press.fades, [], 'a press transform was reported as a hover fade');
  const blind = read('.x:hover > * { color: red; }');
  assert.equal(blind.unmeasured.length, 1, 'a hover part with no element to match was not reported as unmeasured');
  // A state that can join the hover: a focused button under the pointer fades. #865 review
  const focused = read('.ui-btn:focus-visible { transition: background var(--dur-fast) var(--ease); }\n.ui-btn:hover { background: red; }');
  assert.equal(focused.fades.length, 1, 'a fade in focus, which a hovered button can also have, was not reported');
  const apart = read('.x:disabled { transition: color 1s; }\n.x:enabled:hover { color: red; }\n'
    + '.y[aria-busy="true"] { transition: color 1s; }\n.y:hover:not([aria-busy="true"]) { color: red; }');
  assert.deepStrictEqual(apart.fades, [], 'a fade in a state the hover rules out was reported');
  // A duration alone moves `all`, the initial transition-property. #865 review
  const longhand = read('.ui-seg button { transition-duration: var(--dur-fast); }\n.ui-seg button:hover { color: red; }');
  assert.equal(longhand.fades.length, 1, 'a `transition-duration` alone was not read as `all`');
  const still = read('.x { transition-duration: 0s; }\n.x:hover { color: red; }');
  assert.deepStrictEqual(still.fades, [], 'a zero duration was reported as a fade');
  const modifier = read('.ui-btn--ghost { transition: background 1s; }\n.ui-btn:hover { background: red; }');
  assert.equal(modifier.fades.length, 1, 'a fade on a BEM modifier of the hovered element was not reported');
  const attribute = read('.ui-btn[aria-busy="true"] { transition: background 1s; }\n.ui-btn:hover { background: red; }');
  assert.equal(attribute.fades.length, 1, 'a fade on an attribute state of the hovered element was not reported');
  const anyChild = read('.x > * { transition: color 1s; }\n.x .y:hover { color: red; }');
  assert.equal(anyChild.unmeasured.length, 1, 'a fade with no element to match was not reported as unmeasured');
  // A registered custom property carries paint, so its fade is a hover fade. A plain one changes at once.
  const carried = read('@property --e { syntax: "<color>"; inherits: false; initial-value: red; }\n'
    + '.x { transition: --e 1s; border-color: var(--e); }\n.x:hover { --e: blue; }\n'
    + '.y { transition: --f 1s; border-color: var(--f); }\n.y:hover { --f: blue; }');
  assert.equal(carried.fades.length, 1, 'a fade of a registered custom property that a hover sets was not reported');
  // The #865 review mutation: the field fades its edge beside its veil. Chromium and WebKit faded the hover border.
  const kit = allSheets();
  const sheet = kit.find((s) => s.where === 'src/styles/input.css');
  const from = 'transition: --ui-field-veil var(--dur-med) var(--ease);';
  assert.ok(sheet.text.includes(from), 'input.css: the field transition the mutation needs has moved');
  const edged = { ...sheet, text: sheet.text.replace(from, 'transition: --ui-field-veil var(--dur-med) var(--ease), --ui-field-edge var(--dur-med) var(--ease);') };
  const mutated = hoverFades([edged], kit.map((s) => (s === sheet ? edged : s))).fades;
  assert.ok(mutated.some((f) => /\{ --ui-field-edge \} fades through .*transition: --ui-field-edge/.test(f)),
    `an edge fade beside the veil fade was not reported:\n${mutated.join('\n')}`);
});

test('the census counts each hover selector, so a lost subject fails coverage', () => {
  const text = '.a:hover, .b:hover { color: red; }\n.c:not(:hover) { color: red; }\n.d:hover { transform: none; }\n'
    + '@media (prefers-reduced-motion: reduce) { .e:hover { color: red; } }\n.f:hover > :is(td, th) { color: red; }\n'
    + '.g:hover { --e: red; }';
  assert.deepStrictEqual([...hoverCensus(text)], [[1, 2], [5, 1]]);
  assert.deepStrictEqual([...hoverCensus(text, new Set(['--e']))], [[1, 2], [5, 1], [6, 1]], 'a hover that sets a registered property was not counted');
  const sheet = { where: 'fixture.css', text };
  const { subjects } = hoverFades([sheet]);
  assert.deepStrictEqual(lostSubjects([sheet], subjects), []);
  assert.deepStrictEqual(lostSubjects([sheet], subjects.filter((x) => !x.part.startsWith('.b'))),
    ['fixture.css:1 has 2 hover selectors, the gate read fewer'], 'one selector lost from a list that still gave a subject was not found');
});
