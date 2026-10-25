// The vanilla person mark: its markup and its place in a Dropdown and in the top bar. The
// hash, the letters and the hue contrast are src/logic/avatar.test.js.
// Limit: JSDOM has no layout, so sizes and the photo's failure paint are not measured here.
// why: docs/components.md#avatar
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { avatar, avatarHue } from './avatar.js';
import { dropdown, wireDropdown } from './dropdown.js';
import { accountMenu } from './topbar.js';
import { appShell } from './shell.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const doc = (html) => new JSDOM(`<body>${html}</body>`).window.document;

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
