/* Rule: a reader who asks the system for less motion gets less of it (WCAG 2.3.3),
 * and nothing in the kit can outvote the request.
 *
 * Three things hold it. The net in src/styles/reduced-motion.css still shortens every
 * animation and transition to nothing, with !important — parsed, so deleting one of
 * its lines fails. Nothing outside the net writes an !important that would beat it on
 * specificity: no duration outside a reduced-motion block, none inside a component's
 * own block that does more than switch motion off, and no loop count above one
 * anywhere. And every script that waits on animationend or transitionend — a
 * listener, an on…= handler or a React onAnimationEnd / onTransitionEnd prop — has a
 * timer in the same function, found by scanning for the listener rather than listing
 * files. A reduced-motion branch alone does not count: it does nothing when the event
 * fails to come with motion on.
 *
 * A file of its own rather than a section of motion-tokens.test.js: that gate is
 * about the vocabulary every reader gets, this one about the reader who opted out.
 *
 * What it does not reach:
 * - Delays. The net does not zero animation-delay or transition-delay, and nothing
 *   here looks for one.
 * - Inline styles a script writes (toasts.js sets a transition on a swipe).
 * - Which timer. Any setTimeout in the function counts as the fallback, even one that
 *   has nothing to do with the listener.
 * - Whether the timer is long enough or the branch right: they are found, not run.
 *   The function is read by indentation, so a one-line function is judged by the
 *   function around it, or fails as unclassified when there is none.
 * - Motion a script drives itself (requestAnimationFrame, element.animate()).
 * - Whether a browser applies the net: jsdom evaluates no media query.
 *
 * why: docs/specification.md#reduced-motion-travels-with-the-stylesheet
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, ms, sheets, scripts, decommentJs, leafRules, inNet } from './lib/motion-css.js';

const NET = 'src/styles/reduced-motion.css';

/* -- The net ------------------------------------------------------------------- */

// Imperceptible, and not zero: the spec keeps it above 0 so the end events still
// fire for a script waiting on them.
const imperceptible = (v) => ms(v) !== null && ms(v) > 0 && ms(v) <= 1;
const NET_DECLS = {
  'animation-duration': { ok: imperceptible, want: 'a time above 0 and at most 1ms' },
  'animation-iteration-count': { ok: (v) => v === '1', want: '1, so a loop plays once and settles' },
  'transition-duration': { ok: imperceptible, want: 'a time above 0 and at most 1ms' },
};

test('the net still shortens every animation and transition, and outranks every sheet', () => {
  const block = leafRules(read(NET)).filter((r) => r.at.some((p) => /prefers-reduced-motion\s*:\s*reduce/.test(p)));
  assert.ok(block.length > 0, `${NET} has no @media (prefers-reduced-motion: reduce) block left`);

  const everything = block.find((r) => {
    const parts = r.selector.split(',').map((s) => s.trim()).sort();
    return parts.join(' ') === ['*', '::after', '::before'].sort().join(' ');
  });
  assert.ok(
    everything,
    `${NET} no longer has a rule on \`*, ::before, ::after\` inside its reduced-motion block. `
    + 'That selector is the net: it reaches every element and both generated boxes, and anything narrower '
    + 'leaves an animation running for a reader who asked for none.',
  );

  for (const [prop, { ok, want }] of Object.entries(NET_DECLS)) {
    const d = everything.decls.find((x) => x.prop === prop);
    assert.ok(d, `${NET}: the net no longer sets ${prop}`);
    assert.ok(
      d.important,
      `${NET}:${d.line} ${prop} lost its !important. Every component rule outranks \`*\` on specificity, `
      + 'so without it the net loses to the first rule that names a duration.',
    );
    assert.ok(ok(d.value), `${NET}:${d.line} ${prop} is \`${d.value}\`, and the net needs ${want}`);
  }
});

const DURATION = /^(transition|animation)(-duration)?$/;
// Inside a component's own reduced-motion block an !important may switch motion off —
// the drawer's and the confirm's `.is-open * { transition: none !important }` — and
// nothing more: a duration there outranks the net's 0.01ms exactly as one outside would.
const switchesOff = (v) => v === 'none' || v === '0' || ms(v) === 0;

test('nothing outside the net can outvote it with !important', () => {
  const all = sheets();
  assert.ok(all.length > 1, 'fewer than two stylesheets were read — the sweep has stopped reading the trees');

  const offences = [];
  for (const { where, text } of all) {
    for (const rule of leafRules(text)) {
      if (where === NET && inNet(rule)) continue;
      for (const d of rule.decls) {
        if (!d.important) continue;
        const site = `${where}:${d.line}  ${rule.selector}  { ${d.prop}: ${d.value} !important }`;
        if (DURATION.test(d.prop) && !inNet(rule)) {
          offences.push(`${site}\n      a duration outside a prefers-reduced-motion: reduce block`);
        } else if (DURATION.test(d.prop) && !switchesOff(d.value)) {
          offences.push(`${site}\n      inside a reduced-motion block, !important may only switch motion off: none or 0`);
        }
        if (d.prop === 'animation-iteration-count' && !/^[01]$/.test(d.value)) {
          offences.push(`${site}\n      a loop count above one, which beats the net's 1`);
        }
      }
    }
  }
  assert.deepStrictEqual(
    offences, [],
    `an !important outside the net can outvote it. ${NET} holds its durations and its loop count with `
    + '!important on `*`; an !important on a class wins on specificity, and the animation runs for a reader '
    + 'who asked for none. Drop the !important, or use it inside a component\'s own reduced-motion block '
    + 'only to switch motion off:\n  ' + offences.join('\n  '),
  );
});

