/* Rule: the kit has one page shell, and it is built from the kit's own nav.
 *
 * The gates here are about composition, not looks: a rail item stays named at
 * every width, the shell emits exactly one <main>, the caller owns the crumb
 * trail, the navigation landmark has a name, and accountShell() — a published
 * export — still accepts everything it accepted before.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { sidebarNav } from '../../src/components/nav.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

// ---- 1. a rail item is named whether or not it is collapsed --------------

test('a sidebar item carries its accessible name even when not collapsed', () => {
  const html = sidebarNav({ items: [{ id: 'a', label: 'Overview', icon: 'chart' }] });
  assert.match(
    html, /aria-label="Overview"/,
    'an expanded rail item has no accessible name of its own, so the CSS fold at '
    + 'narrow widths would hide the label and leave the icon unnamed',
  );
});

test('an expanded sidebar item does not carry a title tooltip', () => {
  const html = sidebarNav({ items: [{ id: 'a', label: 'Overview', icon: 'chart' }] });
  assert.doesNotMatch(
    html, /title="Overview"/,
    'the label is already on screen at this width — a tooltip repeating it is noise',
  );
});

test('a collapsed sidebar item still carries the title tooltip', () => {
  const html = sidebarNav({ items: [{ id: 'a', label: 'Overview', icon: 'chart' }], collapsed: true });
  assert.match(html, /title="Overview"/);
  assert.match(html, /aria-label="Overview"/);
});

test('a disabled sidebar item is named the same way', () => {
  const html = sidebarNav({ items: [{ id: 'a', label: 'Settings', icon: 'gear', disabled: true }] });
  assert.match(html, /aria-disabled="true" aria-label="Settings"/);
  assert.doesNotMatch(html, /title="Settings"/);
});

test('a collapsible group head is named whether or not it is collapsed', () => {
  const html = sidebarNav({
    items: [{ icon: 'card', label: 'Payouts', items: [{ id: 'p', label: 'Pending' }] }],
  });
  assert.match(html, /aria-label="Payouts"/);
  assert.doesNotMatch(html, /title="Payouts"/);
});

test('a label with markup in it is escaped in the accessible name too', () => {
  const html = sidebarNav({ items: [{ id: 'a', label: 'Access & agents' }] });
  assert.match(html, /aria-label="Access &amp; agents"/);
});

// An always-on aria-label overrides the row's own text, badge included. Before
// the name was written out it was computed from the content, so "Pending 3" is
// what a reader heard; a label-only name silently drops the count.
test('a badged item keeps its count in its accessible name', () => {
  const html = sidebarNav({ items: [{ id: 'p', label: 'Pending', icon: 'card', badge: 3 }] });
  assert.match(
    html, /aria-label="Pending 3"/,
    'the row is announced as "Pending" — the count is on screen and not in the name',
  );
});

test('a toned badge object contributes its text, not its tone', () => {
  const html = sidebarNav({ items: [{ id: 'p', label: 'Alerts', badge: { text: '12', tone: 'danger' } }] });
  assert.match(html, /aria-label="Alerts 12"/);
  assert.doesNotMatch(html, /aria-label="[^"]*danger/);
});

test('a badge counted in the name is escaped there as well', () => {
  const html = sidebarNav({ items: [{ id: 'p', label: 'Quota', badge: '<9' }] });
  assert.match(html, /aria-label="Quota &lt;9"/);
});

test('an unbadged item is named by its label alone, with no trailing space', () => {
  const html = sidebarNav({ items: [{ id: 'a', label: 'Overview', badge: '' }] });
  assert.match(html, /aria-label="Overview"/);
});

test('the collapsed tooltip carries the count too — the badge is hidden there', () => {
  const html = sidebarNav({ items: [{ id: 'p', label: 'Pending', badge: 3 }], collapsed: true });
  assert.match(html, /title="Pending 3"/);
});

// ---- 2. a rail label keeps its colour under a consumer's a:link ----------
//
// Resolved, not grepped — the same technique stories/nav-cascade.test.js uses
// and for the same reason: a colour declaration that is present in the file can
// still be dead. base.css + nav.css are loaded with their var() references
// substituted from the token files, mounted in a JSDOM, and read back with
// getComputedStyle, which ranks author rules by specificity and source order.
// The kit is a published package, so the consumer sheet below — an `a:link`
// rule at (0,1,1), the commonest thing a host stylesheet says about links — is
// appended AFTER the kit's, exactly where a consumer's own CSS would land.

const RULE = /([^{}]+)\{([^{}]*)\}/g;
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

function tokensFor(theme = 'dark') {
  const wanted = [':root', `:root[data-theme="${theme}"]`];
  const vars = new Map();
  for (const file of ['src/tokens/brand.generated.css', 'src/tokens/tokens.css', 'src/tokens/accents.css']) {
    for (const [, selector, body] of decomment(read(file)).matchAll(RULE)) {
      if (!selector.split(',').map((s) => s.trim()).some((s) => wanted.includes(s))) continue;
      for (const decl of body.split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        const name = decl.slice(0, i).trim();
        if (name.startsWith('--')) vars.set(name, decl.slice(i + 1).trim());
      }
    }
  }
  return vars;
}

function substitute(css, vars) {
  let out = css;
  for (let pass = 0; pass < 12 && out.includes('var('); pass++) {
    out = out.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (m, name, fallback) =>
      vars.has(name) ? vars.get(name) : (fallback != null ? fallback.trim() : m));
  }
  return out;
}

// JSDOM hands colours back as rgb(); the token files write them as hex.
const colour = (v) => {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(v).trim());
  if (!hex) return String(v).trim();
  const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
};

// State pseudo-classes → attribute selectors of identical (0,1,0) weight.
const STATES = ['hover', 'focus-visible', 'focus', 'active'];
const desugar = (css) => STATES.reduce((acc, s) => acc.split(`:${s}`).join(`[data-ui-state~="${s}"]`), css);

const CONSUMER_LINK = 'rgb(1, 2, 3)';

const RAIL = sidebarNav({
  ariaLabel: 'Account',
  sections: [{
    label: 'Account',
    items: [
      { id: 'overview', icon: 'chart', label: 'Overview' },
      { id: 'prefs', icon: 'gear', label: 'Preferences' },
    ],
  }],
  active: 'prefs',
  footer: '<a class="ui-nav__item is-danger" href="#logout"><span class="ui-nav__label">Sign out</span></a>',
});

/** Mount the rail under a consumer stylesheet and hand back a resolver. */
function railUnderConsumerCss(theme = 'dark') {
  const vars = tokensFor(theme);
  const kit = desugar(substitute(decomment(read('src/styles/base.css') + '\n' + read('src/styles/nav.css')), vars));
  const consumer = `a:link { color: ${CONSUMER_LINK}; }`;
  const w = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${kit}</style>`
    + `<style>${consumer}</style></head>`
    + `<body>${RAIL}<a class="plain-link" href="#x">plain</a></body></html>`,
    { pretendToBeVisual: true },
  ).window;
  const q = (sel) => {
    const el = w.document.querySelector(sel);
    assert.ok(el, `the rail has no ${sel} — the fixture stopped exercising the rule under test`);
    return el;
  };
  return {
    vars,
    css: (sel, prop) => w.getComputedStyle(q(sel))[prop],
    inState: (sel, state, prop) => {
      const el = q(sel);
      el.setAttribute('data-ui-state', state);
      const value = w.getComputedStyle(el)[prop];
      el.removeAttribute('data-ui-state');
      return value;
    },
  };
}

test("the consumer sheet in this fixture is live — otherwise the gate below proves nothing", () => {
  const r = railUnderConsumerCss();
  assert.equal(
    r.css('.plain-link', 'color'), CONSUMER_LINK,
    'a bare anchor does not take the consumer\'s a:link colour, so the fixture is not '
    + 'modelling a consumer stylesheet at all and the rail gate is checking nothing',
  );
});

for (const theme of ['dark', 'light']) {
  test(`a resting rail label keeps the kit's --text under a consumer's a:link — ${theme}`, () => {
    const r = railUnderConsumerCss(theme);
    const text = colour(r.vars.get('--text'));
    assert.equal(
      r.css('.ui-nav__item:not(.is-active):not(.is-danger)', 'color'), text,
      `a non-active rail label resolves to ${r.css('.ui-nav__item:not(.is-active):not(.is-danger)', 'color')} `
      + `instead of --text (${text}) in the ${theme} theme. The kit is published: a host `
      + 'stylesheet\'s a:link is (0,1,1) and .ui-nav__item is (0,1,0), so the host wins and '
      + 'every resting rail label takes the host\'s link colour. Raise the kit declaration\'s '
      + 'specificity — do not change the colour value.',
    );
  });
}

test('raising the resting colour does not flatten the states written after it', () => {
  const r = railUnderConsumerCss();
  const strong = colour(r.vars.get('--strong'));
  const muted = colour(r.vars.get('--muted'));
  const pink = colour(r.vars.get('--pink'));
  assert.equal(r.css('.ui-nav__item.is-active', 'color'), strong, 'the current row lost its --strong ink');
  assert.equal(
    r.inState('.ui-nav__item:not(.is-active):not(.is-danger)', 'hover', 'color'), strong,
    'a hovered row lost its --strong ink — the raised resting rule now outranks :hover',
  );
  assert.equal(r.css('.ui-nav__item.is-danger', 'color'), muted, 'the destructive row lost its quiet resting ink');
  assert.equal(
    r.inState('.ui-nav__item.is-danger', 'hover', 'color'), pink,
    'the destructive row lost --pink on hover',
  );
});

test('a nested row keeps the tighter metrics written for it after the item block', () => {
  const rail = sidebarNav({
    items: [{ icon: 'card', label: 'Payouts', open: true, items: [{ id: 'p', label: 'Pending' }] }],
  });
  const vars = tokensFor('dark');
  const kit = desugar(substitute(decomment(read('src/styles/base.css') + '\n' + read('src/styles/nav.css')), vars));
  const w = new JSDOM(
    `<!doctype html><html lang="en" data-theme="dark"><head><style>${kit}</style></head><body>${rail}</body></html>`,
    { pretendToBeVisual: true },
  ).window;
  const sub = w.getComputedStyle(w.document.querySelector('.ui-nav__item--sub'));
  assert.equal(
    sub.fontSize, '14px',
    'a nested row is back to the full-size 14.5px — .ui-nav__item--sub is (0,1,0) and sits '
    + 'AFTER the item block, so raising that whole block\'s specificity silently outranks it. '
    + 'Raise the colour declaration alone.',
  );
  assert.equal(sub.paddingTop, '7px', 'a nested row lost its tighter padding for the same reason');
});

// ---- 3. appShell() — the kit's one page shell ----------------------------

const { appShell, accountShell, ACCOUNT_NAV } = await import('../../src/components/shell.js');
const { accountMenu } = await import('../../src/components/topbar.js');

test('the shell emits exactly one main landmark', () => {
  const html = appShell({ title: 'T', body: '<p>x</p>' });
  assert.equal(
    (html.match(/<main\b/g) || []).length, 1,
    'the shell must have exactly one answer to "where does the page content start"',
  );
});

test('the shell renders the trail the caller passed, and adds no product word of its own', () => {
  const html = appShell({
    crumbs: [{ label: 'Account', href: '#' }, { label: 'Access & agents' }],
    title: 'Access & agents',
  });
  assert.match(html, /aria-label="Breadcrumb"/);
  assert.match(html, /aria-current="page"[^>]*>(?:(?!<\/nav>).)*Access &amp; agents/s);
  assert.doesNotMatch(
    html, /apliteni-ui\s*\/\s*<b>/,
    'the shell is writing its own crumb trail again — the caller owns the trail',
  );
});

test('the trail is the caller\'s alone — no crumbs, no breadcrumb landmark', () => {
  assert.doesNotMatch(appShell({ title: 'T' }), /aria-label="Breadcrumb"/);
});

test('the shell names its navigation landmark', () => {
  assert.match(appShell({ navLabel: 'Finance' }), /<nav[^>]+aria-label="Finance"/);
});

test('the shell marks the current nav entry', () => {
  const html = appShell({ nav: ACCOUNT_NAV, active: 'access' });
  assert.match(html, /class="ui-nav__item is-active"[^>]*href="#access"/);
});

// The kit's default is what a consuming /account page gets when it passes no
// nav at all, so an entry here is a live link on somebody else's site. The
// published default has always been these two; Overview has no page behind it.
test('ACCOUNT_NAV is the two entries the published default has always had', () => {
  assert.deepEqual(
    ACCOUNT_NAV.map((i) => i.id), ['prefs', 'access'],
    'a third default entry puts a link with nothing behind it on every consuming /account page',
  );
});

test('the one nav definition spells the ampersand for esc(), not for raw HTML', () => {
  const access = ACCOUNT_NAV.find((i) => i.id === 'access');
  assert.equal(
    access.label, 'Access & agents',
    'nav.js runs every label through esc(), so a pre-escaped &amp; here double-escapes',
  );
  assert.equal(access.icon, 'key', 'key means credentials; plug means integration');
});

// #127's DoD: the account navigation has ONE definition. It is drawn twice —
// the rail and the topbar's account menu — and those two used to be separate
// literals that agreed about the icon by hand and disagreed about the encoding.
// Rendering both and comparing the result proves nothing: two copies of the
// same two entries look identical. What proves derivation is changing the one
// definition and watching both surfaces follow.
test('the rail and the topbar menu are drawn from the same account-nav definition', () => {
  const probe = { id: 'probe-127', icon: 'gear', label: 'Probe & drift' };
  ACCOUNT_NAV.push(probe);
  try {
    assert.match(
      accountMenu({}), /href="#probe-127"/,
      'accountMenu() restates the account entries as a literal of its own, so the two lists '
      + 'agree only for as long as somebody keeps editing both',
    );
    assert.match(appShell({}), /href="#probe-127"/, 'the rail stopped defaulting to the one definition');
  } finally {
    const at = ACCOUNT_NAV.indexOf(probe);
    if (at >= 0) ACCOUNT_NAV.splice(at, 1);
  }
  assert.deepEqual(ACCOUNT_NAV.map((i) => i.id), ['prefs', 'access'], 'the probe outlived its test');
});

// accountMenu() interpolates its tuples raw, so the shared definition has to
// arrive there escaped — and escaped exactly once.
test('the menu\'s own fallback names what ACCOUNT_NAV names, spelled the same way', () => {
  const doc = dom(accountMenu({}));
  const items = [...doc.querySelectorAll('.amenu a[role="menuitem"]')].filter((a) => !a.classList.contains('aout'));
  assert.deepEqual(
    items.map((a) => [a.getAttribute('href'), a.textContent.trim()]),
    ACCOUNT_NAV.map((i) => [`#${i.id}`, i.label]),
    'the account menu and the rail disagree about what the account entries are called',
  );
  assert.doesNotMatch(accountMenu({}), /&amp;amp;/, 'a label escaped twice reads as "Access &amp; agents" on screen');
});

