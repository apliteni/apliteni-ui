import { test } from 'node:test';
import assert from 'node:assert/strict';
import { button } from './index.js';

const SVG = '<svg data-brand="google"><path d="M0 0h1"/></svg>';

test('iconSvg renders as the raw leading glyph, before the label, unescaped', () => {
  const html = button({ label: 'Continue with Google', iconSvg: SVG });
  assert.ok(html.includes(SVG), 'raw SVG passes through unescaped');
  assert.ok(
    html.indexOf(SVG) < html.indexOf('<span>Continue with Google</span>'),
    'SVG sits in the leading slot, before the label',
  );
});

test('iconSvg wins over the named icon shorthand', () => {
  // A named icon would emit an <svg> from the kit set; iconSvg replaces it.
  const html = button({ label: 'Go', icon: 'plug', iconSvg: SVG });
  assert.ok(html.includes(SVG));
  // Only the one leading glyph — the named-icon path is skipped, so no second svg
  // beyond the branded one (busy bars are <span>, not <svg>).
  assert.equal((html.match(/<svg/g) || []).length, 1);
});

test('busy:true keeps the branded glyph and adds the loader + disabled state', () => {
  const html = button({ label: 'Signing you in', iconSvg: SVG, busy: true });
  assert.ok(html.includes(SVG), 'glyph stays while busy');
  assert.ok(html.includes('ui-btn__bars'), 'gradient-bars loader appended');
  assert.ok(html.includes('disabled aria-disabled="true"'));
  assert.ok(html.includes('aria-busy="true"'));
});

// iconOnly drops the visible text and the glyph is aria-hidden, so `label` is
// the button's only accessible name.
test('iconOnly names the button from label, and mirrors it into title', () => {
  const html = button({ label: 'Dismiss', icon: 'x', iconOnly: true });
  assert.match(html, /aria-label="Dismiss"/);
  assert.match(html, /title="Dismiss"/);
  assert.doesNotMatch(html, /<span>Dismiss<\/span>/, 'no visible text in icon-only mode');
});

test('iconOnly with a blank label falls back to the icon name, never nameless', () => {
  const html = button({ label: '   ', icon: 'trash', iconOnly: true });
  assert.match(html, /aria-label="trash"/);
});

test('an icon-only link carries the same name', () => {
  const html = button({ label: 'Open docs', icon: 'externalLink', iconOnly: true, href: '/docs' });
  assert.match(html, /^<a /);
  assert.match(html, /aria-label="Open docs"/);
});

test('a labelled button gets no aria-label — the visible text names it', () => {
  assert.doesNotMatch(button({ label: 'Save', icon: 'check' }), /aria-label/);
});

test('without iconSvg the named-icon path is unchanged', () => {
  const bare = button({ label: 'Plain' });
  assert.ok(!bare.includes('<svg'), 'no glyph when neither icon nor iconSvg given');
  const named = button({ label: 'Connect', icon: 'plug' });
  assert.ok(named.includes('<svg'), 'named icon still emits a kit glyph');
});
