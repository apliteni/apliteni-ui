// The person mark: its hash, its letters, its markup, its place in a Dropdown and in the
// top bar, and the contrast of its letters on every hue in both themes. The hues are fixed
// values, so no accent moves a ratio: reading the tokens is the whole measurement.
// Limit: JSDOM has no layout, so sizes and the photo's failure paint are not measured here.
// why: docs/components.md#avatar
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { avatar, avatarHue, avatarInitials, AVATAR_HUES } from './avatar.js';
import { dropdown, wireDropdown } from './dropdown.js';
import { accountMenu } from './topbar.js';

const TOKENS = readFileSync(new URL('../tokens/tokens.css', import.meta.url), 'utf8');
const doc = (html) => new JSDOM(`<body>${html}</body>`).window.document;

test('the hash is stable: FNV-1a 32 bit over UTF-8, modulo 8', () => {
  assert.equal(AVATAR_HUES, 8);
  const known = { user_1042: 4, user_1043: 7, 'avery.example@example.com': 1, '8f14e45f': 0, 'jordan-example': 0 };
  for (const [key, hue] of Object.entries(known)) assert.equal(avatarHue(key), hue, key);
  assert.equal(avatarHue(1042), avatarHue('1042'));
  const seen = new Set();
  for (let i = 1; i <= 214; i++) seen.add(avatarHue(`user_${i}`));
  assert.equal(seen.size, 8, 'all eight hues are used');
});

test('letters: first and last word, one for a one-word name, none for no name', () => {
  assert.equal(avatarInitials('Mia'), 'M');
  assert.equal(avatarInitials('mia chen'), 'MC');
  assert.equal(avatarInitials('Alexandra Maria Dos Santos Ferreira'), 'AF');
  assert.equal(avatarInitials('  Noor   Haddad '), 'NH');
  assert.equal(avatarInitials(''), '');
  assert.equal(avatarInitials(null), '');
});

test('a named mark has its hue class, its letters and no accessible name', () => {
  const el = doc(avatar({ key: 'user_1042', name: 'Avery Example' })).querySelector('.ui-avatar');
  assert.ok(el.classList.contains('ui-avatar--h4'));
  assert.equal(el.textContent, 'AE');
  assert.equal(el.getAttribute('aria-hidden'), 'true');
  assert.ok(!el.classList.contains('ui-avatar--32'));
  assert.ok(doc(avatar({ name: 'A', size: 32 })).querySelector('.ui-avatar--32'));
});

test('an empty name draws the user glyph, and empty draws the dashed ring', () => {
  const anon = doc(avatar({ key: 'k', name: '' })).querySelector('.ui-avatar');
  assert.ok(anon.classList.contains('ui-avatar--anon'));
  assert.ok(anon.querySelector('svg'));
  const ring = doc(avatar({ empty: true })).querySelector('.ui-avatar');
  assert.ok(ring.classList.contains('ui-avatar--empty'));
  assert.equal(ring.textContent, '');
});

test('a photo sits after the letters, so a failed photo leaves the letters', () => {
  const el = doc(avatar({ key: 'k', name: 'Mia Chen', src: 'https://example.com/a.jpg' })).querySelector('.ui-avatar');
  assert.equal(el.firstChild.textContent, 'MC');
  const img = el.querySelector('img');
  assert.equal(img.getAttribute('alt'), '');
  assert.equal(img.getAttribute('src'), 'https://example.com/a.jpg');
  assert.equal(doc(avatar({ name: 'M', src: 'javascript:alert(1)' })).querySelector('img').getAttribute('src'), '#');
});

const PEOPLE = [['user_1', 'Avery Example'], ['user_2', 'Jordan Okafor'], ['user_3', '']];
const people = (selected) => [
  { label: 'No one', value: '', avatar: { empty: true } },
  ...PEOPLE.map(([key, name]) => ({
    label: name || 'guest@example.com', value: key, selected: key === selected, avatar: { key, name },
  })),
];

test('every avatar row leads with its mark, and the trigger shows the chosen one', () => {
  const d = doc(dropdown({ variant: 'select', items: people('user_2'), ariaLabel: 'Owner' }));
  const rows = [...d.querySelectorAll('[data-dd-item]')];
  assert.equal(rows.length, 4);
  for (const row of rows) assert.ok(row.firstElementChild.classList.contains('ui-avatar'));
  const lead = d.querySelector('.ui-dropdown__trigger > .ui-avatar');
  assert.equal(lead.textContent, 'JO');
  assert.ok(!d.querySelector('.ui-dropdown__value').classList.contains('is-placeholder'));
});

