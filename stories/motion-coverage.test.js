/* Rule: what appears, disappears or moves after the page has loaded moves between
 * its states, or says at the declaration why it stays still.
 *
 * Subjects are discovered, in every sheet under src/ and react/src/: a rule whose
 * selector carries a state hook from the closed list below and which sets display,
 * opacity, visibility, transform, translate or scale. It passes on a transition of
 * that property on the element's own rules, on an animation that runs as it appears
 * (its own rule, or a class JS adds for the entrance), or on a note on the
 * declaration's line:  /* motion: still — <why, a sentence> *\/
 * The hooks are closed like BARE_EASING in motion-tokens.test.js; selectors are not.
 * On the accessibility floor beside reduced-motion.test.js, which holds the net.
 *
 * What it does not reach:
 * - Content a script swaps in by innerHTML (setBusy's body): no state rule exists.
 * - React components, which mount and unmount with no CSS state hook.
 * - Whether JS adds the entrance class on the change and not at first render:
 *   jsdom plays no animation, so each component's unit test holds that.
 * - Ancestors. The element is matched by its rightmost compound, so a transition
 *   under another parent counts for it.
 * - A state class outside the list: `.on`, `.is-current`, `.is-running`.
 * - Rules inside a prefers-reduced-motion block, which belong to the net.
 *
 * why: docs/specification.md#motion
 * why: CONTRIBUTING.md#an-exception-is-a-note-at-the-site-read-by-the-gate
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { at, read, sheets, sheetsUnder, leafRules, keyframes, inNet } from './lib/motion-css.js';

const HOOKS = ['[hidden]', '.is-open', '.open', '.show', '.is-leaving', '.is-revealed', '.is-collapsed', '.is-selected', '.is-active'];
const MOVES = ['display', 'opacity', 'visibility', 'transform', 'translate', 'scale'];
const STILL = /motion:\s*still\s*[—-]\s*(\S[\s\S]{11,})/;

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Rebuilt at each use, for the lastIndex reason motion-tokens.test.js gives.
const hooks = () => new RegExp(HOOKS.map((h) => `${escRe(h)}(?![\\w-])`).join('|'), 'g');
const word = (w) => new RegExp(`(?<![\\w-])${escRe(w)}(?![\\w-])`);

/** Split on a character outside (), [] and strings. */
const splitTop = (s, isSep) => {
  const out = [];
  let buf = '';
  let depth = 0;
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    if (depth === 0 && isSep(ch)) { if (buf.trim()) out.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
};
const partsOf = (selector) => splitTop(selector, (c) => c === ',');
const compounds = (part) => splitTop(part, (c) => /[\s>+~]/.test(c));

/** Drop every `:name( … )` group — a hook inside `:not()` is the state's absence. */
const dropFunctional = (s) => {
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    const m = /^:[\w-]+\(/.exec(s.slice(i));
    if (!m) { out += s[i]; continue; }
    let depth = 1;
    i += m[0].length;
    while (i < s.length && depth > 0) {
      if (s[i] === '(') depth += 1;
      else if (s[i] === ')') depth -= 1;
      i += 1;
    }
    i -= 1;
  }
  return out;
};

/** What a compound says the element IS: its classes, attributes and type, and its pseudo-element. */
const identity = (compound) => {
  const c = dropFunctional(compound);
  const pseudo = (/::[\w-]+/.exec(c) || [''])[0];
  const bare = c.replace(/::?[\w-]+/g, '').replace(hooks(), '');
  const type = /^[a-z][\w-]*/i.exec(bare);
  const toks = new Set([...(type ? [type[0]] : []), ...(bare.match(/\.[\w-]+|\[[^\]]+\]/g) || [])]);
  return { pseudo, toks };
};

/** A BEM modifier is always written beside its base: `x--portal` is also `x`. */
const expand = (toks) => new Set([...toks].flatMap((t) => (t.includes('--') ? [t, t.slice(0, t.indexOf('--'))] : [t])));

/**
 * Does candidate part `c` select the element subject part `s` selects? Compared
 * right to left until a compound with a class or attribute has matched. `extras`
 * are classes `c` adds on its rightmost compound — the entrance class a script puts
 * on — and are allowed only where the caller allows them.
 */
