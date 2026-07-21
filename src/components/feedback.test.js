import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestSection } from './feedback.js';

// Minimal fake DOM nodes — enough for nearestSection's walk (tagName, id,
// previousElementSibling, parentElement, nodeType). No jsdom needed.
const elem = (tagName, id = '', { prev = null, parent = null } = {}) =>
  ({ tagName, id, previousElementSibling: prev, parentElement: parent, nodeType: 1 });

test('nearestSection returns the closest preceding h2/h3[id]', () => {
  const root = { tagName: 'MAIN', id: '', nodeType: 1, querySelector: () => null };
  const h2 = elem('H2', 'intro', { parent: root });
  const p = elem('P', '', { prev: h2, parent: root });
  const textNode = { nodeType: 3, parentNode: p };
  assert.equal(nearestSection(textNode, root), h2);
});

test('nearestSection walks up to an ancestor heading', () => {
  const root = { tagName: 'MAIN', id: '', nodeType: 1, querySelector: () => null };
  const h3 = elem('H3', 'sub', { parent: root });
  const wrap = elem('DIV', '', { prev: h3, parent: root });
  const span = elem('SPAN', '', { parent: wrap });
  assert.equal(nearestSection(span, root), h3);
});

test('nearestSection ignores headings without an id', () => {
  const root = { tagName: 'MAIN', id: '', nodeType: 1, querySelector: () => null };
  const h2noId = elem('H2', '', { parent: root });
  const p = elem('P', '', { prev: h2noId, parent: root });
  // no id on the heading, no fallback → querySelector stub returns null
  assert.equal(nearestSection(p, root), null);
});

test('nearestSection falls back to the first heading in root', () => {
  const first = elem('H2', 'first');
  const root = { tagName: 'MAIN', id: '', nodeType: 1, querySelector: () => first };
  const orphan = elem('P', '', { parent: root });
  assert.equal(nearestSection(orphan, root), first);
});
