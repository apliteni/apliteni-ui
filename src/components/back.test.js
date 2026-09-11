import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backLink } from './back.js';
import { appShell } from './shell.js';
import { sidebarNav } from './nav.js';

const anchor = (html) => {
  const m = /^<a class="ui-back" href="([^"]*)"((?: aria-label="[^"]*")?)>(<svg[\s\S]*?<\/svg>)<span class="ui-back__label">([^<]*)<\/span><\/a>$/.exec(html);
  assert.ok(m, `not the shape backLink() emits: ${html}`);
  return { href: m[1], name: /aria-label="([^"]*)"/.exec(m[2])?.[1] ?? null, svg: m[3], text: m[4] };
};

// ---- the link ----------------------------------------------------------------

test('a back link is an anchor to the address it is given, showing the destination', () => {
  const a = anchor(backLink({ href: '/invoices?status=open&page=3', label: 'Invoices' }));
  assert.equal(a.href, '/invoices?status=open&amp;page=3');
  assert.equal(a.text, 'Invoices');
});

test('its name says where it goes in words, because the arrow is aria-hidden', () => {
  const a = anchor(backLink({ href: '/invoices', label: 'Invoices' }));
  assert.match(a.svg, /aria-hidden="true"/);
  assert.equal(a.name, 'Back to Invoices');
});

test('the accessible name contains the visible text, as WCAG 2.5.3 asks', () => {
  for (const label of ['Invoices', 'Payouts', 'Access & agents']) {
    const a = anchor(backLink({ href: '/x', label }));
    assert.ok(a.name.includes(a.text), `"${a.name}" does not contain "${a.text}"`);
  }
});

test('no label, or the word Back, shows Back and names it nothing more', () => {
  for (const label of [undefined, '', '   ', 'Back', 'back', null, {}]) {
    const a = anchor(backLink({ href: '/x', label }));
    assert.equal(a.text, 'Back', `label ${JSON.stringify(label)}`);
    assert.equal(a.name, null, `label ${JSON.stringify(label)} should not become "Back to Back"`);
  }
});

test('with nowhere to go, it renders nothing', () => {
  for (const href of [undefined, null, '', '   ', {}, []]) {
    assert.equal(backLink({ href, label: 'Invoices' }), '', `href ${JSON.stringify(href)}`);
  }
  assert.equal(backLink(), '');
});

test('a script is not a destination, however it is spelt', () => {
  for (const href of [
    'javascript:history.back()', 'JavaScript:history.go(-1)', '  javascript:void 0',
    '\tjavascript:history.back()', '\u0001javascript:history.back()',
  ]) {
    assert.equal(backLink({ href, label: 'Invoices' }), '', `href ${JSON.stringify(href)}`);
  }
});

test('nothing in the markup walks the history', () => {
  const html = backLink({ href: '/invoices', label: 'Invoices' });
  assert.doesNotMatch(html, /onclick|history/i);
});

test('a caller string cannot break out of the attribute it is written into', () => {
  const html = backLink({ href: '/x" onmouseover="alert(1)', label: '"><img src=x onerror=alert(1)>' });
  assert.doesNotMatch(html, /<img|" onmouseover=/);
  const a = anchor(html);
  assert.equal(a.text, '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
});

// ---- where it sits: the page shell -------------------------------------------

const NAV = [
  { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: '/' },
  { id: 'invoices', icon: 'doc', label: 'Invoices', href: '/invoices' },
];
const crumbs = [{ label: 'Finance', href: '/' }, { label: 'Invoices', href: '/invoices' }, { label: 'INV-1001' }];
const main = (html) => /<main[^>]*>([\s\S]*)<\/main>/.exec(html)[1];
const currentOf = (html) => /<a [^>]*aria-current="([^"]+)"[^>]*aria-label="([^"]+)"/.exec(html)?.slice(1);

test('appShell() draws the back link in the trail\'s place, above the title, and not the trail', () => {
  const html = main(appShell({
    nav: NAV, active: 'invoices', crumbs, back: { href: '/invoices', label: 'Invoices' }, title: 'INV-1001',
  }));
  assert.doesNotMatch(html, /ui-nav--crumbs/, 'a page with a back link drew a trail as well');
  const at = html.indexOf('class="ui-back"');
  assert.ok(at >= 0, 'no back link in <main>');
  assert.ok(at < html.indexOf('<h1>'), 'the back link is not above the title');
});

test('with a back link, the rail marks its row as the section, not as the page', () => {
  const html = appShell({ nav: NAV, active: 'invoices', back: { href: '/invoices', label: 'Invoices' }, title: 'INV-1001' });
  assert.deepEqual(currentOf(html), ['true', 'Invoices']);
});

test('without one, the active row is still the page', () => {
  assert.deepEqual(currentOf(appShell({ nav: NAV, active: 'invoices', crumbs, title: 'Invoices' })), ['page', 'Invoices']);
  assert.deepEqual(currentOf(sidebarNav({ items: NAV, active: 'invoices' })), ['page', 'Invoices']);
});

test('a back the shell cannot draw leaves the trail standing', () => {
  for (const back of [{ label: 'Invoices' }, { href: 'javascript:history.back()', label: 'Invoices' }, 'Invoices', ['/invoices']]) {
    const html = appShell({ nav: NAV, active: 'invoices', crumbs, back, title: 'INV-1001' });
    assert.match(main(html), /ui-nav--crumbs/, `back ${JSON.stringify(back)} took the trail away`);
    assert.doesNotMatch(main(html), /ui-back/);
    assert.deepEqual(currentOf(html), ['page', 'Invoices']);
  }
});

test('sidebarNav() marks a section in a group the same way', () => {
  const html = sidebarNav({
    items: [{ id: 'money', label: 'Money', items: [{ id: 'invoices', label: 'Invoices', href: '/invoices' }] }],
    active: 'invoices',
    activeIs: 'section',
  });
  assert.deepEqual(currentOf(html), ['true', 'Invoices']);
});