test('with no value the trigger shows the dashed ring and the placeholder in its ink', () => {
  const d = doc(dropdown({ variant: 'select', items: people(null), placeholder: 'Choose a person' }));
  assert.ok(d.querySelector('.ui-dropdown__trigger > .ui-avatar--empty'));
  const v = d.querySelector('.ui-dropdown__value');
  assert.equal(v.textContent, 'Choose a person');
  assert.ok(v.classList.contains('is-placeholder'));
});

test('a dropdown without avatars draws no mark', () => {
  const d = doc(dropdown({ variant: 'select', items: [{ label: 'A', value: 'a' }] }));
  assert.equal(d.querySelectorAll('.ui-avatar').length, 0);
});

test('picking a row carries its mark into the trigger', () => {
  const win = new JSDOM(`<body>${dropdown({ variant: 'select', items: people(null) })}</body>`, { pretendToBeVisual: true }).window;
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, { value: win[key] ?? win, configurable: true, writable: true });
  }
  const d = win.document;
  wireDropdown(d);
  d.querySelector('[data-value="user_1"]').click();
  assert.equal(d.querySelector('.ui-dropdown__trigger > .ui-avatar').textContent, 'AE');
  assert.ok(!d.querySelector('.ui-dropdown__value').classList.contains('is-placeholder'));
  d.querySelector('[data-value=""]').click();
  assert.ok(d.querySelector('.ui-dropdown__trigger > .ui-avatar--empty'));
});

test('search count names the set in the placeholder and the field, less a No one row', () => {
  const field = (search) => doc(dropdown({ variant: 'select', items: people(null), search })).querySelector('[data-dd-search]');
  const counted = field({ count: true });
  assert.equal(counted.getAttribute('placeholder'), 'Search 3 people');
  assert.equal(counted.getAttribute('aria-label'), 'Search 3 people');
  assert.equal(field({ count: 214 }).getAttribute('placeholder'), 'Search 214 people');
  assert.equal(field({ count: 12, noun: 'teams' }).getAttribute('aria-label'), 'Search 12 teams');
  assert.equal(field({ count: 5, placeholder: 'Find' }).getAttribute('placeholder'), 'Find');
  assert.equal(field(true).getAttribute('placeholder'), 'Search');
});

test('the top bar account button draws the part at 32px, hue from the address', () => {
  const d = doc(accountMenu({ name: 'Ada Lovelace', email: 'ada@example.com' }));
  const mark = d.querySelector('button.avatar > .ui-avatar--32');
  assert.equal(mark.textContent, 'AL');
  assert.ok(mark.classList.contains(`ui-avatar--h${avatarHue('ada@example.com')}`));
});

// ---- contrast --------------------------------------------------------------
const block = (start) => {
  const i = TOKENS.indexOf(start);
  return TOKENS.slice(i, TOKENS.indexOf('\n}', i));
};
const THEMES = {
  dark: block(':root,\n:root[data-theme="dark"] {'),
  light: block(':root[data-theme="light"] {'),
};
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

for (const [theme, css] of Object.entries(THEMES)) {
  test(`contrast: the letter ink holds 4.5:1 on all eight hues in ${theme}`, () => {
    const ink = theme === 'dark' ? '#0c0c0c' : '#ffffff';
    assert.match(css, theme === 'dark' ? /--signal-solid-ink: var\(--signal-contrast\)/ : /--signal-solid-ink: #ffffff/);
    assert.match(TOKENS, /--signal-contrast: #0c0c0c/);
    for (let i = 0; i < AVATAR_HUES; i++) {
      const hue = css.match(new RegExp(`--person-${i}: (#[0-9a-f]{6})`))?.[1];
      assert.ok(hue, `--person-${i} is declared in ${theme}`);
      const r = ratio(hue, ink);
      assert.ok(r >= 4.5, `--person-${i} ${hue} against ${ink} is ${r.toFixed(2)}:1`);
    }
  });
}

test('contrast: the ledger is not vacuous — a failing pair is caught', () => {
  assert.ok(ratio('#ffffff', '#ffcf6a') < 4.5);
});