test('the published ACCOUNT_NAV name still comes out of the package entry point', async () => {
  const pkg = await import('../../src/index.js');
  assert.equal(pkg.ACCOUNT_NAV, ACCOUNT_NAV, 'docs/library.md documents this name — moving it must not unpublish it');
});

test('the shell is built from the kit\'s own nav, not a hand-written rail', () => {
  const html = appShell({ nav: ACCOUNT_NAV, active: 'prefs' });
  assert.match(html, /class="ui-nav ui-nav--side"/);
  assert.doesNotMatch(html, /class="ui-side"/);
});

test('the shell has no topbar unless the caller asks for one', () => {
  assert.doesNotMatch(appShell({ title: 'T' }), /<header class="topbar"/);
  assert.match(appShell({ title: 'T', topbar: { word: 'Finance' } }), /<header class="topbar"/);
});

test('a signed-in reader is named in the rail, and the demo address is the only one', () => {
  const html = appShell({ account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' } });
  assert.match(html, /Ada Lovelace/);
  assert.match(html, /ada@apliteni\.com/);
  assert.doesNotMatch(appShell({}), /@/, 'an unknown reader must not be given a placeholder identity');
});

// Parsed, not grepped: whether a node is *inside* the <nav> is a tree question,
// and a regex over the string cannot answer it.
const dom = (html) => new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`).window.document;

test('the signed-in reader sits beside the navigation landmark, not inside it', () => {
  const doc = dom(appShell({ account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' } }));
  assert.ok(doc.querySelector('.ui-app__rail > .ui-app__user'), 'the reader block left the rail');
  assert.equal(
    doc.querySelector('nav .ui-app__user'), null,
    'the reader\'s name and address are inside the <nav>, so a screen reader walking the '
    + 'navigation landmark announces the email as a navigation item',
  );
});

// <aside> is the `complementary` landmark: content related to the page but
// separable from it. The rail is the page's primary navigation and the reader
// who is signed in — the opposite of separable — and the <nav> inside it is
// already the landmark that names it. A second landmark around it only gives a
// screen reader's landmark list an entry that says "complementary" about the
// menu.
test('the rail is not wrapped in a complementary landmark', () => {
  const rail = dom(appShell({ navLabel: 'Finance' })).querySelector('.ui-app__rail');
  assert.ok(rail, 'the shell no longer draws a rail');
  assert.equal(
    rail.tagName, 'DIV',
    `the rail is a <${rail.tagName.toLowerCase()}>, which is the complementary landmark — the `
    + 'page\'s main navigation is not complementary to it',
  );
});

test('the shell has no sign-out link unless the caller asks for one', () => {
  assert.doesNotMatch(appShell({ title: 'T' }), /Sign out/);
  assert.doesNotMatch(appShell({ title: 'T' }), /ui-nav__foot/);
});

test('a sign-out link is a navigation action, so it goes in the nav footer', () => {
  const doc = dom(appShell({ signOutHref: '#logout' }));
  const out = doc.querySelector('nav .ui-nav__foot .ui-nav__item.is-danger');
  assert.ok(out, 'the sign-out link is not the nav\'s footer row');
  assert.equal(out.getAttribute('href'), '#logout');
  assert.match(out.textContent, /Sign out/);
});

test('the sign-out href is escaped like every other caller string', () => {
  assert.match(appShell({ signOutHref: '/out?a=1&b=2' }), /href="\/out\?a=1&amp;b=2"/);
});

test('the rail head is dropped when a topbar already carries the product word', () => {
  assert.match(appShell({ word: 'Finance' }), /class="ui-app__brand"/);
  assert.doesNotMatch(
    appShell({ word: 'Finance', topbar: { word: 'Finance' } }), /class="ui-app__brand"/,
    'the product word is drawn twice — once in the topbar, once in the rail head',
  );
});

test('the rail claims no DOM id, so two shells on one page do not collide', () => {
  assert.doesNotMatch(appShell({ title: 'T' }), /id="app-rail"/);
});

// The rail head is the other id the shell emits: prism() clips through one, and
// brand.js says the prefix is what stops two marks on a page colliding.
test('two shells on one page do not share the brand mark\'s clip id', () => {
  const doc = dom(appShell({ word: 'A' }) + appShell({ word: 'B' }));
  const ids = [...doc.querySelectorAll('.ui-app__brand [id]')].map((n) => n.id);
  assert.equal(ids.length, 2, 'the rail head stopped emitting a clip id — this gate measures nothing now');
  assert.notEqual(ids[0], ids[1], 'both rail heads clip through the same DOM id');
});

// The narrow rail folds `.ui-app__brand span` out of view and prism() is
// aria-hidden, so the word is the whole accessible name and it has to be written.
test('the rail head is named independently of the word the narrow rail folds away', () => {
  assert.match(appShell({ word: 'Finance' }), /class="ui-app__brand"[^>]*aria-label="Finance"/);
});

test('a nav item reaches the topbar menu with its href and target escaped too', () => {
  const html = accountShell({
    nav: [{ id: 'x', icon: 'gear', label: 'X', href: '" onmouseover="alert(1)' }], active: 'x',
  });
  assert.doesNotMatch(
    html, /onmouseover="alert\(1\)"/,
    'accountMenu() interpolates href raw, so an unescaped tuple field breaks out of the attribute',
  );
});

// One call, two answers: railUser() escapes the reader's name and address, and
// accountMenu() interpolates the identical strings raw. A display name is not a
// trusted-HTML slot anywhere else in the shell, so the topbar path escapes what
// it hands the menu — the way it already does for a nav tuple's fields.
test('a reader\'s name and address reach the topbar menu escaped, as they reach the rail', () => {
  const html = accountShell({ account: { name: '<img src=x onerror=alert(1)>', email: '<svg onload=alert(2)>' } });
  assert.doesNotMatch(
    html, /<img src=x onerror=alert\(1\)>/,
    'the display name is live markup inside the account menu while the same string is escaped '
    + 'nine lines above it in the rail',
  );
  assert.doesNotMatch(html, /<svg onload=alert\(2\)>/, 'the address is live markup inside the account menu');
});

// The preset is the one screen that draws both avatars at once, and they were
// computed by two functions: initials() in shell.js prefers the display name,
// accountMenu()'s own `ini` only ever read the email's local part. One reader,
// two answers, on the screen this branch created to show both surfaces together
// — the same drift class #127 was filed about.
test('the rail and the topbar say the same initials about the same reader', () => {
  const doc = dom(accountShell({ account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' } }));
  const rail = doc.querySelector('.ui-app__av').textContent.trim();
  const top = doc.querySelector('.acct .avatar').textContent.trim();
  assert.equal(
    top, rail,
    `the topbar avatar reads "${top}" and the rail avatar reads "${rail}" for one reader — `
    + 'two functions computing initials off two different fields',
  );
  assert.equal(rail, 'AL', 'a display name is what a reader recognises, so it is what wins');
});

// Read off both surfaces, because "together" is the whole claim. The earlier
// version of this test asked the topbar alone and passed on the wrong reader:
// the shell dropped the absent `name` key, accountMenu() filled it with its own
// demo default, and "AL" came out of "Ada Lovelace" rather than out of the
// address the caller passed.
test('with no display name both surfaces fall back to the address, together', () => {
  const doc = dom(accountShell({ account: { email: 'ada.lovelace@apliteni.com' } }));
  assert.equal(doc.querySelector('.acct .avatar').textContent.trim(), 'AL');
  assert.equal(doc.querySelector('.ui-app__av').textContent.trim(), 'AL');
});

// ---- one reader, or none, on both surfaces -------------------------------
//
// accountMenu() carries a demo identity as its default — "Ada Lovelace" at an
// apliteni.com address — and the shell used to drop a `name` or `email` key it
// had not been given, which is exactly what lets that default through. So a
// consumer's /account page named its own reader in the rail and the kit's demo
// fixture in the topbar, on the same screen. railUser() states the rule the
// whole file is meant to keep: a shell must not invent an identity for a reader
// it does not know.
const DEMO_NAME = /Ada Lovelace/;
const DEMO_ADDRESS = /ada@apliteni\.com/;
const reader = (html) => {
  const doc = dom(html);
  const text = (sel) => (doc.querySelector(sel)?.textContent ?? '').trim();
  return {
    railAvatar: text('.ui-app__av'),
    railName: text('.ui-app__who b'),
    railAddress: text('.ui-app__who span'),
    menuAvatar: text('.acct > .avatar'),
    menuName: text('.amenu .anm'),
    menuAddress: text('.amenu .aem'),
  };
};

test('an account with only an address is that address on both surfaces, and nobody else', () => {
  const html = accountShell({ account: { email: 'bob@example.com' } });
  const r = reader(html);
  assert.equal(r.menuAddress, 'bob@example.com');
  assert.equal(r.railAddress, 'bob@example.com');
  assert.equal(r.menuName, '', `the topbar menu names the reader "${r.menuName}"`);
  assert.equal(r.menuAvatar, r.railAvatar);
  assert.doesNotMatch(html, DEMO_NAME, 'the kit\'s demo reader is drawn beside a consumer\'s own');
  assert.doesNotMatch(html, DEMO_ADDRESS, 'the kit\'s demo address is drawn beside a consumer\'s own');
});

test('an account with only a name is that name on both surfaces, and no address at all', () => {
  const html = accountShell({ account: { name: 'Bob Smith' } });
  const r = reader(html);
  assert.equal(r.menuName, 'Bob Smith');
  assert.equal(r.railName, 'Bob Smith');
  assert.equal(r.menuAddress, '', `the topbar menu gives the reader the address "${r.menuAddress}"`);
  assert.equal(r.menuAvatar, r.railAvatar);
  assert.doesNotMatch(html, DEMO_NAME);
  assert.doesNotMatch(html, DEMO_ADDRESS);
});

test('a shell handed no reader at all names nobody on either surface', () => {
  for (const html of [accountShell({ account: null }), accountShell({})]) {
    assert.doesNotMatch(html, DEMO_NAME, 'an unknown reader was given the kit\'s demo name');
    assert.doesNotMatch(html, DEMO_ADDRESS, 'an unknown reader was given the kit\'s demo address');
    assert.doesNotMatch(html, /@/, 'an unknown reader was given an address of some other kind');
    assert.equal(dom(html).querySelector('.ui-app__user'), null, 'the rail drew a reader it does not know');
  }
});

// ---- the avatar is derived before the escaping, not after -----------------
//
// The rail computes initials() off the caller's raw strings; the menu computed
// them off the copy the shell had already escaped for it. `<Ada>` and
// `&lt;Ada&gt;` do not begin with the same character, so "one reader, one pair
// of initials" held only for names spelled with none of < > & ".
test('both avatars carry the same initials for a name that has to be escaped', () => {
  const html = accountShell({ account: { name: '<Ada> Lovelace' } });
  const r = reader(html);
  assert.equal(
    r.menuAvatar, r.railAvatar,
    `the topbar avatar reads "${r.menuAvatar}" and the rail avatar reads "${r.railAvatar}" for `
    + 'one reader — the menu derives its mark from the escaped copy',
  );
  assert.equal(r.menuAvatar, '<L', 'the mark is derived from the name the caller passed, not from its entities');
});

test('nothing a reader\'s name carries reaches the menu markup unescaped', () => {
  const html = accountShell({ account: { name: '<Ada> & "Lovelace"', email: '<a href="#">&</a>' } });
  assert.doesNotMatch(html, /<Ada>/, 'the display name reaches the account menu as live markup');
  assert.doesNotMatch(html, /<a href="#">/, 'the address reaches the account menu as live markup');
  const r = reader(html);
  assert.equal(r.menuName, '<Ada> & "Lovelace"');
  assert.equal(r.menuName, r.railName, 'the two surfaces spell the same name differently');
  assert.equal(r.menuAddress, r.railAddress);
  assert.equal(r.menuAvatar, r.railAvatar);
  // A bare & is a parse error in the same string the rail escapes a few nodes
  // away — including the one the avatar is made of.
  assert.doesNotMatch(
    html, /&(?!#\d+;|#x[0-9a-fA-F]+;|[a-zA-Z][a-zA-Z0-9]*;)/,
    'the shell emits a bare & into its own markup',
  );
});

// ---- appShell({ topbar }) is a path into the same raw sinks ---------------
//
// accountShell() escaped for the menu itself, so the preset was safe and the
// public option underneath it was not: `topbar` went to productTopbar() exactly
// as the caller wrote it. The escaping belongs on the one path into the topbar,
// which is appShell()'s normaliser — the preset then passes text like anyone else.
test('a reader handed to appShell\'s own topbar is escaped like the preset\'s', () => {
  const html = appShell({ topbar: { account: { name: '<img src=x onerror=alert(1)>', email: '<svg onload=alert(2)>' } } });
  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/, 'appShell({ topbar }) draws the caller\'s display name as markup');
  assert.doesNotMatch(html, /<svg onload=alert\(2\)>/, 'appShell({ topbar }) draws the caller\'s address as markup');
});

test('the product word handed to appShell\'s own topbar is escaped like the preset\'s', () => {
  assert.doesNotMatch(
    appShell({ topbar: { word: '<img src=x onerror=alert(4)>' } }), /<img src=x onerror=alert\(4\)>/,
    'brand() interpolates `word` raw, and appShell forwards the topbar options verbatim',
  );
});

// Both nav shapes, because the topbar's normaliser is the same shape-either-way
// pass the rail runs: accountShell() has always taken tuples and appShell()'s
// own nav takes item objects, and accountMenu() reads neither of them safely.
test('a menu entry handed to appShell\'s own topbar is escaped like the preset\'s', () => {
  const shapes = {
    tuple: [['x', 'gear', 'X', '" onmouseover="alert(5)']],
    object: [{ id: 'x', icon: 'gear', label: 'X', href: '" onmouseover="alert(5)' }],
  };
  for (const [shape, nav] of Object.entries(shapes)) {
    let html;
    assert.doesNotThrow(
      () => { html = appShell({ topbar: { account: { name: 'Bob', nav } } }); },
      `appShell({ topbar }) threw on a ${shape} nav — accountMenu() destructures every entry as a tuple`,
    );
    assert.doesNotMatch(
      html, /onmouseover="alert\(5\)"/,
      `a ${shape} entry's href reaches accountMenu(), which interpolates it raw`,
    );
  }
});