const sameElement = (s, c, allowExtras) => {
  const S = compounds(s).reverse();
  const C = compounds(c).reverse();
  const extras = [];
  for (let i = 0; i < C.length && i < S.length; i += 1) {
    const si = identity(S[i]);
    const ci = identity(C[i]);
    if (i === 0 && si.pseudo !== ci.pseudo) return null;
    const known = expand(si.toks);
    const shared = [...ci.toks].filter((t) => known.has(t));
    const extra = [...ci.toks].filter((t) => !known.has(t));
    if (extra.length > 0 && !(i === 0 && allowExtras && extra.every((t) => t.startsWith('.')))) return null;
    extras.push(...(i === 0 ? extra : []));
    if (shared.some((t) => /^[.[]/.test(t))) return { extras };
    if (shared.length === 0) return null;
  }
  return null;
};

/* -- The surfaces -------------------------------------------------------------- */

const SHEETS = sheets().map((s) => ({ ...s, rules: leafRules(s.text), lines: s.text.split('\n') }));

const KEYFRAMES = new Map(SHEETS.flatMap((s) => [...keyframes(s.text)]));
const movesInKeyframes = (name) => KEYFRAMES.has(name)
  && MOVES.filter((p) => p !== 'display').some((p) => word(p).test(KEYFRAMES.get(name)));

/** Every non-test script under src/, the text a class name has to appear in to be added. */
const scriptsUnder = (dir) => readdirSync(at(dir)).sort().flatMap((f) => {
  const rel = `${dir}/${f}`;
  if (statSync(at(rel)).isDirectory()) return scriptsUnder(rel);
  return f.endsWith('.js') && !f.endsWith('.test.js') ? [read(rel)] : [];
});
const SCRIPTS = scriptsUnder('src').join('\n');
const addedByScript = (cls) => new RegExp(`['"\`][^'"\`\\n]*(?<![\\w-])${escRe(cls.slice(1))}(?![\\w-])[^'"\`\\n]*['"\`]`).test(SCRIPTS);

/** Every candidate rule part outside the net, once. */
const CANDIDATES = SHEETS.flatMap((s) => s.rules.filter((r) => !inNet(r))
  .flatMap((r) => partsOf(r.selector).map((part) => ({ part, rule: r, where: s.where }))));

/* -- The subjects -------------------------------------------------------------- */

const SUBJECTS = [];
for (const s of SHEETS) {
  for (const rule of s.rules) {
    if (inNet(rule)) continue;
    const moving = rule.decls.filter((d) => MOVES.includes(d.prop));
    if (moving.length === 0) continue;
    for (const part of partsOf(rule.selector)) {
      if (!hooks().test(dropFunctional(part))) continue;
      SUBJECTS.push({ where: s.where, part, rule, decls: moving, raw: (d) => s.lines[d.line - 1] ?? '' });
    }
  }
}

/** How one property of one subject moves, or null when it does not. */
const verdict = (subject, d) => {
  if (STILL.test(subject.raw(d))) return 'still';
  const named = compounds(subject.part).some((c) => [...identity(c).toks].some((t) => /^[.[]/.test(t)));
  if (!named) return 'unclassifiable';
  for (const c of CANDIDATES) {
    const match = sameElement(subject.part, c.part, false);
    if (!match) continue;
    const covers = c.rule.decls
      .filter((x) => x.prop === 'transition' || x.prop === 'transition-property')
      .some((x) => splitTop(x.value, (ch) => ch === ',').some((t) => word(d.prop).test(t) || word('all').test(t)));
    if (covers) return 'transition';
  }
  for (const c of CANDIDATES) {
    const match = sameElement(subject.part, c.part, true);
    if (!match || !match.extras.every(addedByScript)) continue;
    const runs = c.rule.decls
      .filter((x) => x.prop === 'animation' || x.prop === 'animation-name')
      .some((x) => (x.value.match(/[\w-]+/g) || []).some(movesInKeyframes));
    if (runs) return match.extras.length ? `animation (${match.extras.join(' ')}, added by script)` : 'animation';
  }
  return null;
};

const RESULTS = SUBJECTS.flatMap((s) => s.decls.map((d) => ({ s, d, how: verdict(s, d) })));
const site = ({ s, d }) => `${s.where}:${d.line}  ${s.part}  { ${d.prop}: ${d.value} }`;

test(`every state rule that shows, hides or moves an element moves between its states (${SUBJECTS.length} subjects)`, (t) => {
  assert.ok(
    SUBJECTS.length > 0,
    `no state rule was found in ${SHEETS.length} sheets — the sweep, the hook list or the property `
    + 'list has stopped matching, and a gate with no subjects reports the same green as one that checked them all',
  );

  const unclassified = RESULTS.filter((r) => r.how === 'unclassifiable').map(site);
  assert.deepStrictEqual(
    unclassified, [],
    'a state rule names no class or attribute on the element it styles, so this gate cannot tell which '
    + 'element that is or find the rules that would move it. It fails rather than skips: name the element, '
    + 'or give the declaration a `motion: still —` note with its reason:\n  ' + unclassified.join('\n  '),
  );

  const still = RESULTS.filter((r) => r.how === null).map(site);
  assert.deepStrictEqual(
    still, [],
    'something appears, disappears or moves after load in one frame. Give the element a transition of '
    + 'that property on a --dur-* token, or an entrance animation on a class the script adds when it '
    + 'shows it (playEntrance() in src/motion.js) — or, for a layout change or a mark inside a control '
    + 'that already transitions, put `/* motion: still — <why> */` on the declaration\'s line:\n  '
    + still.join('\n  '),
  );

  for (const r of RESULTS) t.diagnostic(`${r.how.padEnd(12)} ${site(r)}`);
});

test('a `motion: still` note sits on a declaration this gate reads, and says why', () => {
  const subjectLines = new Set(RESULTS.map(({ s, d }) => `${s.where}:${d.line}`));
  const offences = [];
  for (const s of SHEETS) {
    s.lines.forEach((line, i) => {
      if (!/motion:\s*still/.test(line)) return;
      const here = `${s.where}:${i + 1}`;
      if (!STILL.test(line)) offences.push(`${here}  gives no reason of twelve characters or more`);
      else if (!subjectLines.has(here)) offences.push(`${here}  is on no state rule that shows, hides or moves an element`);
    });
  }
  assert.deepStrictEqual(
    offences, [],
    'a still note that excuses nothing is a stale one: the rule it was written for moved or went away, '
    + 'and the note now tells the next reader something that is not true:\n  ' + offences.join('\n  '),
  );
});

test('both trees that ship CSS were read', () => {
  assert.ok(sheetsUnder('src').length > 0, 'no stylesheet was read under src/');
  assert.ok(
    sheetsUnder('react/src').length > 0,
    'no stylesheet was read under react/src — the subject count cannot tell which tree a subject came '
    + 'from, so only this test can say the React half of the sweep ran',
  );
});