/* -- The scripts that wait on an end event --------------------------------------- */

// Event names are matched in any case, because React spells the props onAnimationEnd
// and onTransitionEnd. Declaring a handler of that name is not a listener.
const EVENT = /animationend|transitionend/i;
const LISTENS = /addEventListener\(\s*['"`](animationend|transitionend)['"`]|(?<!\b(?:const|let|var)\s+)\bon(animationend|transitionend)(capture)?\s*=(?!=)/i;
// Taking a listener off is classified too, as the end of a wait rather than one.
const STOPS = /removeEventListener\(\s*['"`](animationend|transitionend)['"`]/i;
const HEADER = /(\bfunction\b[^(]*\([^)]*\)|=>)\s*\{\s*$/;
const indent = (line) => /^\s*/.exec(line)[0].length;

/** The innermost function above line `n` whose body contains it, by indentation. */
const enclosing = (lines, n) => {
  for (let i = n - 1; i >= 0; i -= 1) {
    if (!HEADER.test(lines[i])) continue;
    const k = indent(lines[i]);
    let j = i + 1;
    while (j < lines.length && !(indent(lines[j]) === k && lines[j].trim().startsWith('}'))) j += 1;
    if (j > n) return lines.slice(i, j + 1).join('\n');
  }
  return null;
};

/** Names in a module that ask the system about reduced motion. */
const reducedMotionAsks = (code) => new Set([
  'prefersReducedMotion',
  ...[...code.matchAll(/(?:const|let|var)\s+(\w+)\s*=[^;]*prefers-reduced-motion/g)].map((m) => m[1]),
  ...[...code.matchAll(/function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*prefers-reduced-motion/g)].map((m) => m[1]),
]);

const MENTIONS = [];
for (const { where: rel, text: raw } of scripts()) {
  if (!EVENT.test(raw)) continue;
  const code = decommentJs(raw);
  const lines = code.split('\n');
  lines.forEach((line, i) => {
    if (EVENT.test(line)) MENTIONS.push({ rel, line: i + 1, text: line.trim(), lines, code });
  });
}
const WAITERS = MENTIONS.filter((w) => !STOPS.test(w.text));

test('the listener pattern reads every spelling a script can wait with', () => {
  for (const waits of [
    "el.addEventListener('transitionend', done);",
    'el.onanimationend = done;',
    '<div onTransitionEnd={() => done()} />',
    '<div onAnimationEndCapture={done} />',
  ]) assert.match(waits, LISTENS, `${waits} waits on an end event and was not read as a listener`);
  for (const not of ['const onTransitionEnd = () => done();', 'if (e.type == "transitionend") done();']) {
    assert.doesNotMatch(not, LISTENS, `${not} is not a listener and was read as one`);
  }
});

test(`every script that waits on an end event has a way out without it (${WAITERS.length} listeners)`, (t) => {
  assert.ok(
    WAITERS.length > 0,
    'no animationend or transitionend listener was found under src/ or react/src — toasts.js waits on '
    + 'one, so the sweep has stopped reading the scripts',
  );

  const offences = [];
  for (const w of WAITERS) {
    const site = `${w.rel}:${w.line}  ${w.text}`;
    if (!LISTENS.test(w.text)) { offences.push(`${site}\n      is not addEventListener(…), on…= or an on…End prop, so it cannot be classified`); continue; }
    const body = enclosing(w.lines, w.line - 1);
    if (body === null) { offences.push(`${site}\n      sits in no function this gate can find, so it cannot be classified`); continue; }
    const timer = /(?<![\w.])setTimeout\s*\(/.test(body);
    const asks = [...reducedMotionAsks(w.code)].some((n) => new RegExp(`(?<![\\w.])${n}\\s*\\(`).test(body));
    if (!timer) offences.push(`${site}\n      has no setTimeout in the same function${asks ? ' (a reduced-motion branch is not enough)' : ''}`);
    else t.diagnostic(`${w.rel}:${w.line}  ${[timer && 'timer', asks && 'reduced-motion branch'].filter(Boolean).join(' + ')}`);
  }
  assert.deepStrictEqual(
    offences, [],
    'a script waits on an end event with nothing to fall back on. The event does not come when the element '
    + 'is display: none, when no animation matched, or when a transition was cut short — and whatever the '
    + 'script meant to remove or hide stays on screen. Add a setTimeout beside the listener; a '
    + 'prefersReducedMotion() branch covers only the reader who opted out:\n  ' + offences.join('\n  '),
  );
});
