import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import * as ui from '../index.js';

const probe = `x" data-injected="yes"><img data-probe="yes">&'`;
const parse = html => JSDOM.fragment(html);
const cases = [
  ['button', () => ui.button({ label: probe, href: probe, variant: probe, size: probe })],
  ['button type', () => ui.button({ type: probe })],
  ['badge', () => ui.badge(probe, probe)],
  ['pill', () => ui.pill(probe, probe)],
  ['statusDot', () => ui.statusDot(probe)],
  ['card', () => ui.card({ variant: probe, pad: probe })],
  ['segmented', () => ui.segmented({ name: probe, size: probe, ariaLabel: probe, options: [{ label: probe, value: probe }] })],
  ['accentPicker', () => ui.accentPicker({ options: [probe] })],
  ['field', () => ui.field({ id: probe, label: probe, hint: probe, control: ui.input() })],
  ['input', () => ui.input({ name: probe, id: probe, type: probe, value: probe, placeholder: probe, ariaLabel: probe })],
  ['textarea', () => ui.textarea({ name: probe, rows: probe, value: probe, placeholder: probe, id: probe, ariaLabel: probe })],
  ['select', () => ui.select({ name: probe, id: probe, ariaLabel: probe, options: [probe] })],
  ['checkbox', () => ui.checkbox({ name: probe, type: probe, label: 'Trusted label' })],
  ['switchToggle', () => ui.switchToggle({ name: probe, label: probe })],
  ['callout', () => ui.callout({ variant: probe, body: 'Trusted body' })],
  ['toast', () => ui.toast({ variant: probe, style: probe, title: probe, body: probe, action: probe })],
  ['successPanel', () => ui.successPanel({ title: probe, sub: probe })],
  ['emptyState', () => ui.emptyState({ title: probe, sub: probe })],
  ['hlShell', () => ui.hlShell(probe)],
  ['snippet', () => ui.snippet({ label: probe, copyLabel: probe })],
  ['tabs', () => ui.tabs({ name: probe, ariaLabel: probe, className: probe, items: [{ label: 'Trusted label', panel: '' }] })],
  ['drawer', () => ui.drawer({ side: probe, size: probe, title: probe, id: probe, closeLabel: probe })],
  ['drawerSection', () => ui.drawerSection({ title: probe, rows: [[probe, probe]] })],
  ['confirm', () => ui.confirm({ title: probe, body: probe, id: probe, variant: probe, confirmLabel: probe, cancelLabel: probe })],
  ['tooltip', () => ui.tooltip({ id: probe, label: probe, value: probe, detail: probe })],
  ['dropdown', () => ui.dropdown({ label: probe, id: probe, triggerClass: probe, panelClass: probe, items: [{ label: probe, value: probe, href: probe }] })],
  ['sidebarNav', () => ui.sidebarNav({ ariaLabel: probe, items: [{ id: probe, label: probe, href: probe, target: probe, badge: { text: probe, tone: probe } }] })],
  ['navTabs', () => ui.navTabs({ variant: probe, ariaLabel: probe, items: [{ id: probe, label: probe, href: probe, target: probe, badge: { text: probe, tone: probe } }] })],
  ['breadcrumbs', () => ui.breadcrumbs({ id: probe, ariaLabel: probe, items: [{ label: probe, href: probe }, { label: probe }] })],
  ['nav', () => ui.nav({ items: [{ label: probe, href: probe }] })],
  ['backLink', () => ui.backLink({ label: probe, href: probe })],
  ['footer', () => ui.footer({ variant: probe, tagline: probe, legal: probe, columns: [{ title: probe, links: [{ label: probe, href: probe, target: probe }] }], social: [{ label: probe, href: probe }], legalLinks: [{ label: probe, href: probe }] })],
  ['brand', () => ui.brand({ p: probe, word: 'Trusted word', size: probe, href: probe })],
  ['prism', () => ui.prism(probe, probe)],
  ['seedling', () => ui.seedling(probe, probe)],
  ['icon', () => ui.icon('check', probe)],
  ['illo', () => ui.illo(probe)],
  ['themeToggle', () => ui.themeToggle(probe)],
  ['deckTextSwitch', () => ui.deckTextSwitch(probe)],
  ['versionSwitcher', () => ui.versionSwitcher([{ label: ui.esc(probe), meta: ui.esc(probe) }])],
  ['accountMenu', () => ui.accountMenu({ email: ui.esc(probe), name: 'Trusted name', nav: [['id', 'check', 'Trusted label', probe, probe]] })],
  ['topbar', () => ui.topbar({ word: 'Trusted word', view: probe })],
  ['appShell', () => ui.appShell({ word: probe, brandHref: probe, account: { name: probe, email: probe } })],
  ['accountShell', () => ui.accountShell({ word: probe, account: { name: probe, email: probe } })],
  ['skeleton', () => ui.skeleton({ className: probe, width: probe, height: probe, radius: probe })],
  ['skeletonTable', () => ui.skeletonTable({ rows: probe, cols: probe })],
  ['busyRegion', () => ui.busyRegion({ className: probe, label: probe, readyLabel: probe })],
  ['deniedState', () => ui.deniedState({ className: probe, title: probe, sub: probe, need: probe })],
  ['success', () => ui.success({ layout: probe, backdrop: probe, className: probe, title: probe, body: probe, countdown: { seconds: probe, label: probe } })],
  ['successCheck', () => ui.successCheck(probe)],
  ['feedbackWidget', () => ui.feedbackWidget({ label: probe, placeholder: probe, doneTitle: probe, doneBody: probe })],
  ['pagination', () => ui.pagination({ total: 1000, label: probe, id: probe, href: () => probe })],
  ['statBand', () => ui.statBand({ id: probe, label: probe, basis: probe, stats: [{ label: probe, value: probe, delta: { value: probe } }] })],
  ['numericValue', () => ui.numericValue({ value: probe, unit: probe })],
  ['deltaValue', () => ui.deltaValue({ value: probe, basisId: probe })],
  ['rowIdentity', () => ui.rowIdentity({ name: probe, symbol: probe, logo: probe, href: probe })],
  ['filterBar', () => ui.filterBar({ label: probe, clearLabel: probe, filters: [{ id: probe, label: probe, value: probe }] })],
  ['commandPalette', () => ui.commandPalette({ label: probe, id: probe, placeholder: probe, items: [{ id: probe, label: probe, href: probe }] })],
  ['commandPaletteList', () => ui.commandPaletteList([{ label: probe, items: [{ label: probe }] }], { uid: probe, from: probe })],
];
for (const [name, render] of cases) test(`${name}: quoted input cannot add attributes or elements`, () => {
  const dom = parse(render());
  assert.equal(dom.querySelector('[data-injected], [data-probe]'), null);
});