test('the product word reaches the topbar lockup escaped too', () => {
  assert.doesNotMatch(
    accountShell({ word: '<img src=x onerror=alert(3)>' }), /<img src=x onerror=alert\(3\)>/,
    'brand() interpolates `word` raw, so the topbar draws whatever the caller\'s word says',
  );
});

// Escaping on the way to a raw sink is one step, not two: the rail escapes for
// itself, so a string escaped before appShell() sees it comes out as entities.
test('escaping for the menu does not double-escape the rail', () => {
  const doc = dom(accountShell({ account: { name: 'A & B', email: 'a&b@apliteni.test' } }));
  assert.equal(doc.querySelector('.ui-app__who b').textContent, 'A & B');
  assert.equal(doc.querySelector('.ui-app__who span').textContent, 'a&b@apliteni.test');
  assert.equal(doc.querySelector('.amenu .anm').textContent, 'A & B');
  assert.equal(doc.querySelector('.amenu .aem').textContent, 'a&b@apliteni.test');
});

// Default parameters cover `undefined` only. An /auth/me that answers `account:
// null`, or a numeric display name, rendered fine before the shells were merged.
// `maxWidth` is interpolated into a style attribute, and a style attribute is a
// declaration list. esc() stops a quote closing the attribute; it does nothing
// about `;`, which opens the next declaration. A per-screen setting — the kind
// that arrives from tenant config, as FinanceReport.stories.js passes one — was
// therefore a way to write arbitrary CSS onto the host page.
test('a maxWidth carrying a second declaration cannot reach the style attribute', () => {
  const html = appShell({ maxWidth: '860px; position: fixed; inset: 0; z-index: 99999' });
  assert.doesNotMatch(
    html, /position:\s*fixed/,
    'the caller\'s `;` opened a second declaration — the reading column is now a '
    + 'full-viewport overlay over whatever page the shell was mounted in',
  );
  assert.match(html, /style="--ui-app-main: 860px"/, 'the fallback is not the documented default');
});

