// The hero's rotating slogan: the list, the markup it produces, and what the
// page's own head script does with it in a DOM.
//
// Limits. JSDOM paints nothing, so nothing here can watch a frame. What it can
// hold is the reason the browser never paints the wrong line: the choice is a
// CSS rule emitted BEFORE the hero is parsed, so the h1 is laid out once, with
// the chosen words. That ordering, the rule's contents and the rules a themed
// slogan follows are what this file measures; the run's browser captures carry
// the rendered result. JSDOM's cascade is not trusted for :nth-child, so the
// shown slogan is read off the emitted rule rather than off a computed style.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { topbar, footer, CHROME_CSS, CHROME_JS } from './chrome.mjs';
import {
  SLOGANS, MAX_WORDS, SLOGAN_CSS, sloganText, sloganHtml, sloganMarkup,
  checkForm, checkSlogans, sloganScript, sloganCopy,
} from './slogans.mjs';

const TEMPLATE = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const THEMED = (entry) => typeof entry !== 'string';

// The page exactly as build.mjs hands it to a browser. The chrome can be left
// out to show what the head script alone has already settled.
const pageFor = (list, { chrome = true } = {}) => sloganCopy(TEMPLATE, list)
  .replace('{{TOPBAR}}', topbar(''))
  .replace('{{FOOTER}}', footer())
  .replace('{{CHROME_CSS}}', CHROME_CSS)
  .replace('{{CHROME_JS}}', chrome ? CHROME_JS : '')
  .replace('{{ICON_COUNT}}', '0')
  .replace('{{BUTTON_VARIANTS}}', 'Four')
  .replace('{{BUTTON_SIZES}}', 'four');

const PAGE = pageFor(SLOGANS);

/** Load the page with the head script's choice and the visitor's theme pinned. */
function load(t, { index = 0, list = SLOGANS, savedTheme = null, prefersLight = false, chrome = true, scripts = true } = {}) {
  const html = list === SLOGANS && chrome ? PAGE : pageFor(list, { chrome });
  const dom = new JSDOM(html, {
    url: 'https://example.test/',
    runScripts: scripts ? 'dangerously' : undefined,
    pretendToBeVisual: true,
    beforeParse(window) {
      // (index + 0.5)/n lands inside slot `index` whatever the float does at a
      // boundary, so the slot under test is never one off.
      window.Math.random = () => (index + 0.5) / list.length;
      window.matchMedia = (q) => ({
        matches: q.includes('prefers-color-scheme: light') ? prefersLight : false,
        addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
      });
      if (savedTheme) window.localStorage.setItem('apliteni-ui-theme', savedTheme);
    },
  });
  t.after(() => dom.window.close());
  const document = dom.window.document;
  return { dom, document, h1: document.getElementById('slogan') };
}

