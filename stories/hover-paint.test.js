// Check that no hover fades its fill, ink or border: a hover change lands at once.
//
// why: docs/foundations.md#motion
//
/* Limits:
 * - Ancestor compounds are matched by position, as motion-coverage.test.js matches them.
 * - A rule that adds a state the hover rule does not name, such as `:focus-visible` or
 *   `.is-active`, is not a hover candidate: its transition runs only in that state.
 * - Paint that a script writes, and paint a custom property carries into a rule
 *   without `:hover`, are not read.
 * - A later `transition: none` does not clear an earlier fade; remove the fade instead.
 * - The markup is not read. When one element carries two classes, a fade on the class
 *   that the hover rule does not name is not found.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sheets as allSheets, sheetsUnder, leafRules, inNet, splitTop, partsOf, compounds, dropFunctional, identity, hooks, sameElement,
} from './lib/motion-css.js';

// Fill, ink and border, and the edge and ring a hover can paint.
const PAINT = /^(background(-color|-image)?|color|-webkit-text-fill-color|fill|stroke|filter|box-shadow|text-decoration-color|outline-color|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?)$/;
const TIME = /^-?\d*\.?\d+m?s$|^var\(--dur-/;

/** Does a transition of `t` move property `p`? `border` moves `border-color`, and the reverse. */
const covers = (t, p) => t === 'all' || t === p || p.startsWith(`${t}-`) || t.startsWith(`${p}-`)
  || (t === 'border-color' && /^border-.*-color$/.test(p));

/** The properties one rule transitions: the first word of each item, or `all` when it names none. */
const moved = (rule) => rule.decls
  .filter((d) => d.prop === 'transition' || d.prop === 'transition-property')
  .flatMap((d) => splitTop(d.value, (ch) => ch === ',').map((item) => {
    const first = item.trim().split(/\s+/)[0];
    return d.prop === 'transition' && TIME.test(first) ? 'all' : first;
  }))
  .filter((t) => t !== 'none');

/** A part's states: every pseudo-class and hook outside `:not()`, `:where()`, `:is()` and `:has()`. */
const states = (part) => {
  const bare = dropFunctional(part);
  return new Set([...(bare.match(/(?<!:):[\w-]+/g) || []), ...(bare.match(hooks()) || [])]);
};

/** A trailing `:is(a, b)` or `:where(a, b)` names two elements; split it into two parts. */
const alternatives = (part) => {
  const m = /^(.*?)(:is|:where)\(([^()]*)\)$/.exec(part);
  if (!m) return [part];
  return splitTop(m[3], (ch) => ch === ',').map((alt) => `${m[1]}${alt}`);
};

const isHover = (part) => /:hover(?![\w-])/.test(part.replace(/:not\([^()]*\)/g, ''));

const rulesOf = (sheets) => sheets.flatMap((s) => leafRules(s.text).filter((r) => !inNet(r)).map((r) => ({ ...r, where: s.where })));

/**
 * Each hover part in `sheets` that paints, and each rule in `context` that fades the same
 * element. The React sheets restyle kit classes, so the context is both trees.
 */
export const hoverFades = (sheets, context = sheets) => {
  const rules = rulesOf(sheets);
  const candidates = rulesOf(context).flatMap((r) => (moved(r).length === 0 ? [] : partsOf(r.selector)
    .flatMap(alternatives).map((part) => ({ part, rule: r, moves: moved(r) }))));
  const subjects = [];
  const fades = [];
  const unmeasured = [];
  for (const r of rules) {
    const paint = r.decls.filter((d) => PAINT.test(d.prop));
    if (paint.length === 0) continue;
    for (const part of partsOf(r.selector).flatMap(alternatives).filter(isHover)) {
      subjects.push({ where: r.where, line: r.line, part });
      if (identity(compounds(part).at(-1)).toks.size === 0) {
        unmeasured.push(`${r.where}:${r.line}  ${part} — its element has no type, class or attribute to match`);
        continue;
      }
      const own = states(part);
      for (const c of candidates) {
        if (![...states(c.part)].every((s) => own.has(s))) continue;
        if (!sameElement(part, c.part, false)) continue;
        for (const d of paint) {
          const t = c.moves.find((x) => covers(x, d.prop));
          if (t) fades.push(`${r.where}:${d.line}  ${part} { ${d.prop} } fades through ${c.rule.where}:${c.rule.line} ${c.part} { transition: ${t} }`);
        }
      }
    }
  }
  return { subjects, fades, unmeasured };
};

// Each workspace is checked on its own, so an empty sweep in one cannot hide behind the other.
for (const dir of ['src', 'react/src']) {
  const sheets = sheetsUnder(dir);
  const { subjects, fades, unmeasured } = hoverFades(sheets, allSheets());
  test(`${dir}: every hover changes its fill, ink and border at once (${subjects.length} hover parts)`, () => {
    assert.ok(subjects.length > 0, `no painting hover rule found in ${sheets.length} sheets under ${dir}: the sweep has stopped matching`);
    // Coverage: each sheet whose text names `:hover` in a painting rule gave at least one subject.
    const named = sheets.filter((s) => leafRules(s.text).some((r) => !inNet(r)
      && partsOf(r.selector).flatMap(alternatives).some(isHover) && r.decls.some((d) => PAINT.test(d.prop)))).map((s) => s.where);
    const seen = new Set(subjects.map((s) => s.where));
    assert.deepStrictEqual(named.filter((w) => !seen.has(w)), [], 'sheets with a painting hover that gave no subject');
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
});
