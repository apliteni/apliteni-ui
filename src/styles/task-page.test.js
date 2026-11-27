/**
 * Rule: a task board's parts are kit parts (#866). A movable card keeps its own box in
 * both themes, its two slots are drawn from existing tokens, the menu on a card is a ghost
 * button at rest, a board scrolls sideways with the scroll band, and the toolbar keeps the
 * search, Group by and View on one line above 560px. Read as text, because the package
 * ships CSS as its artifact. The paint and the drag are measured in a browser by
 * stories/task-page.test.js.
 * why: docs/components.md#movable-card, docs/components.md#query-search
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const read = (rel) => decomment(readFileSync(path.join(here, rel), 'utf8'));
const CARD = read('card.css');
const rule = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `no rule for ${selector}`);
  return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
};
const has = (body, decl) => assert.match(body, new RegExp(`(^|[;\\s])${decl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};`), decl);
/** Classes, attributes and pseudo-classes, the way the cascade counts them (no :is or :where here). */
const weight = (selector) => (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!root\b|not\()[\w-]+/g) ?? []).length
  + (selector.match(/:root\b/g) ?? []).length;

const LIGHT = ':root[data-theme="light"] .ui-card';
const MOVABLE = ':root[data-theme] .ui-card.ui-card--movable:not(.ui-card--pad-lg):not(.ui-card--accent):not(.ui-card--live)';
const HELD = ':root[data-theme] .ui-card.ui-card--movable.is-held:not(.ui-card--pad-lg):not(.ui-card--accent):not(.ui-card--live)';

test('a movable card draws its own box in both themes, above the light card', () => {
  assert.ok(CARD.includes(`${LIGHT} {`), 'the light card rule this one must outrank is gone');
  assert.ok(weight(MOVABLE) > weight(LIGHT), `${weight(MOVABLE)} must outrank ${weight(LIGHT)}`);
  assert.ok(CARD.indexOf(`${MOVABLE} {`) > CARD.indexOf(`${LIGHT} {`), 'the movable card comes after the light card');
  const body = rule(CARD, MOVABLE);
  for (const decl of ['background: var(--surface)', 'border-color: var(--card-edge)', 'box-shadow: var(--elev-rest)', 'padding: var(--space-4)', 'margin: 0', 'cursor: grab', '-webkit-touch-callout: none']) has(body, decl);
  assert.doesNotMatch(body, /transform|transition/, 'a lifted card would move the fixed menu it opens');
});

test('a held card leaves an empty source slot, and the target slot is a dashed accent edge', () => {
  assert.ok(weight(HELD) > weight(MOVABLE));
  const held = rule(CARD, HELD);
  for (const decl of ['background: var(--surface-2)', 'border-color: transparent', 'box-shadow: none']) has(held, decl);
  has(rule(CARD, '.ui-card--movable.is-held > *'), 'visibility: hidden');
  const slot = rule(CARD, '.ui-card-slot');
  for (const decl of ['border: 1px dashed var(--accent)', 'background: var(--surface-2)', 'border-radius: var(--radius-md)', 'pointer-events: none']) has(slot, decl);
  const lifted = rule(CARD, '.ui-card--lifted');
  for (const decl of ['position: fixed', 'pointer-events: none', 'z-index: var(--z-toast)']) has(lifted, decl);
});

test('the card action stands one title line high, so its button sits on the first line', () => {
  has(rule(CARD, '.ui-card__action'), 'height: calc(var(--text-lg) * var(--leading-snug))');
  has(rule(CARD, '.ui-card--movable:focus-visible'), 'outline: var(--ring)');
});

test('a trigger drawn as a ghost button has no fill and no edge at rest', () => {
  const body = rule(read('dropdown.css'), '.ui-dropdown__trigger.ui-btn--ghost');
  has(body, 'background: transparent');
  has(body, 'border-color: transparent');
});

test('the toolbar keeps the query search, Group by and View on one line above 560px', () => {
  const layout = read('layout.css');
  has(rule(layout, '.ui-toolbar:has(> .ui-query)'), 'flex-wrap: nowrap');
  has(rule(layout, '.ui-toolbar > .ui-query'), 'max-width: var(--panel-lg)');
  has(rule(layout, '.ui-toolbar:has(> .ui-query) > .ui-seg:last-child'), 'margin-inline-start: auto');
  const phone = layout.slice(layout.lastIndexOf('@media (max-width: 560px)'));
  assert.match(phone, /\.ui-toolbar:has\(> \.ui-query\) \{ flex-wrap: wrap; \}/);
  has(rule(layout, '.ui-app__title-row--compact,\n.ui-app__title-row--compact:not(:has(+ .ui-app__sub))'), 'margin-bottom: var(--space-2)');
});

test('a board scrolls its columns sideways and takes the inward scroll band', () => {
  const body = rule(CARD, '.ui-card-board');
  for (const decl of ['overflow-x: auto', 'overscroll-behavior-x: contain', 'padding: var(--space-1)']) has(body, decl);
  const ring = rule(CARD, '.ui-card-board:focus-visible');
  for (const decl of ['outline: var(--ring-scroll)', 'outline-offset: var(--ring-scroll-offset)']) has(ring, decl);
});

test('a pinned linked title is one line, cut at a ceiling, so the pin never covers the other columns', () => {
  const TABLE = read('table.css');
  const body = rule(TABLE, '.ui-table--pinned .ui-table__title.ui-table__linked > a:not([class]):only-child');
  for (const decl of ['display: block', 'max-width: clamp(min(var(--panel-sm), 40vw), calc(100vw - var(--container)), var(--panel-lg))', 'overflow: hidden', 'text-overflow: ellipsis']) has(body, decl);
  assert.ok(TABLE.indexOf('.ui-table--pinned .ui-table__title.ui-table__linked > a') < TABLE.indexOf('@media (max-width: 720px)'),
    'the cut comes before the 720px block, whose own cap cuts first on a phone');
});
