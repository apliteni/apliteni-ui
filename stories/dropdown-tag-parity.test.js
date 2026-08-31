/* Rule: a dropdown row renders the same whether the page writes it as a <div>,
 * an <a href> or a <button>.
 *
 * `.ui-dropdown__item.is-selected .ui-dropdown__tick` means a row gets chosen,
 * and choosing is a button's job — so <button class="ui-dropdown__item"> is
 * markup the kit invites. Before #251 it arrived wearing the browser's own
 * button skin, because the rule reset none of it.
 *
 * The browser's defaults are transcribed into the fixture below rather than
 * assumed, since jsdom models almost none of them. They are written as an
 * author rule of lower specificity than `.ui-dropdown__item`, which is the same
 * contest the real cascade holds between the UA origin and an author class:
 * with the reset gone, the transcribed rule wins here exactly as the UA sheet
 * wins there.
 *
 * why: docs/specification.md#a-dropdown-row-is-a-div-a-link-or-a-button
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/* jsdom resolves no custom property, so the sheet is handed over with its
   `var()`s already substituted — the same arrangement stories/nav-cascade.test.js
   uses. Only `:root` is read: this file gates a reset, and a reset does not
   change with the theme or the accent. */
const TOKENS = (() => {
  const vars = new Map();
  for (const [, selector, body] of decomment(read('src/tokens/tokens.css')).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selector.split(',').every((sel) => sel.trim() !== ':root')) continue;
    for (const decl of body.split(';')) {
      const i = decl.indexOf(':');
      if (i > 0 && decl.slice(0, i).trim().startsWith('--')) vars.set(decl.slice(0, i).trim(), decl.slice(i + 1).trim());
    }
  }
  assert.ok(vars.has('--font-sans'), 'no --font-sans on :root — the token file is not being read');
  return vars;
})();
const substitute = (css) => {
  let out = css;
  for (let pass = 0; pass < 12 && out.includes('var('); pass++) {
    out = out.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (m, name, fallback) => (
      TOKENS.has(name) ? TOKENS.get(name) : (fallback != null ? fallback.trim() : m)));
  }
  return out;
};

/* Chrome 150.0.7871.24, dark theme, `<button class="ui-dropdown__item">` with
 * the reset absent. Every value here was read off getComputedStyle in that
 * browser and pasted, so the fixture is a measurement rather than a memory of
 * one; `font` is the shorthand the UA actually writes, which is why answering
 * it with `font-family` alone left 13.3333px and `line-height: normal` behind.
 * Reported in #251 against 0.23.3. */
const UA_BUTTON = `
  button {
    background-color: rgb(107, 107, 107);
    border: 2px outset rgb(255, 255, 255);
    font: 400 13.3333px Arial;
    text-align: center;
    width: auto;
  }
`;

/* The row's children, identical under every tag, so a difference in the result
   is a difference the tag made. */
const GUTS = '<span class="ui-dropdown__main">'
  + '<span class="ui-dropdown__label">phoenix.2026.002</span>'
  + '<span class="ui-dropdown__desc">Product units, animated deck</span>'
  + '</span>'
  + '<span class="ui-dropdown__tick" aria-hidden="true"><svg viewBox="0 0 24 24"></svg></span>';

const TAGS = {
  div: `<div class="ui-dropdown__item is-selected" id="row" role="option">${GUTS}</div>`,
  a: `<a class="ui-dropdown__item is-selected" id="row" href="#v" role="option">${GUTS}</a>`,
  button: `<button class="ui-dropdown__item is-selected" id="row" type="button" role="option">${GUTS}</button>`,
};

/** Mount one row under the kit's real stylesheets and hand back a resolver. */
function row(tag, { reset = true } = {}) {
  let dropdown = read('src/styles/dropdown.css');
  if (!reset) dropdown = stripReset(dropdown);
  const css = UA_BUTTON + substitute(read('src/styles/base.css') + '\n' + dropdown);
  const w = new JSDOM(
    '<!doctype html><html lang="en" data-theme="dark"><head><style>' + css + '</style></head>'
    + '<body><div class="ui-dropdown__panel" role="listbox">' + TAGS[tag] + '</div></body></html>',
    { pretendToBeVisual: true },
  ).window;
  const el = w.document.getElementById('row');
  assert.ok(el, `the ${tag} fixture rendered no row`);
  return {
    window: w,
    css: (prop) => w.getComputedStyle(el).getPropertyValue(prop),
    desc: (prop) => w.getComputedStyle(w.document.querySelector('.ui-dropdown__desc')).getPropertyValue(prop),
  };
}

/** The mutation the gate exists to refuse: the five declarations, taken out. */
const RESET_DECLARATIONS = ['width: 100%', 'border: 0', 'background: none', 'text-align: left', 'font: inherit'];
function stripReset(css) {
  let out = css;
  for (const decl of RESET_DECLARATIONS) {
    const before = out;
    out = out.replace(`  ${decl};\n`, '');
    assert.notEqual(out, before, `\`${decl}\` is no longer written in .ui-dropdown__item — `
      + 'the reset this file gates has been reworded or removed, and the mutation test below '
      + 'is no longer removing anything. Re-read the rule before editing this list.');
  }
  return out;
}

