/* Rule: a field in a component gallery is shown on a painted surface, never on
 * the page ground.
 *
 * Cause and numbers: docs/specification.md#colour-and-contrast. Raised by Artur in
 * round r28 of #551 — "Disabled fields almost invisible because of that."
 *
 * Limits, read before trusting a green run:
 *  - stories/components/ only. A guideline page's prose and a showcase's toolbar
 *    ground are those pages' decisions, not this one's.
 *  - Winning declarations in JSDOM, not pixels: a rule inside a media query is
 *    unmeasured, and so is anything that depends on layout.
 *  - At rest. Hover, focus and active grounds belong to stories/contrast.test.js.
 *  - A ratio is not legibility. It says the edge is there to be found; the point of
 *    the numbers below is that a token move changes one and a person reads it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  AA_TEXT, composite, desugar, effectiveBackground, installDomGlobals, kitCssFor,
  makeStyleCache, parseColour, ratio, selectorPath, serialize, storyFiles, substitute,
} from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES = ['dark', 'light'];

// Subjects are discovered, not listed: every gallery under stories/components/.
const GALLERIES = storyFiles.filter((file) => file.startsWith('components/'));

// What the kit calls a field: the three form controls, plus the two that paint a
// box of their own out of the same three tokens.
const FIELD = '.ui-input, .ui-select, .ui-textarea, .ui-check input, .ui-switch__track';

const hex = (colour) => `#${colour.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
const same = (a, b) => hex(a) === hex(b);

/** Every field one gallery renders, read against the ground it actually sits on. */
async function readFields(theme) {
  const { vars, css } = kitCssFor(theme);
  const page = parseColour(vars.get('--bg'));
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head><body></body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  const win = dom.window;
  installDomGlobals(win);
  const styles = makeStyleCache(win);

  const fields = [];
  const stories = [];
  for (const rel of GALLERIES) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      const out = serialize(render(args, { globals: { theme }, args }));
      assert.notEqual(out, null, `${rel}:${name} did not render to markup`);
      stories.push(`${rel}:${name}`);
      styles.mutate(() => { win.document.body.innerHTML = desugar(substitute(out, vars)); });

      for (const el of win.document.body.querySelectorAll(FIELD)) {
        const ground = el.parentElement
          && effectiveBackground(el.parentElement, win, (node) => styles.of(node));
        if (!Array.isArray(ground)) continue; // an image ground is nobody's to measure
        const computed = win.getComputedStyle(el);
        let fill = parseColour(computed.backgroundColor);
        if (fill && fill[3] < 0.999) fill = composite(fill, ground);
        const border = parseColour(computed.borderTopColor);
        // The label carries the ink of a checkbox or a switch; the box carries its own.
        const inkOwner = el.matches('.ui-check input, .ui-switch__track') ? (el.closest('label') || el) : el;
        const ink = parseColour(win.getComputedStyle(inkOwner).color);
        fields.push({
          story: `${rel}:${name}`,
          path: selectorPath(el),
          leaf: selectorPath(el).split(' > ').pop(),
          disabled: el.disabled === true || el.hasAttribute('disabled'),
          onPage: same(ground, page),
          ground: hex(ground),
          fill: fill ? hex(fill) : null,
          border: border && border[3] > 0 ? hex(border) : null,
          edge: border && border[3] > 0 ? Number(ratio(border, ground).toFixed(2)) : null,
          ink: ink ? Number(ratio(ink, fill && fill[3] >= 0.999 ? fill : ground).toFixed(2)) : null,
        });
      }
    }
  }
  return { fields, stories };
}

/** The problem lines a set of readings produces. One expression, so the claim and
 *  the mutation below run the same code rather than two spellings of it. */
const stranded = (fields) => fields.filter((f) => f.onPage).map((f) => `${f.story} → ${f.path}`);

const readings = Object.fromEntries(await Promise.all(
  THEMES.map(async (theme) => [theme, await readFields(theme)]),
));

test('the walk reaches every gallery and finds the fields in them', () => {
  // 27 galleries under stories/components/. A file added there is measured by
  // being there; this number is what says the walk did not stop reading them.
  assert.equal(GALLERIES.length, 27, 'gallery discovery changed; update the count with the file that moved');
  for (const theme of THEMES) {
    const { fields, stories } = readings[theme];
    assert.ok(stories.length >= 110, `${theme}: only ${stories.length} gallery stories rendered`);
    // Switch & Checkbox 16, Inputs 9, Pagination 7, Drawer 4, Card 1, Tabs 1.
    assert.equal(fields.length, 38, `${theme}: field discovery changed; update the count with the specimens that moved`);
    assert.ok(fields.some((f) => f.disabled), `${theme}: no disabled field reached the walk`);
  }
});

test('no field in a component gallery is shown on the page ground', () => {
  for (const theme of THEMES) {
    assert.deepEqual(stranded(readings[theme].fields), [],
      `${theme}: a field is drawn on the page ground, where its own paint is`);
  }
});

test('the gate rejects a field left on the page ground', () => {
  assert.deepEqual(stranded([{ story: 'fx:A', path: 'div > input.ui-input', onPage: false }]), []);
  assert.deepEqual(
    stranded([{ story: 'fx:A', path: 'div > input.ui-input', onPage: true }]),
    ['fx:A → div > input.ui-input'],
  );
});

/* What a text field reads on the card, off and on, per theme, so a token move
 * changes a number here and a person decides whether it is acceptable.
 *
 * `edge` is the field's border against the card — --disabled-border off and
 * --field-edge on. Both are below the 3:1 non-text floor, which WCAG 1.4.11
 * exempts a disabled control from and the kit's hairline has never reached on a
 * near-black page, so they are recorded rather than asserted against a bar. What
 * IS asserted is the gap between them, below. `ink` is the field's colour on its
 * own paint and must clear AA off as well as on: that is the part a reader has to
 * read. What these replaced, and the dark theme's headroom, are in
 * docs/specification.md#colour-and-contrast.
 */
