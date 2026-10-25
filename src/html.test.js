// The string helpers the package keeps (#429): what a caller passes cannot add an
// attribute or an element, and a link never carries a script, data or vbscript URL.
// The vanilla factories that also used these were held by
// src/components/attribute-boundaries.test.js; the React components that take a URL are
// held by react/src/attribute-boundaries.test.tsx.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { esc, safeUrl, trustedUrl } from './html.js';
import { brand, prism, seedling } from './assets/brand.js';
import { icon } from './assets/icons.js';
import { illo } from './assets/illustrations.js';
import { hlShell } from './logic/code.js';

const probe = `x" data-injected="yes"><img data-probe="yes">&'`;
const parse = (html) => JSDOM.fragment(html);

for (const [name, render] of [
  ['esc', () => `<span title="${esc(probe)}">${esc(probe)}</span>`],
  ['brand', () => brand({ p: probe, word: 'Trusted word', size: probe, href: probe })],
  ['prism', () => prism(probe, probe)],
  ['seedling', () => seedling(probe, probe)],
  ['icon', () => icon('check', probe)],
  ['illo', () => illo(probe)],
  ['hlShell', () => hlShell(probe)],
]) test(`${name}: quoted input cannot add attributes or elements`, () => {
  assert.equal(parse(render()).querySelector('[data-injected], [data-probe]'), null);
});

const SCRIPTED = ['javascript:alert(1)', ' \u0001JaVa\tScRiPt:alert(1)', 'data:text/html,hello', 'vbscript:msgbox(1)'];
const ALLOWED = ['/path?q="<>&', '#section', '../path', 'https://example.test/', 'mailto:hello@apliteni.test', 'tel:+10000000000', 'custom:open'];

test('safeUrl refuses a script, data or vbscript URL however it is spelt, and keeps every other', () => {
  for (const href of SCRIPTED) assert.equal(safeUrl(href), '#', JSON.stringify(href));
  for (const href of SCRIPTED) assert.equal(safeUrl(href, ''), '', `${JSON.stringify(href)} takes the fallback given`);
  for (const href of ALLOWED) assert.equal(safeUrl(href), href, JSON.stringify(href));
});

test('trustedUrl reads an encoded scheme the way a browser decodes it', () => {
  for (const href of ['javascript&#58;alert(1)', 'java&#x09;script&colon;alert(1)', 'data&colon;text/html,hi', 'vbscript&#x3a;hi']) {
    assert.equal(trustedUrl(href), '#', href);
  }
  assert.equal(trustedUrl('/?a=1&amp;b=2'), '/?a=1&amp;b=2', 'an already encoded URL is not encoded twice');
});

test('brand refuses a scripted link, and its word cannot escape its accessible name', () => {
  for (const href of SCRIPTED) {
    const link = parse(brand({ href })).querySelector('a');
    assert.doesNotMatch(link.getAttribute('href'), /javascript:|data:|vbscript:/i, JSON.stringify(href));
  }
  const word = 'App" data-injected="yes';
  const dom = parse(brand({ word }));
  assert.equal(dom.querySelector('[data-injected]'), null);
  assert.equal(dom.querySelector('a').getAttribute('aria-label'), `Apliteni ${word}`);
});

test('the check reports a helper that writes its input raw', () => {
  assert.ok(parse(`<span title="${probe}"></span>`).querySelector('[data-injected]'));
});