/* jsdom re-quotes a font stack with double quotes and the token file writes
   single ones, so both sides are compared unquoted. */
const unquote = (v) => String(v).replace(/["']/g, '');

/* What the reset owes, and the value a row must resolve to. `div` is the
   reference: it is the tag the factory emits and the one no browser skins. */
const OWED = {
  width: '100%',
  'background-color': 'rgba(0, 0, 0, 0)',
  'border-top-width': '0px',
  'border-top-style': 'none',
  // Read out of the token file rather than pasted, so a change to the kit's
  // face moves this gate's expectation with it instead of past it.
  'font-family': TOKENS.get('--font-sans'),
  'font-size': TOKENS.get('--text-base'),
};

// ---- 1. every tag resolves to the same row -------------------------------

for (const tag of Object.keys(TAGS)) {
  test(`a row written as <${tag}> resolves the kit's own values, not the tag's`, () => {
    const r = row(tag);
    for (const [prop, want] of Object.entries(OWED)) {
      const got = r.css(prop);
      assert.ok(!got.includes('var('), `${prop} on a <${tag}> row is still \`${got}\` — an `
        + 'unresolved custom property measures nothing, so this assertion would report green '
        + 'on any value at all');
      assert.equal(unquote(got), unquote(want),
        `a <${tag} class="ui-dropdown__item"> resolves ${prop}: ${got}, and the kit asks for `
        + `${want}. The browser dresses a <button> in its own skin — grey fill, a 2px outset `
        + 'border, 13.3333px Arial, centred — and .ui-dropdown__item is what takes it off '
        + 'again (#251). Restore the declaration; do not append an override.');
    }
  });
}

test('the row\'s description inherits the kit\'s face, not the button\'s', () => {
  // .ui-dropdown__desc sets a size and no family, so it takes whatever the row
  // hands down. Under an unreset <button> that was Arial, one nesting level
  // below the property the reporter was looking at.
  assert.equal(
    unquote(row('button').desc('font-family')), unquote(OWED['font-family']),
    'the description under a <button> row is not in the kit\'s face — `font-family: inherit` '
    + 'on the row is what reaches it, and nothing else in the file sets it',
  );
});

// ---- 2. the gate is refusing a mutation, not describing the file ---------

test('removing the reset turns this gate red', () => {
  const bare = row('button', { reset: false });
  const failures = Object.entries(OWED).filter(([prop, want]) => unquote(bare.css(prop)) !== unquote(want));
  assert.ok(
    failures.length >= 4,
    'with the five reset declarations taken out of .ui-dropdown__item, a <button> row still '
    + `resolves ${Object.keys(OWED).length - failures.length} of ${Object.keys(OWED).length} `
    + 'properties to the kit\'s values. The fixture has stopped reproducing the defect, so '
    + 'gate 1 is passing on a button nothing is dressing.',
  );
});

// ---- the ledger: what this gate does not reach ---------------------------

test('the ledger is still accurate — jsdom has not started modelling these', () => {
  // (a) text-align. jsdom pins `center` onto a <button> above any author rule,
  //     whatever its specificity and whatever the source order, so the one
  //     property a browser and jsdom agree a button carries is the one property
  //     this file cannot gate on a button. Measured in Chrome 150 instead:
  //     `center` before the reset, `left` after. The declaration is checked
  //     where it can be — on the two tags jsdom cascades correctly, and in the
  //     rule all three share.
  for (const tag of ['div', 'a']) {
    assert.equal(row(tag).css('text-align'), 'left',
      `a <${tag}> row is not left-aligned — the shared declaration is gone or overridden`);
  }
  const r = row('button');
  const sheet = r.window.document.styleSheets[0];
  const item = [...sheet.cssRules].find((x) => x.selectorText === '.ui-dropdown__item');
  assert.ok(item, '.ui-dropdown__item is not a rule of its own any more — this gate reads it by name');
  assert.equal(item.style.getPropertyValue('text-align'), 'left',
    '.ui-dropdown__item no longer declares text-align. A <button> centres its own caption, and '
    + 'jsdom cannot be made to show it, so this declaration is held by name or not at all.');
  assert.equal(r.css('text-align'), 'center',
    'jsdom now cascades text-align onto a <button> correctly — move the property into OWED above '
    + 'and delete this note, the gate can hold it properly at last');

  // (b) appearance. A <button> keeps `appearance: auto` where a <div> has
  //     `none`, and no declaration here changes that. It paints nothing once
  //     the background and border are authored — before and after screenshots
  //     of the same two rows are pixel-identical — and .ui-nav__item and
  //     .ui-toast__action have both shipped without it.
  assert.equal(row('button').css('appearance'), 'auto',
    'a <button> row no longer reports appearance: auto — the note above is out of date');
});