// Scoped to the style attribute on purpose: the rail head's brand mark clips
// through a `url(#…)` of its own, so a match anywhere in the document proves
// nothing about what the caller was allowed to write.
test('a url() in maxWidth cannot reach the style attribute either', () => {
  const html = appShell({ maxWidth: 'none; background: url(https://example.test/a.png)' });
  const style = /<main[^>]*style="([^"]*)"/.exec(html);
  assert.ok(style, 'the reading column stopped carrying its width as a style attribute');
  assert.doesNotMatch(
    style[1], /url\(/,
    'a rejected value still reached the sheet, so the shell makes an outbound request '
    + 'for whoever wrote the config',
  );
});

test('a plain CSS length is what the caller asked for', () => {
  for (const w of ['960px', '72rem', '80ch', '100%', '90vw', '48em', 'none']) {
    assert.match(appShell({ maxWidth: w }), new RegExp(`style="--ui-app-main: ${w.replace('%', '%')}"`), `${w} was rejected`);
  }
});

test('a value that is not a length falls back to the default rather than throwing', () => {
  for (const w of ['', 'wide', 'calc(100% - 40px)', '860', '860 px', null, undefined, 42]) {
    const html = appShell({ maxWidth: w });
    assert.match(
      html, /style="--ui-app-main: 860px"/,
      `${JSON.stringify(w)} left the column without the documented default. An empty or `
      + 'unparseable value makes the declaration invalid at computed-value time, and the '
      + 'column falls to max-width: none — the full track, not 860px',
    );
  }
});

