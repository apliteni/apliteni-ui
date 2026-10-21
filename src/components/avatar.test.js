// The person mark: its hash, its letters, its markup, its place in a Dropdown and in the
// top bar, and the contrast of its letters on every hue in both themes. The hues are fixed
// values, so no accent moves a ratio: reading the tokens is the whole measurement.
// Limit: JSDOM has no layout, so sizes and the photo's failure paint are not measured here.
// why: docs/components.md#avatar
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { avatar, avatarHue, avatarInitials, AVATAR_HUES } from './avatar.js';
import { dropdown, wireDropdown } from './dropdown.js';
import { accountMenu } from './topbar.js';
import { appShell } from './shell.js';

const TOKENS = readFileSync(new URL('../tokens/tokens.css', import.meta.url), 'utf8');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
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
  assert.equal(avatarInitials('Anne-Marie'), 'A');
  assert.equal(avatarInitials('Mary Ann Lee'), 'ML');
  assert.equal(avatarInitials('E\u0301lodie Dupont'), 'ÉD');
  assert.equal(avatarInitials('👩‍💻 Example'), '👩‍💻E');
  assert.equal(avatarInitials('🇺🇸 Example'), '🇺🇸E');
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

test('explicit value wins and selecting a row without a mark clears the trigger', () => {
  const items = [
    { label: 'Ada Lovelace', value: 'ada', selected: true, avatar: { name: 'Ada Lovelace' } },
    { label: 'Bex Example', value: 'bex', avatar: { name: 'Bex Example' } },
    { label: 'Unassigned', value: 'none' },
  ];
  const d = doc(dropdown({ variant: 'select', value: 'Bex Example', items }));
  assert.equal(d.querySelector('.ui-dropdown__trigger > .ui-avatar').textContent, 'BE');
  const win = new JSDOM(`<body>${dropdown({ variant: 'select', items })}</body>`, { pretendToBeVisual: true }).window;
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, { value: win[key] ?? win, configurable: true, writable: true });
  }
  wireDropdown(win.document);
  win.document.querySelector('[data-value="none"]').click();
  assert.equal(win.document.querySelector('.ui-dropdown__trigger > .ui-avatar'), null);
  assert.equal(win.document.querySelector('.ui-dropdown__value').textContent, 'Unassigned');
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

test('the kit script removes a failed photo without an inline handler', () => {
  const dom = new JSDOM('<body></body>');
  Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true, writable: true });
  dom.window.document.body.innerHTML = avatar({ key: 'k', name: 'Mia Chen', src: 'https://example.com/a.jpg' });
  const el = dom.window.document.querySelector('.ui-avatar');
  assert.equal(el.querySelector('img').getAttribute('onerror'), null);
  el.querySelector('img').dispatchEvent(new dom.window.Event('error'));
  assert.equal(el.querySelector('img'), null);
  assert.equal(el.textContent, 'MC');
});

test('module startup finds photos that completed before the kit script ran', async () => {
  const markup = avatar({ name: 'Mia Chen', src: '/cached.png' })
    + avatar({ name: 'Mia Chen', src: '/missing.png' });
  const dom = new JSDOM(`<body>${markup}</body>`);
  const [loaded, failed] = dom.window.document.querySelectorAll('.ui-avatar img');
  for (const [img, width] of [[loaded, 96], [failed, 0]]) {
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: width });
  }
  const previous = globalThis.document;
  Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true, writable: true });
  try {
    await import('./avatar.js?preloaded');
    assert.ok(loaded.classList.contains('is-loaded'));
    assert.equal(dom.window.document.querySelectorAll('.ui-avatar img').length, 1);
    assert.equal(loaded.parentElement.textContent, 'MC');
  } finally {
    Object.defineProperty(globalThis, 'document', { value: previous, configurable: true, writable: true });
  }
});

test('Chromium shows letters without a broken image under a strict CSP', {
  skip: !process.env.AVATAR_CSP && 'set AVATAR_CSP=1 and UI_PLAYWRIGHT to run the browser check',
}, async () => {
  const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const browser = await (pw.chromium ?? pw.default.chromium).launch({ executablePath: process.env.UI_CHROME || undefined });
  const server = createServer((req, res) => {
    if (req.url === '/missing.png') { res.writeHead(404).end(); return; }
    if (req.url === '/') {
      if (req.headers['x-strict-csp'] === '1') res.setHeader('Content-Security-Policy', "script-src 'self'; script-src-attr 'none'; style-src 'self'");
      res.setHeader('Content-Type', 'text/html');
      res.end('<link rel="stylesheet" href="/src/index.css"><div id="root"></div><script type="module" src="/test-avatar.js"></script>');
      return;
    }
    if (req.url === '/test-avatar.js') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end("import { dropdown } from '/src/components/dropdown.js'; import { avatar } from '/src/components/avatar.js'; document.querySelector('#root').innerHTML = dropdown({ variant: 'select', value: 'Mia Chen', items: [{ label: 'Mia Chen', value: 'mia', avatar: { name: 'Mia Chen', src: '/missing.png' } }] }) + avatar({ name: 'Mia Chen', src: '/missing.png' });");
      return;
    }
    const file = path.resolve(root, `.${req.url}`);
    if (!file.startsWith(`${root}/`)) { res.writeHead(403).end(); return; }
    try {
      res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript');
      res.end(readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    for (const strict of [false, true]) {
      const page = await browser.newPage({ extraHTTPHeaders: strict ? { 'x-strict-csp': '1' } : {} });
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.waitForFunction(() => document.querySelectorAll('.ui-avatar').length === 3 && document.querySelectorAll('.ui-avatar img').length === 0);
      assert.deepEqual(await page.locator('.ui-avatar').allTextContents(), ['MC', 'MC', 'MC']);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('one person keeps one hue on the button, the menu head and the rail', () => {
  const reader = { name: 'Ada Lovelace', email: 'ada@example.com' };
  const hue = `ui-avatar--h${avatarHue('ada@example.com')}`;
  const menu = doc(accountMenu(reader));
  assert.ok(menu.querySelector('button.avatar > .ui-avatar').classList.contains(hue));
  const head = menu.querySelector('.ahead > .ui-avatar');
  assert.ok(head, 'the menu head draws the part, not the old .avatar gradient');
  assert.equal(menu.querySelector('.ahead .avatar'), null);
  assert.ok(head.classList.contains(hue));
  assert.equal(head.textContent, 'AL');
  const rail = doc(appShell({ account: reader })).querySelector('.ui-app__av > .ui-avatar');
  assert.ok(rail, 'the rail mark draws the part');
  assert.ok(rail.classList.contains(hue));
  assert.equal(rail.textContent, 'AL');
});

test('the vanilla rail and top bar use the shown name and the same missing-name glyph', () => {
  for (const [name, expected] of [['Anne-Marie', 'A'], ['Mary Ann Lee', 'ML'], ['', '']]) {
    const reader = { name, email: 'guest@example.com' };
    const shell = doc(appShell({ account: reader, topbar: { account: reader } }));
    for (const mark of shell.querySelectorAll('.ui-app__av > .ui-avatar, button.avatar > .ui-avatar')) {
      if (expected) assert.equal(mark.textContent, expected);
      else assert.ok(mark.classList.contains('ui-avatar--anon'));
    }
  }
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