const DISABLED = {
  dark: { ground: '#211e2d', fill: '#211e2d', border: '#2d293c', edge: 1.16, ink: 6.24 },
  light: { ground: '#ffffff', fill: '#ffffff', border: '#e4e7ee', edge: 1.24, ink: 6.11 },
};

/* The same field on. `border` is --field-edge and holds wherever the field is put;
 * `onCard` is what it reads on the card, which is the ground the disabled reading
 * above is taken on and so the only one the two can be compared on. A field also
 * reaches the floating surface — a drawer's form — and the grounds the walk finds
 * are recorded in GROUNDS below rather than left to a count. */
const ENABLED = {
  dark: { border: '#332f45', onCard: { ground: '#211e2d', fill: '#211e2d', edge: 1.27 } },
  light: { border: '#cdd2dc', onCard: { ground: '#ffffff', fill: '#ffffff', edge: 1.52 } },
};

// Every ground an enabled text field is drawn on in the galleries: the card, and
// the floating surface a drawer's form sits on. A new one lands here deliberately.
const GROUNDS = { dark: ['#211e2d', '#2a2639'], light: ['#ffffff'] };

/** Every plain text field the walk found in one state. An invalid one is left out:
 *  its border is --pink, which is the error talking and not the state. */
const boxedFields = (theme, disabled) => readings[theme].fields.filter((f) => (
  f.disabled === disabled
  && f.leaf.startsWith('input.ui-input')
  && !f.leaf.includes('is-invalid')
));

test('a disabled field is read on the card, and its ink clears AA there', () => {
  for (const theme of THEMES) {
    const expected = DISABLED[theme];
    const boxed = boxedFields(theme, true);
    assert.ok(boxed.length >= 1, `${theme}: no disabled text field in the walk`);
    for (const f of boxed) {
      assert.deepEqual(
        { ground: f.ground, fill: f.fill, border: f.border, edge: f.edge, ink: f.ink },
        expected,
        `${theme}: the disabled field's reading moved — review it by hand`,
      );
      assert.ok(f.ink >= AA_TEXT, `${theme}: disabled ink ${f.ink}:1 is below AA on the field's own paint`);
    }
  }
});

/** What is wrong with one off/on pair, as lines. One expression, so the claim below
 *  and the mutation after it run the same code rather than two spellings of it. */
const fainter = (off, on) => [
  off.edge < on.edge ? null
    : `edge ${off.edge}:1 off against ${on.edge}:1 on — off has to be the fainter`,
  off.border === on.border
    ? `both states draw ${off.border}, so only the words tell them apart` : null,
].filter(Boolean);

/* Rule: a field that is off draws the fainter edge of the two, in both themes, so
 * the box and not only the words reports the state. Why dark's gap is the smaller,
 * and what it cost: docs/specification.md#colour-and-contrast, decided in #564.
 *
 * Limits beyond the walk's own: the subject is the text field, which is the control
 * that carries --field-edge. A checkbox takes --control-edge and a switch track
 * fades, so neither is read here.
 */
test('a disabled field draws a fainter edge than an enabled one, in both themes', () => {
  for (const theme of THEMES) {
    const on = boxedFields(theme, false);
    const off = boxedFields(theme, true);
    assert.ok(on.length >= 1, `${theme}: no enabled text field in the walk`);
    assert.ok(off.length >= 1, `${theme}: no disabled text field in the walk`);

    assert.deepEqual(
      [...new Set(on.map((f) => f.ground))].sort(), [...GROUNDS[theme]].sort(),
      `${theme}: an enabled field is drawn on a ground this ledger does not record`,
    );
    for (const f of on) {
      assert.equal(f.border, ENABLED[theme].border,
        `${theme}: an enabled field's edge is ${f.border}, not --field-edge, at ${f.story}`);
      if (f.ground !== ENABLED[theme].onCard.ground) continue;
      assert.deepEqual(
        { ground: f.ground, fill: f.fill, edge: f.edge },
        ENABLED[theme].onCard,
        `${theme}: the enabled field's reading on the card moved — review it by hand`,
      );
    }
    // Measured against measured, never ledger against ledger: two constants
    // compare the same whatever the sheet says, which is a gate that cannot fail.
    const onCard = on.filter((f) => f.ground === ENABLED[theme].onCard.ground);
    assert.ok(onCard.length >= 1, `${theme}: no enabled text field on the card in the walk`);
    for (const f of off) {
      for (const live of onCard) {
        assert.deepEqual(fainter(f, live), [],
          `${theme}: a disabled field does not read as off beside the live one`);
      }
    }
  }
});

test('the gate rejects a disabled edge that matches the enabled one', () => {
  const live = { edge: 1.27, border: '#332f45' };
  assert.deepEqual(fainter({ edge: 1.16, border: '#2d293c' }, live), []);
  // The state #564 fixed: one token answering both, so the pair is identical.
  assert.deepEqual(fainter({ edge: 1.27, border: '#332f45' }, live), [
    'edge 1.27:1 off against 1.27:1 on — off has to be the fainter',
    'both states draw #332f45, so only the words tell them apart',
  ]);
  // And a disabled edge that went the other way, stronger than the live one.
  assert.deepEqual(fainter({ edge: 1.52, border: '#453f5c' }, live), [
    'edge 1.52:1 off against 1.27:1 on — off has to be the fainter',
  ]);
});