// The `860px` in `max-width: var(--ui-app-main, 860px)` can never fire while
// shell.js always writes the property. It is the floor for hand-written markup,
// so the two have to say the same number or the floor is a different shell.
test('the CSS fallback and the shell\'s default are the same width', () => {
  const css = read('src/styles/layout.css');
  const m = /--ui-app-main,\s*([^)]+)\)/.exec(css);
  assert.ok(m, 'layout.css no longer reads --ui-app-main with a fallback');
  const shell = /style="--ui-app-main: ([^"]+)"/.exec(appShell({}));
  assert.equal(m[1].trim(), shell[1], 'the stylesheet floor and the shell default drifted apart');
});

test('an absent or oddly-typed reader degrades instead of throwing', () => {
  assert.doesNotThrow(() => appShell({ account: null }));
  assert.doesNotThrow(() => accountShell({ account: null }));
  assert.match(appShell({ account: { name: 42 } }), /<b>42<\/b>/);
  // A default parameter covers `undefined`; an /auth/me that answers `email:
  // null` reaches accountMenu()'s `email.split('@')` and takes the page down.
  for (const account of [{ email: null }, { name: null }, { email: 42, name: 42 }]) {
    assert.doesNotThrow(
      () => accountShell({ account }), `accountShell threw on account: ${JSON.stringify(account)}`,
    );
  }
});

