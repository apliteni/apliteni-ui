// The person mark's logic and its hues: the hash, the letters, and the contrast of the
// letters on every hue in both themes. The hues are fixed values, so no accent moves a
// ratio: reading the tokens is the whole measurement. The mark's markup is held by the
// React Avatar's own tests (react/src/primitives/Avatar.test.tsx).
// why: docs/components.md#avatar
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { avatarHue, avatarInitials, AVATAR_HUES } from './avatar.js';

const TOKENS = readFileSync(new URL('../tokens/tokens.css', import.meta.url), 'utf8');

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
  assert.equal(avatarInitials('Anne-Marie'), 'A');
  assert.equal(avatarInitials('Mary Ann Lee'), 'ML');
  assert.equal(avatarInitials('E\u0301lodie Dupont'), 'ÉD');
  assert.equal(avatarInitials('👩‍💻 Example'), '👩‍💻E');
  assert.equal(avatarInitials('🇺🇸 Example'), '🇺🇸E');
  assert.equal(avatarInitials(''), '');
  assert.equal(avatarInitials(null), '');
});

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