for (const name of ['input', 'textarea', 'select', 'checkbox', 'switchToggle']) {
  test(`${name}: name round-trips as one attribute`, () => {
    assert.equal(parse(ui[name]({ name: probe })).querySelector('input,textarea,select').getAttribute('name'), probe);
  });
}
test('field preserves an already escaped control id without double encoding', () => {
  const dom = parse(ui.field({ label: 'Label', control: ui.input({ id: probe }) }));
  assert.equal(dom.querySelector('label').htmlFor, dom.querySelector('input').id);
});

const links = [
  ['button', href => ui.button({ href })], ['brand', href => ui.brand({ href })],
  ['footer', href => ui.footer({ legalLinks: [{ label: 'Link', href }] })],
  ['nav', href => ui.nav({ items: [{ label: 'Link', href }] })],
  ['navTabs', href => ui.navTabs({ items: [{ label: 'Link', href }] })],
  ['breadcrumbs', href => ui.breadcrumbs({ items: [{ label: 'Link', href }, { label: 'Here' }] })],
  ['backLink', href => ui.backLink({ label: 'Back', href })],
  ['dropdown', href => ui.dropdown({ items: [{ label: 'Link', href }] })],
  ['pagination', href => ui.pagination({ total: 1000, href: () => href })],
  ['rowIdentity', href => ui.rowIdentity({ href })],
  ['appShell', href => ui.appShell({ brandHref: href })],
  ['accountMenu', href => ui.accountMenu({ nav: [['x', 'check', 'Link', href]] })],
  ['commandPalette', href => ui.commandPalette({ items: [{ label: 'Link', href }] })],
];
for (const [name, render] of links) for (const href of ['javascript:alert(1)', ' \u0001JaVa\tScRiPt:alert(1)', 'data:text/html,hello', 'vbscript:msgbox(1)']) {
  test(`${name}: rejects ${JSON.stringify(href)}`, () => {
    for (const node of parse(render(href)).querySelectorAll('[href],[data-href]')) {
      assert.doesNotMatch(node.getAttribute('href') || node.getAttribute('data-href'), /javascript:|data:|vbscript:/i);
      assert.notEqual(node.getAttribute('href') || node.getAttribute('data-href'), href);
    }
  });
}
for (const href of ['/path?q="<>&', '#section', '../path', 'https://example.test/', 'mailto:hello@apliteni.test', 'tel:+10000000000', 'custom:open']) {
  test(`button preserves allowed URL ${href}`, () => assert.equal(parse(ui.button({ href })).querySelector('a').getAttribute('href'), href));
}
const markup = '<b data-trusted="yes">Trusted &amp; formatted</b>';
for (const [name, render] of [
  ['card', () => ui.card({ title: markup, sub: markup, body: markup })],
  ['checkbox', () => ui.checkbox({ label: markup })], ['callout', () => ui.callout({ body: markup })],
  ['snippet', () => ui.snippet({ code: markup })], ['tabs', () => ui.tabs({ items: [{ label: markup, panel: markup }] })],
  ['drawer', () => ui.drawer({ body: markup, footer: markup })],
  ['dropdown', () => ui.dropdown({ triggerContent: markup, header: markup, footer: markup, foot: markup })],
  ['emptyState', () => ui.emptyState({ actions: markup })], ['footer', () => ui.footer({ switcher: markup })],
  ['appShell', () => ui.appShell({ title: markup, sub: markup, body: markup })],
  ['statBand', () => ui.statBand({ stats: [{ trend: markup }] })],
]) test(`${name}: trusted HTML remains markup`, () => assert.ok(parse(render()).querySelector('[data-trusted]')));