// Same reasoning as `account: null` and an unparseable `maxWidth`: a default
// parameter covers `undefined` and nothing else, and a shell that throws
// mid-render takes the page with it. An /auth/me that answers `nav: null`, or a
// config that hands over an object where a list was meant, gets the default nav.
test('a missing or mistyped nav falls back to the default rather than throwing', () => {
  for (const bad of [null, undefined, 'prefs', 42, {}, { items: [] }]) {
    let html;
    assert.doesNotThrow(() => { html = appShell({ nav: bad }); }, `appShell threw on nav: ${JSON.stringify(bad)}`);
    assert.match(
      html, /href="#prefs"/,
      `appShell({ nav: ${JSON.stringify(bad)} }) drew a rail with no entries in it`,
    );
    assert.doesNotThrow(() => accountShell({ nav: bad }), `accountShell threw on nav: ${JSON.stringify(bad)}`);
  }
});

// An empty list is a caller saying "no entries", which is a different sentence
// from "I did not pass one" — the shell must not put links back.
test('an empty nav is a caller\'s answer, not a mistake to correct', () => {
  assert.doesNotMatch(appShell({ nav: [] }), /href="#prefs"/, 'an explicitly empty rail was refilled with the default');
});

// A list the caller passed stays the caller's list, holes and all — dropping
// what cannot be drawn is not the same as deciding they meant the default.
test('a hole inside nav is dropped, and the rest of the caller\'s list still draws', () => {
  let html;
  assert.doesNotThrow(
    () => { html = appShell({ nav: [null, { id: 'alpha', icon: 'gear', label: 'Alpha' }, 'prefs', 42] }); },
    'a null inside the nav list reaches sideItem(), which reads `it.items` off it',
  );
  assert.match(html, /href="#alpha"/, 'the drawable entry went with the holes');
  assert.doesNotMatch(html, /href="#prefs"/, 'a list with a hole in it was replaced by the default');
  assert.doesNotMatch(html, /undefined/, 'an undrawable entry was drawn as an unnamed row');
});

