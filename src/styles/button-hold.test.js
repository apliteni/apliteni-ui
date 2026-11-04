// What button.css paints on a hold button's fill, by theme and by state, on the React Button's markup.
// The cascade is resolved in JSDOM, so a colour reads as the token it names. Nothing is laid out or measured for contrast.
// JSDOM drops a var() background, so the danger fill is read by the ink its pink rule sets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { markup } from '../../stories/lib/react-markup.js';

const css = readFileSync(new URL('./button.css', import.meta.url), 'utf8');

const paint = async (variant, { theme, attr } = {}, sheet = css) => {
  const html = await markup(({ h, kit }) => h(kit.Button, { hold: true, variant, onConfirm: () => {} }, 'Delete workspace'));
  const dom = new JSDOM(`<style>${sheet}</style>${html}`);
  try {
    const { document } = dom.window;
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    if (attr) document.querySelector('.ui-btn').setAttribute(attr, '');
    const style = dom.window.getComputedStyle(document.querySelector('.ui-btn__hold-fill'));
    return { color: style.color };
  } finally {
    dom.window.close();
  }
};

// The default theme is dark, so a page with no data-theme takes the dark ink too.
test('the primary fill takes the dark ink with no data-theme, as under data-theme="dark"', async () => {
  assert.equal((await paint('primary')).color, 'var(--signal-contrast)');
  assert.equal((await paint('primary', { theme: 'dark' })).color, 'var(--signal-contrast)');
  assert.equal((await paint('primary', { theme: 'light' })).color, 'var(--accent-contrast)');
});

test('the check reports a dark ink that needs the data-theme attribute', async () => {
  const broken = css.replace(':where(:root:not([data-theme="light"]))', ':where(:root[data-theme="dark"])');
  assert.notEqual(broken, css, 'no default-theme ink rule found to change');
  assert.equal((await paint('primary', {}, broken)).color, 'var(--accent-contrast)');
});

// A release outside the button ends the hold while the fill still drains.
test('the danger fill keeps its pink while it drains, and is quiet at rest', async () => {
  assert.equal((await paint('danger', { attr: 'data-hold-drain' })).color, 'var(--danger-contrast)');
  assert.equal((await paint('danger', { attr: 'data-holding' })).color, 'var(--danger-contrast)');
  assert.notEqual((await paint('danger')).color, 'var(--danger-contrast)');
});

test('the check reports a pink that drops when the hold ends', async () => {
  const broken = css.replace(', [data-hold-drain])', ')');
  assert.notEqual(broken, css, 'no drain state found to remove');
  assert.notEqual((await paint('danger', { attr: 'data-hold-drain' }, broken)).color, 'var(--danger-contrast)');
});
