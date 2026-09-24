import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { topbar, footer, CHROME_CSS, CHROME_JS } from './chrome.mjs';

test('site crossfades use motion tokens and switch off under reduced motion', t => {
  const dom = new JSDOM(`<style>${CHROME_CSS}</style>`);
  t.after(() => dom.window.close());
  const rules = [...dom.window.document.styleSheets[0].cssRules];
  const reduced = rules.find(rule => rule.conditionText === '(prefers-reduced-motion: reduce)');
  assert.ok(reduced, 'site chrome must provide a reduced-motion media block');
  const matching = (list, selector) => [...list].filter(rule =>
    rule.selectorText?.split(',').map(s => s.trim()).includes(selector));

  for (const part of ['group', 'old', 'new']) {
    const selector = `::view-transition-${part}(root)`;
    const fades = matching(rules, selector);
    assert.ok(fades.length, `${selector} needs token-based timing`);
    for (const rule of fades) {
      assert.equal(rule.style.getPropertyValue('animation-duration'), 'var(--dur-fast)', selector);
      assert.equal(rule.style.getPropertyValue('animation-timing-function'), 'var(--ease)', selector);
    }
    const still = matching(reduced.cssRules, selector);
    assert.ok(still.length, `${selector} must respect reduced motion`);
    for (const rule of still) assert.equal(rule.style.getPropertyValue('animation'), 'none', selector);
  }
});

// Snapshot interpolation needs a real browser; these tests hold the action boundary.
function page(t, file, { reduced = false, supported = true, saved = false } = {}) {
  const html = readFileSync(new URL(file, import.meta.url), 'utf8')
    .replace('{{TOPBAR}}', topbar())
    .replace('{{FOOTER}}', footer());
  const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.matchMedia = query => ({ matches: reduced && query.includes('reduced-motion') });
  if (saved) {
    window.localStorage.setItem('apliteni-ui-theme', 'light');
    window.localStorage.setItem('apliteni-ui-accent', 'ocean');
  }
  const updates = [];
  if (supported) window.document.startViewTransition = update => { updates.push(update); };
  window.eval(CHROME_JS);
  return { window, document: window.document, updates };
}

for (const file of ['index.html', 'changelog.html']) {
  test(`${file}: restore saved colours without animating, then crossfade user switches`, t => {
    const { window, document, updates } = page(t, file, { saved: true });
    const root = document.documentElement;
    assert.equal(root.dataset.theme, 'light');
    assert.equal(root.dataset.accent, 'ocean');
    assert.equal(updates.length, 0);

    document.querySelector('#tgl').click();
    assert.equal(updates.length, 1);
    assert.equal(root.dataset.theme, 'light');
    updates.shift()();
    assert.equal(root.dataset.theme, 'dark');
    assert.equal(window.localStorage.getItem('apliteni-ui-theme'), 'dark');
    assert.equal(document.querySelector('#tgl').getAttribute('aria-label'), 'Theme: Dark. Switch to light.');

    document.querySelector('.accents [data-acc="phoenix"]').click();
    assert.equal(updates.length, 1);
    updates.shift()();
    assert.equal(root.dataset.accent, 'phoenix');
    assert.equal(window.localStorage.getItem('apliteni-ui-accent'), 'phoenix');
    assert.ok([...document.querySelectorAll('.accents .on')].every(b => b.dataset.acc === 'phoenix'));
  });
}

for (const options of [{ reduced: true }, { supported: false }]) {
  test(`colour switches stay immediate with ${JSON.stringify(options)}`, t => {
    const { document, updates } = page(t, 'index.html', options);
    document.querySelector('#tgl').click();
    document.querySelector('.accents [data-acc="emerald"]').click();
    assert.equal(document.documentElement.dataset.theme, 'light');
    assert.equal(document.documentElement.dataset.accent, 'emerald');
    assert.equal(updates.length, 0);
  });
}

test('queued theme clicks each toggle the state left by the previous update', t => {
  const { document, updates } = page(t, 'index.html');
  document.querySelector('#tgl').click();
  document.querySelector('#tgl').click();
  assert.equal(updates.length, 2);
  updates.forEach(update => update());
  assert.equal(document.documentElement.dataset.theme, 'dark');
});

test('a rapid accent change back to the current colour is not lost', t => {
  const { document, updates } = page(t, 'index.html');
  document.querySelector('.accents [data-acc="phoenix"]').click();
  document.querySelector('.accents [data-acc="default"]').click();
  updates.forEach(update => update());
  assert.equal(document.documentElement.hasAttribute('data-accent'), false);
});