// ---- crumbs: the one option whose shape changed in this release ----------
//
// The old API was `crumb: 'Payouts'`, a string; the new one is
// `crumbs: [{ label }]`. One letter apart, so a consumer following the
// migration note writes `crumbs: 'Payouts'` — and got a blank page rather than
// a missing trail, because `.length` and `.map` were read off it unguarded.
// Same reasoning as `nav`, `account` and `maxWidth`: a shell that throws
// mid-render takes the page with it.

test('a crumbs value that is not a list draws no trail rather than throwing', () => {
  for (const bad of [null, 'Account / Payouts', 42, {}, { label: 'Payouts' }]) {
    let html;
    assert.doesNotThrow(
      () => { html = appShell({ crumbs: bad, title: 'Payouts' }); },
      `appShell threw on crumbs: ${JSON.stringify(bad)}`,
    );
    assert.doesNotMatch(
      html, /aria-label="Breadcrumb"/,
      `crumbs: ${JSON.stringify(bad)} produced a trail out of a value that is not one`,
    );
    assert.match(html, /<main\b/, 'the page stopped rendering at all');
  }
});

// Reading a bare string as a one-crumb trail would hide the migration mistake:
// the page would look right and the caller would never learn that `crumb` is
// now `crumbs`. No trail is the honest outcome.
test('a bare string is not quietly reinterpreted as a one-crumb trail', () => {
  const html = appShell({ crumbs: 'Payouts', title: 'Payouts' });
  assert.doesNotMatch(html, /ui-nav--crumbs/, 'the string was promoted to a trail of its own');
});

