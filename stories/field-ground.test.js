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

/* What a disabled field reads on the card, per theme, so a token move changes a
 * number here and a person decides whether it is acceptable.
 *
 * `edge` is --disabled-border against the card. It is below the 3:1 non-text floor
 * in both themes — the kit's hairline, which WCAG 1.4.11 exempts a disabled control
 * from — so it is recorded rather than asserted against a bar. `ink` is
 * --disabled-ink on the field's own paint and must clear AA: that is the part a
 * reader has to read. What these replaced, and the dark theme's caveat, are in
 * docs/specification.md#colour-and-contrast.
 */
const DISABLED = {
  dark: { ground: '#211e2d', fill: '#211e2d', border: '#332f45', edge: 1.27, ink: 6.24 },
  light: { ground: '#ffffff', fill: '#ffffff', border: '#e4e7ee', edge: 1.24, ink: 6.11 },
};

test('a disabled field is read on the card, and its ink clears AA there', () => {
  for (const theme of THEMES) {
    const expected = DISABLED[theme];
    const boxed = readings[theme].fields
      .filter((f) => f.disabled && f.leaf.startsWith('input.ui-input'));
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
