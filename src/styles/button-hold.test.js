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