test('a hole inside the crumb trail is dropped, and the rest of it still draws', () => {
  let html;
  assert.doesNotThrow(
    () => { html = appShell({ crumbs: [null, { label: 'Account', href: '#' }, 'Payouts', {}, { label: 'Access & agents' }] }); },
    'a null inside the trail reaches breadcrumbs(), which reads `it.icon` off it',
  );
  assert.match(html, /aria-label="Breadcrumb"/, 'the whole trail went with the holes');
  assert.match(html, /Account/);
  assert.match(html, /aria-current="page"[^>]*>(?:(?!<\/nav>).)*Access &amp; agents/s);
  assert.doesNotMatch(html, /undefined/, 'an undrawable crumb was drawn as an unnamed one');
});

test('a trail with nothing drawable in it is no trail at all', () => {
  for (const bad of [[], [null], [{}], [{ label: '' }, undefined]]) {
    assert.doesNotMatch(
      appShell({ crumbs: bad, title: 'T' }), /aria-label="Breadcrumb"/,
      `crumbs: ${JSON.stringify(bad)} left an empty breadcrumb landmark on the page`,
    );
  }
});

test('accountShell hardens the crumb trail the same way', () => {
  assert.doesNotThrow(() => accountShell({ cap: null, crumb: null, title: null }));
  assert.doesNotThrow(() => accountShell({ nav: [null], cap: 'Account', crumb: 'Payouts' }));
});

test('the shell escapes the caller\'s brand word', () => {
  assert.match(appShell({ word: 'A & B' }), /A &amp; B/);
});

test('accountShell still accepts what it accepted before', () => {
  const html = accountShell({
    word: 'Finance', cap: 'Finance', crumb: 'Payouts', title: 'Payouts',
    nav: [['payouts', 'card', 'Payouts', '#', '_top']], active: 'payouts',
  });
  assert.match(html, /<main\b/);
  assert.match(html, /Payouts/);
});

test('accountShell keeps the topbar, so wireTopbar() still has something to wire', () => {
  const html = accountShell({ word: 'Strategy', showSwitch: true, versions: [{ label: 'v2', badge: 'live' }] });
  assert.match(html, /data-theme-toggle/, 'the theme toggle went missing from every consuming /account page');
  assert.match(html, /data-dropdown-trigger/, 'the account menu went missing');
  assert.match(html, /class="vsw"/, 'the version switcher went missing');
});

test('accountShell renders the old tuple nav as real rail entries', () => {
  const html = accountShell({
    nav: [['payouts', 'card', 'Payouts', 'https://example.test/payouts', '_top']], active: 'payouts',
  });
  assert.match(html, /href="https:\/\/example\.test\/payouts"/);
  assert.match(html, /target="_top"/);
  assert.match(html, /aria-current="page"/);
});

test('accountShell also accepts the new object nav — ACCOUNT_NAV is its own default', () => {
  const html = accountShell({ nav: ACCOUNT_NAV, active: 'access' });
  assert.match(html, /Access &amp; agents/);
  assert.doesNotMatch(html, /&amp;amp;/, 'a label escaped twice reads as "Access &amp; agents" on screen');
});

test('accountShell turns cap + crumb into the trail the caller used to get for free', () => {
  const html = accountShell({ cap: 'Finance', crumb: 'Payouts', title: 'Payouts' });
  assert.match(html, /aria-label="Breadcrumb"/);
  assert.match(html, /Finance/);
  assert.match(html, /aria-current="page"[^>]*>(?:(?!<\/nav>).)*Payouts/s);
});

test('accountShell emits one main landmark, not zero and not two', () => {
  const html = accountShell({ title: 'Preferences', body: '<p>x</p>' });
  assert.equal((html.match(/<main\b/g) || []).length, 1);
});

// The shell's rail head is a link too, so it meets a host's `a:link` the same
// way a nav row does. Resolved against the shipped sheets, not read off them.
test('the shell\'s own anchors keep the kit\'s ink under a consumer\'s a:link', () => {
  const vars = tokensFor('dark');
  const kit = desugar(substitute(decomment(
    read('src/styles/base.css') + '\n' + read('src/styles/nav.css') + '\n' + read('src/styles/layout.css'),
  ), vars));
  const w = new JSDOM(
    `<!doctype html><html lang="en" data-theme="dark"><head><style>${kit}</style>`
    + `<style>a:link { color: ${CONSUMER_LINK}; }</style></head>`
    + `<body>${appShell({ word: 'apliteni-ui', nav: ACCOUNT_NAV, active: 'prefs' })}</body></html>`,
    { pretendToBeVisual: true },
  ).window;
  const at = (sel) => w.getComputedStyle(w.document.querySelector(sel)).color;
  assert.equal(
    at('.ui-app__brand'), colour(vars.get('--strong')),
    'the rail head takes the host\'s link colour — .ui-app__brand is (0,1,0) against a:link at (0,1,1)',
  );
  assert.equal(
    at('.ui-nav__item:not(.is-active)'), colour(vars.get('--text')),
    'a rail row inside the shell takes the host\'s link colour',
  );
});