/** The slot the head script named, read off the rule it emitted. */
function shownSlot(document) {
  const styles = [...document.head.querySelectorAll('style')];
  const emitted = styles[styles.length - 1].textContent;
  const match = emitted.match(/#slogan \.s:nth-child\((\d+)\)\{display:inline\}/);
  assert.ok(match, `the head script must name one slot; it emitted: ${emitted}`);
  assert.match(emitted, /#slogan \.s:first-child\{display:none\}/,
    'the emitted rule must also stand the first slogan down, or two would show');
  return Number(match[1]);
}

test('every slogan in the list is a slogan, and the list itself holds together', () => {
  assert.ok(SLOGANS.length > 0, 'nothing to measure');
  let measured = 0;
  for (const [i, entry] of SLOGANS.entries()) {
    for (const form of THEMED(entry) ? [entry.dark, entry.light] : [entry]) {
      assert.doesNotThrow(() => checkForm(form, i + 1), `slogan ${i + 1}`);
      assert.ok(sloganText(form).trim().split(/\s+/).length <= MAX_WORDS, `slogan ${i + 1}: over ${MAX_WORDS} words`);
      assert.doesNotMatch(form, /[–—]/, `slogan ${i + 1}: dash`);
      assert.equal(sloganHtml(form).match(/class="grad"/g).length, 1, `slogan ${i + 1}: one accent`);
      measured++;
    }
  }
  const forms = SLOGANS.reduce((n, e) => n + (THEMED(e) ? 2 : 1), 0);
  assert.equal(measured, forms, 'a slogan went unmeasured');
  assert.doesNotThrow(() => checkSlogans());
});

test('the list keeps a theme-following slogan, and it reads differently per theme', () => {
  const themed = SLOGANS.filter(THEMED);
  assert.ok(themed.length >= 1, 'Artur asked for a slogan that follows the theme (round r24)');
  for (const entry of themed) {
    assert.notEqual(sloganText(entry.dark), sloganText(entry.light),
      'a themed slogan that reads the same in both themes follows nothing');
  }
});

test('a broken slogan is rejected rather than shipped', () => {
  const over = 'One two three four five six seven [eight]';
  assert.throws(() => checkForm(over, 'x'), /the limit is 6/);
  assert.throws(() => checkForm('No accent group here', 'x'), /exactly one \[accent\] group/);
  assert.throws(() => checkForm('Two [a] groups [b]', 'x'), /exactly one \[accent\] group/);
  assert.throws(() => checkForm('An empty [] group', 'x'), /\[accent\] group is empty/);
  assert.throws(() => checkForm('A dash — here [x]', 'x'), /dash/);
  assert.throws(() => checkForm('Raw <b>[markup]</b>', 'x'), /writes markup/);
  assert.throws(() => checkForm('', 'x'), /empty/);
  assert.throws(() => checkSlogans([over]), /the limit is 6/);
  assert.throws(() => checkSlogans([{ dark: 'A [b]', light: 'C [d]' }]), /cannot be themed/);
  assert.throws(() => checkSlogans(['A [b]', { dark: 'C [d]' }]), /one form per theme/);
  assert.throws(() => checkSlogans(['A [b]', { dark: over, light: 'C [d]' }]), /the limit is 6/);
  assert.throws(() => checkSlogans(['A [b]', 'A [b]']), /already in the list/);
  assert.throws(() => checkSlogans([]), /empty/);
  // And a broken slogan stops the build rather than reaching the page.
  assert.throws(() => sloganCopy(TEMPLATE, [over]), /the limit is 6/);
});

test('the h1 ships every slogan, in the order Artur is choosing from', (t) => {
  const { h1 } = load(t, { scripts: false });
  const shown = [...h1.children];
  assert.equal(shown.length, SLOGANS.length, 'one .s per slogan, no more and no fewer');
  for (const [i, entry] of SLOGANS.entries()) {
    const span = shown[i];
    assert.equal(span.className, 's', `slogan ${i + 1} must be a plain .s`);
    if (THEMED(entry)) {
      for (const theme of ['dark', 'light']) {
        const form = span.querySelector(`.t--${theme}`);
        assert.ok(form, `slogan ${i + 1} must carry a ${theme} form`);
        assert.equal(form.innerHTML, sloganHtml(entry[theme]));
      }
    } else {
      assert.equal(span.innerHTML, sloganHtml(entry), `slogan ${i + 1} is not the slogan at ${i + 1}`);
    }
  }
});

test('without JavaScript the first slogan shows, and only that one', (t) => {
  assert.ok(!THEMED(SLOGANS[0]), 'slogan 1 must not be themed; nothing would switch it');
  const { document, h1 } = load(t, { scripts: false });
  // No script ran, so no slot was named: what shows is whatever the page's own
  // rules say, read off those rules.
  const emitted = [...document.head.querySelectorAll('style')]
    .map((s) => s.textContent).join('\n');
  assert.doesNotMatch(emitted, /#slogan \.s:nth-child/, 'nothing should have named a slot');
  const dom = new JSDOM(`<style>${SLOGAN_CSS}</style>`);
  t.after(() => dom.window.close());
  const rules = [...dom.window.document.styleSheets[0].cssRules];
  const find = (selector) => rules.find((r) => r.selectorText === selector);
  assert.equal(find('#slogan .s')?.style.display, 'none', 'slogans are hidden by default');
  assert.equal(find('#slogan .s:first-child')?.style.display, 'inline', 'the first one is not');
  assert.equal(h1.children[0].innerHTML, sloganHtml(SLOGANS[0]));
});

test('a themed slogan follows data-theme in CSS, so the toggle switches it', (t) => {
  const dom = new JSDOM(`<style>${SLOGAN_CSS}</style>`);
  t.after(() => dom.window.close());
  const rules = [...dom.window.document.styleSheets[0].cssRules];
  const display = (selector) => rules.find((r) => r.selectorText === selector)?.style.display;
  // Dark is the page's resting state, so the dark form needs no rule of its own.
  assert.equal(display('#slogan .t--light'), 'none', 'the light form is off by default');
  assert.equal(display('html[data-theme="light"] #slogan .t--light'), 'inline');
  assert.equal(display('html[data-theme="light"] #slogan .t--dark'), 'none');
  // No script listens for the theme: the rules above are the whole mechanism,
  // which is why the words change inside the chrome's own crossfade.
  assert.ok(!sloganScript().includes('addEventListener'), 'the switch must stay in CSS');
});

test('the choice is made before the hero is parsed, and nothing fires later', () => {
  const script = PAGE.indexOf('var pick = Math.floor(Math.random()');
  const hero = PAGE.indexOf('id="slogan"');
  assert.ok(script > -1 && hero > -1, 'both the picker and the hero must be on the page');
  assert.ok(script < hero, 'a picker after the h1 can be beaten to the screen (#463, r24)');
  for (const later of ['setTimeout', 'setInterval', 'requestAnimationFrame', 'transition', 'animate']) {
    assert.ok(!sloganScript().includes(later), `the picker must not ${later}: it chooses once, at load`);
  }
});

test('each slot of the list can be the one that shows, and the slot is the slogan', (t) => {
  const seen = new Set();
  for (const [i, entry] of SLOGANS.entries()) {
    const { document, h1 } = load(t, { index: i });
    const slot = shownSlot(document);
    assert.equal(slot, i + 1, `slot ${i + 1} named ${slot}`);
    const span = h1.children[slot - 1];
    const expected = THEMED(entry) ? sloganHtml(entry.dark) : sloganHtml(entry);
    assert.ok(span.innerHTML.includes(expected), `slot ${slot} holds the wrong slogan`);
    seen.add(slot);
  }
  // Coverage: the walk reached every slogan, not the same one twenty times.
  assert.equal(seen.size, SLOGANS.length, 'the picker cannot reach every slogan');
});

test('the theme is settled before the hero is parsed, not after', (t) => {
  // The regression this file exists for. The page ships a static
  // <html data-theme="dark">; a mechanism that trusts it shows a light visitor
  // the dark words and then changes them. With the chrome script gone, what the
  // head script settled is what stands.
  for (const [theme, prefersLight] of [['light', true], ['dark', false]]) {
    const { document } = load(t, { prefersLight, chrome: false });
    assert.equal(document.documentElement.getAttribute('data-theme'), theme,
      `a visitor whose system asks for ${theme} must have it before the hero is laid out`);
  }
  const saved = load(t, { prefersLight: false, savedTheme: 'light', chrome: false });
  assert.equal(saved.document.documentElement.getAttribute('data-theme'), 'light',
    'a saved choice outranks the system preference, the way the chrome reads it');
  // And the chrome still agrees with it once it runs.
  const whole = load(t, { prefersLight: true });
  assert.equal(whole.document.documentElement.getAttribute('data-theme'), 'light');
});

test('the rule that names the slogan wins, because it is emitted last', (t) => {
  const { document } = load(t, { index: 3 });
  const styles = [...document.head.querySelectorAll('style')];
  assert.ok(styles.length >= 2, 'the page has its own stylesheet and the emitted one');
  assert.match(styles[styles.length - 1].textContent, /nth-child\(4\)/,
    'the emitted rule must be last in the head; it ties on specificity and wins on order');
});

test('the markers are filled once, and a missing one is an error', () => {
  for (const marker of ['{{SLOGAN}}', '{{SLOGAN_CSS}}', '{{SLOGAN_JS}}']) {
    assert.equal(TEMPLATE.split(marker).length, 2, `index.html needs exactly one ${marker}`);
    assert.throws(() => sloganCopy(TEMPLATE.replace(marker, 'stale')), /Expected one/);
    assert.throws(() => sloganCopy(TEMPLATE + marker), /Expected one/);
  }
  assert.doesNotMatch(sloganCopy(TEMPLATE), /\{\{SLOGAN(?:_CSS|_JS)?\}\}/);
  assert.equal(sloganMarkup().match(/class="s"/g).length, SLOGANS.length);
});