for (const href of ['javascript&#58;alert(1)', 'java&#x09;script&colon;alert(1)', 'data&colon;text/html,hi', 'vbscript&#x3a;hi']) {
  test(`legacy account URL rejects encoded scheme ${href}`, () => {
    const dom = parse(ui.accountMenu({ nav: [['x', 'check', 'Link', href]] }));
    assert.equal(dom.querySelector('[role="menuitem"]').getAttribute('href'), '#');
  });
}
test('legacy account HTML entities stay encoded once in attributes', () => {
  const dom = parse(ui.accountMenu({ email: 'A &amp; B &quot;C&quot;', nav: [['x', 'check', 'A &amp; B', '/?a=1&amp;b=2']] }));
  assert.equal(dom.querySelector('[title]').getAttribute('title'), 'A & B "C"');
  assert.equal(dom.querySelector('[role="menuitem"]').getAttribute('href'), '/?a=1&b=2');
});
for (const logo of ['javascript:hello', 'data:image/svg+xml,<svg/>', 'vbscript:hello']) {
  test(`image source rejects ${logo}`, () => assert.equal(parse(ui.rowIdentity({ logo })).querySelector('img').getAttribute('src'), ''));
}

test('legacy account email quotes cannot escape its title attribute', () => {
  const email = 'hello" data-injected="yes';
  const dom = parse(ui.accountMenu({ email }));
  assert.equal(dom.querySelector('[data-injected]'), null);
  assert.equal(dom.querySelector('[title]').getAttribute('title'), email);
});
test('legacy brand word quotes cannot escape its accessible name', () => {
  const word = 'App" data-injected="yes';
  const dom = parse(ui.brand({ word }));
  assert.equal(dom.querySelector('[data-injected]'), null);
  assert.equal(dom.querySelector('a').getAttribute('aria-label'), `Apliteni ${word}`);
});
