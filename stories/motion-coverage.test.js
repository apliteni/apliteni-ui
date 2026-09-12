// why: CONTRIBUTING.md#motion-coverage-measurements

/* Accessibility coverage limits:
 * - Script-swapped content and React mounts without state classes have no state rule.
 * - Entrance timing and which element a script passes to playEntrance are not traced.
 * - Ancestor selectors are not matched; the rightmost compound decides the element.
 * - State hooks outside HOOKS are not subjects.
 * - Reduced-motion blocks belong to reduced-motion.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, sheets, sheetsUnder, scripts, scriptsUnder, decommentJs, leafRules, keyframes, inNet } from './lib/motion-css.js';

const HOOKS = [
  '[hidden]', '[open]', ':checked', '.is-open', '.open', '.show', '.is-visible', '.is-leaving', '.is-revealed',
  '.is-collapsed', '.is-selected', '.is-active', '.is-up',
];
const MOVES = ['display', 'opacity', 'visibility', 'transform', 'translate', 'scale', 'max-height'];
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

/** Does a rule transition this property? `display` only when the transition is allowed to be discrete. */
const transitions = (rule, prop) => {
  const discrete = rule.decls.some((x) => x.prop === 'transition-behavior' && word('allow-discrete').test(x.value));
  return rule.decls
    .filter((x) => x.prop === 'transition' || x.prop === 'transition-property')
    .some((x) => splitTop(x.value, (ch) => ch === ',').some((t) => (word(prop).test(t) || word('all').test(t))
      && (prop !== 'display' || discrete || word('allow-discrete').test(t))));
};

/* -- The scripts that play an entrance ----------------------------------------- */

const SCRIPTS = scripts().map((s) => ({ ...s, code: decommentJs(s.text) }));
// The class playEntrance() puts on when its caller names none, read from its signature.
const ENTRANCE = (/export function playEntrance\(\s*\w+\s*,\s*\w+\s*=\s*['"]([\w-]+)['"]/.exec(read('src/motion.js')) || [])[1];

const namesClass = (code, cls) => new RegExp(`['"\`][^'"\`\\n]*(?<![\\w-])${escRe(cls)}(?![\\w-])`).test(code);
/** Does this script play entrance class `cls`: a playEntrance() call naming it or defaulting to it, or classList adding it? */
const playsClass = (code, cls) => {
  for (const m of code.matchAll(/(?<![\w.])playEntrance\s*\(([^()]*)\)/g)) {
    const args = splitTop(m[1], (ch) => ch === ',');
    const named = args.length > 1 ? (/^['"`]([\w-]+)['"`]$/.exec(args[1]) || [])[1] : ENTRANCE;
    if (named === cls) return true;
  }
  return new RegExp(`classList\\.(?:add|toggle)\\([^)]*['"\`]${escRe(cls)}['"\`]`).test(code);
};
/** The element's own component scripts: the ones that name one of its classes. */
const ownersOf = (part) => {
  const classes = [...expand(identity(compounds(part).at(-1)).toks)].filter((t) => t.startsWith('.')).map((t) => t.slice(1));
  return SCRIPTS.filter((s) => classes.some((c) => namesClass(s.code, c)));
};

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

/** How one property of one subject moves, or null when it does not — with a hint for the reader. */
const verdict = (subject, d) => {
  if (STILL.test(subject.raw(d))) return { how: 'still' };
  const named = compounds(subject.part).some((c) => [...identity(c).toks].some((t) => /^[.[]/.test(t)));
  if (!named) return { how: 'unclassifiable' };
  for (const c of CANDIDATES) {
    if (sameElement(subject.part, c.part, false) && transitions(c.rule, d.prop)) return { how: 'transition' };
  }
  const owners = ownersOf(subject.part);
  let hint = null;
  for (const c of CANDIDATES) {
    const match = sameElement(subject.part, c.part, true);
    if (!match) continue;
    const runs = c.rule.decls
      .filter((x) => x.prop === 'animation' || x.prop === 'animation-name')
      .some((x) => (x.value.match(/[\w-]+/g) || []).some(movesInKeyframes));
    if (!runs) continue;
    const unplayed = match.extras.filter((x) => !owners.some((o) => playsClass(o.code, x.slice(1))));
    if (unplayed.length === 0) {
      if (!match.extras.length) return { how: 'animation' };
      const by = owners.filter((o) => match.extras.every((x) => playsClass(o.code, x.slice(1)))).map((o) => o.where);
      return { how: `animation (${match.extras.join(' ')}, played by ${by.join(', ')})` };
    }
    hint = `${c.where}:${c.rule.line} animates it on ${unplayed.join(' ')}, but no script naming the element `
      + `plays that class (${owners.length ? `read: ${owners.map((o) => o.where).join(', ')}` : 'no script names it'})`;
  }
  return { how: null, hint };
};

const RESULTS = SUBJECTS.flatMap((s) => s.decls.map((d) => ({ s, d, ...verdict(s, d) })));
const site = ({ s, d }) => `${s.where}:${d.line}  ${s.part}  { ${d.prop}: ${d.value} }`;

test(`every state rule that shows, hides or moves an element moves between its states (${SUBJECTS.length} subjects)`, (t) => {
  assert.ok(
    SUBJECTS.length > 0,
    `no state rule was found in ${SHEETS.length} sheets — the sweep, the hook list or the property `
    + 'list has stopped matching, and a gate with no subjects reports the same green as one that checked them all',
  );
  assert.ok(
    ENTRANCE,
    'the class playEntrance() defaults to could not be read from its signature in src/motion.js, so no '
    + 'call that relies on the default can be credited with the entrance it plays',
  );

  const unclassified = RESULTS.filter((r) => r.how === 'unclassifiable').map(site);
  assert.deepStrictEqual(
    unclassified, [],
    'a state rule names no class or attribute on the element it styles, so this gate cannot tell which '
    + 'element that is or find the rules that would move it. It fails rather than skips: name the element, '
    + 'or give the declaration a `motion: still —` note with its reason:\n  ' + unclassified.join('\n  '),
  );

  const still = RESULTS.filter((r) => r.how === null).map((r) => site(r) + (r.hint ? `\n      ${r.hint}` : ''));
  assert.deepStrictEqual(
    still, [],
    'something appears, disappears or moves after load in one frame. Give the element a transition of '
    + 'that property on a --dur-* token (display needs transition-behavior: allow-discrete, or it snaps), '
    + 'or an entrance animation on a class its own script plays when it shows it (playEntrance() in '
    + 'src/motion.js) — or, for a layout change or a mark inside a control that already transitions, put '
    + '`/* motion: still — <why> */` on the declaration\'s line:\n  ' + still.join('\n  '),
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

test('both trees that ship CSS were read, and the kit\'s scripts', () => {
  assert.ok(sheetsUnder('src').length > 0, 'no stylesheet was read under src/');
  assert.ok(
    sheetsUnder('react/src').length > 0,
    'no stylesheet was read under react/src — the subject count cannot tell which tree a subject came '
    + 'from, so only this test can say the React half of the sweep ran',
  );
  assert.ok(
    scriptsUnder('src').some((s) => s.where === 'src/motion.js'),
    'src/motion.js was not among the scripts read, so no component\'s entrance can be credited',
  );
});
