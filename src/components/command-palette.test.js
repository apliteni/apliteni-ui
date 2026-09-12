// What the palette's markup promises and how its ranking orders a list.
//
// The keyboard, the focus and the announcement are next door in
// stories/palette-keyboard.test.js, which presses real keys; this file is the
// string factory and the pure ranking, which need no page at all.
//
// The ranking assertions name ORDER and never a score: SCORE is a ladder whose
// rungs can be renumbered, and a test that pinned 90 would fail on a change that
// costs a reader nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  commandPalette, commandPaletteList, rankCommands, scoreCommand, paletteHotkey,
  wireCommandPalette, setPaletteResults, openCommandPalette,
} from './command-palette.js';

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});

const GROUPS = [
  {
    label: 'Actions',
    items: [
      { id: 'new-campaign', label: 'New campaign', icon: 'plus', shortcut: ['c'] },
      { id: 'invite', label: 'Invite a teammate', description: 'Send an email invitation', icon: 'user' },
    ],
  },
  {
    label: 'Go to',
    items: [
      { id: 'reports', label: 'Reports', href: '/reports', icon: 'chart' },
      { id: 'settings', label: 'Settings', href: '/settings', keywords: ['preferences'], icon: 'gear' },
    ],
  },
];

// --- markup / a11y contract ----------------------------------------------

test('commandPalette() is a dialog holding a combobox that controls the listbox', () => {
  const html = commandPalette({ groups: GROUPS, label: 'Command palette' });
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-label="Command palette"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-autocomplete="list"/);
  assert.match(html, /aria-expanded="true"/);

  const listId = /id="(cmdk-\d+-list)" role="listbox"/.exec(html);
  assert.ok(listId, 'the list declares role=listbox with an id');
  assert.match(html, new RegExp(`aria-controls="${listId[1]}"`));
});

test('every row is an option out of the tab order, with an id the combobox can point at', () => {
  const html = commandPalette({ groups: GROUPS });
  const rows = [...html.matchAll(/<div [^>]*role="option"[^>]*>/g)].map((m) => m[0]);
  assert.equal(rows.length, 4);
  for (const row of rows) {
    assert.match(row, /tabindex="-1"/, 'an option in the tab order puts forty rows between the '
      + 'reader and the rest of the palette');
    assert.match(row, /id="cmdk-\d+-o\d+"/);
    assert.match(row, /aria-selected="(true|false)"/);
  }
  const ids = rows.map((r) => /id="([^"]+)"/.exec(r)[1]);
  assert.equal(new Set(ids).size, ids.length, 'two rows share an id');
});

test('a group names itself through the heading it renders', () => {
  const html = commandPalette({ groups: GROUPS });
  const group = /<div class="ui-cmdk__group" role="group"[^>]*aria-labelledby="([^"]+)"/.exec(html);
  assert.ok(group, 'the group carries role=group and points at its own heading');
  assert.match(html, new RegExp(`id="${group[1]}">Actions<`));
});

test('an empty group renders nothing rather than a heading over no rows', () => {
  const html = commandPaletteList([{ label: 'Recent', items: [] }, { label: 'Actions', items: [{ label: 'Run' }] }]);
  assert.doesNotMatch(html, /Recent/);
  assert.match(html, /Actions/);
});

test('specimen renders a picture: no modal claim, no wiring hook', () => {
  const html = commandPalette({ groups: GROUPS, specimen: true });
  assert.doesNotMatch(html, /aria-modal/);
  assert.doesNotMatch(html, /data-cmdk[ =>]/);
  assert.match(html, /is-open/);
});

test('a label a reader typed cannot close the attribute it is written into', () => {
  const html = commandPalette({ items: [{ label: '"><script>x</script>', description: '<b>no</b>' }] });
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<b>no<\/b>/);
});

// --- the three behaviours -------------------------------------------------

test('a row that goes somewhere carries its href in data, so Tab never reaches a link', () => {
  const html = commandPalette({ items: [{ id: 'r', label: 'Reports', href: '/reports' }] });
  assert.match(html, /data-href="\/reports"/);
  assert.doesNotMatch(html, /<a /);
});

test('a destructive row that names a confirm opens it, and says so', () => {
  const html = commandPalette({
    items: [{ id: 'del', label: 'Delete workspace…', danger: true, confirm: 'confirm-del' }],
  });
  assert.match(html, /data-confirm-open="confirm-del"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /is-danger/);
  assert.doesNotMatch(html, /aria-disabled="true"/);
});

test('a destructive row with nothing to ask is rendered disabled rather than run', () => {
  const html = commandPalette({ items: [{ id: 'del', label: 'Delete workspace', danger: true }] });
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /is-disabled/);
  assert.doesNotMatch(html, /data-confirm-open/);
  assert.doesNotMatch(html, /is-danger/, 'a row nothing can press is unavailable rather than '
    + 'dangerous, and the danger signal is not spent on it');
});

test('paletteHotkey names the key the reader actually has', () => {
  assert.equal(paletteHotkey('MacIntel'), '⌘K');
  assert.equal(paletteHotkey('Win32'), 'Ctrl K');
  assert.equal(paletteHotkey(undefined), 'Ctrl K');
});

// --- ranking --------------------------------------------------------------

const labels = (items, q) => rankCommands(items, q).map((i) => i.label);

test('the whole beats the part, and the name beats the note', () => {
  const items = [
    { label: 'Set a budget', description: 'new campaigns only' },   // description
    { label: 'Renew campaign' },                                    // contains
    { label: 'New campaign' },                                      // prefix
    { label: 'Draft new campaign copy' },                           // word start
    { label: 'Network settings' },                                  // subsequence of "new"
  ];
  assert.deepEqual(labels(items, 'new'), [
    'New campaign',
    'Draft new campaign copy',
    'Renew campaign',
    'Set a budget',
    'Network settings',
  ]);
});

test('an exact label wins over a longer one that merely starts with the query', () => {
  const items = [{ label: 'Reports overview' }, { label: 'Reports' }];
  assert.deepEqual(labels(items, 'reports'), ['Reports', 'Reports overview']);
});

test('a keyword reaches an item whose label does not hold the query at all', () => {
  const items = [{ label: 'Settings', keywords: ['preferences', 'account'] }];
  assert.deepEqual(labels(items, 'preferences'), ['Settings']);
  assert.deepEqual(labels(items, 'pref'), ['Settings']);
});

test('initials find a long label, and the initials lose to a real word match', () => {
  const items = [{ label: 'New campaign' }, { label: 'Nc invoice' }];
  assert.deepEqual(labels(items, 'nc'), ['Nc invoice', 'New campaign']);
});

test('a tie keeps the order the caller passed, at both ends of the list', () => {
  const items = [{ label: 'Zebra report' }, { label: 'Alpha report' }, { label: 'Mango report' }];
  assert.deepEqual(labels(items, 'report'), ['Zebra report', 'Alpha report', 'Mango report']);
  assert.deepEqual(labels(items, ''), ['Zebra report', 'Alpha report', 'Mango report']);
});

test('every token of a multi-word query has to land somewhere', () => {
  const items = [{ label: 'New campaign' }, { label: 'New invoice' }];
  assert.deepEqual(labels(items, 'new camp'), ['New campaign']);
  assert.deepEqual(labels(items, 'camp new'), ['New campaign']);
  assert.deepEqual(labels(items, 'new missing'), []);
});

test('a query that matches nothing returns nothing, and an empty one returns everything', () => {
  const items = [{ label: 'Reports' }, { label: 'Settings' }];
  assert.deepEqual(labels(items, 'qqq'), []);
  assert.equal(rankCommands(items, '   ').length, 2);
  assert.equal(scoreCommand({ label: 'Reports' }, ''), scoreCommand({ label: 'Settings' }, ''));
});

// --- the same ranking, applied to rows already rendered --------------------

function mount(html, page = '') {
  const dom = new JSDOM(
    '<!doctype html><html><body>'
    + `<main id="page"><button id="trigger" data-cmdk-open="p1">Open</button>${page}</main>`
    + html
    + '</body></html>',
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  const { window } = dom;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  wireCommandPalette(window.document);
  return window;
}

const shown = (root) => Array.from(root.querySelectorAll('[data-cmdk-item]'))
  .filter((el) => !el.hidden).map((el) => el.querySelector('.ui-cmdk__label').textContent);

test('typing re-ranks the rows where they stand and hides the ones that do not answer', () => {
  const win = mount(commandPalette({ groups: GROUPS, id: 'p1', open: true }));
  const root = win.document.getElementById('p1');
  const input = root.querySelector('[data-cmdk-input]');

  assert.deepEqual(shown(root), ['New campaign', 'Invite a teammate', 'Reports', 'Settings']);

  input.value = 'set';
  input.dispatchEvent(new win.Event('input'));
  assert.deepEqual(shown(root), ['Settings']);
  assert.equal(root.querySelector('[data-cmdk-status]').textContent, '1 result');
});

test('the group holding the best row comes first, and the caller breaks the tie', () => {
  const win = mount(commandPalette({ groups: GROUPS, id: 'p1', open: true }));
  const root = win.document.getElementById('p1');
  const input = root.querySelector('[data-cmdk-input]');
  const heads = () => Array.from(root.querySelectorAll('[data-cmdk-group]:not([hidden]) .ui-cmdk__group-head'))
    .map((el) => el.textContent);

  assert.deepEqual(heads(), ['Actions', 'Go to'], 'nothing typed: the caller decides');

  input.value = 'report';
  input.dispatchEvent(new win.Event('input'));
  assert.deepEqual(heads(), ['Go to'], 'the group with no answer is not a heading over nothing');
});

test('nothing matching says so on the page and in the live region', () => {
  const win = mount(commandPalette({ groups: GROUPS, id: 'p1', open: true, empty: 'No matches' }));
  const root = win.document.getElementById('p1');
  const input = root.querySelector('[data-cmdk-input]');
  input.value = 'qqqq';
  input.dispatchEvent(new win.Event('input'));

  assert.equal(root.querySelector('[data-cmdk-empty]').hidden, false);
  assert.equal(root.querySelector('[data-cmdk-status]').textContent, 'No results');
  assert.equal(root.querySelector('[data-cmdk-input]').getAttribute('aria-activedescendant'), null);
});

test('a palette that ranks nothing asks its caller instead, and hides no row', () => {
  const win = mount(commandPalette({ groups: GROUPS, id: 'p1', open: true, rank: false }));
  const root = win.document.getElementById('p1');
  const input = root.querySelector('[data-cmdk-input]');
  const asked = [];
  root.addEventListener('ui-command-query', (e) => asked.push(e.detail.query));

  input.value = 'rep';
  input.dispatchEvent(new win.Event('input'));

  assert.deepEqual(asked, ['rep']);
  assert.equal(shown(root).length, 4, 'a server-fed palette keeps what the server sent');
});

test('new results replace the list without touching what the reader typed', () => {
  const win = mount(commandPalette({ groups: GROUPS, id: 'p1', open: true, rank: false }));
  const root = win.document.getElementById('p1');
  const input = root.querySelector('[data-cmdk-input]');
  input.value = 'inv';

  setPaletteResults(root, [{ label: 'Invoices', items: [{ id: 'i-1', label: 'INV-4812' }] }]);

  assert.equal(input.value, 'inv');
  assert.deepEqual(shown(root), ['INV-4812']);
  assert.equal(root.querySelector('[data-cmdk-item]').getAttribute('aria-selected'), 'true');
});

test('choosing a row says which one, and closes', () => {
  const win = mount(commandPalette({ groups: GROUPS, id: 'p1' }));
  const root = win.document.getElementById('p1');
  const chosen = [];
  root.addEventListener('ui-command', (e) => chosen.push(e.detail.id));

  openCommandPalette(root, win.document.getElementById('trigger'));
  root.querySelector('[data-id="new-campaign"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));

  assert.deepEqual(chosen, ['new-campaign']);
  assert.equal(root.classList.contains('is-open'), false);
});

test('a row that opens a confirm leaves the palette standing under it', () => {
  const win = mount(commandPalette({
    id: 'p1',
    items: [{ id: 'del', label: 'Delete workspace…', danger: true, confirm: 'confirm-del' }],
  }));
  const root = win.document.getElementById('p1');
  openCommandPalette(root);
  root.querySelector('[data-id="del"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));

  assert.equal(root.classList.contains('is-open'), true, 'the palette closing would take the '
    + 'question away with it, and the confirm is the whole point of the row');
});

test('a disabled row does nothing at all', () => {
  const win = mount(commandPalette({
    id: 'p1',
    items: [{ id: 'del', label: 'Delete workspace', danger: true }],
  }));
  const root = win.document.getElementById('p1');
  const fired = [];
  root.addEventListener('ui-command', () => fired.push(1));
  openCommandPalette(root);
  root.querySelector('[data-id="del"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));

  assert.deepEqual(fired, []);
  assert.equal(root.classList.contains('is-open'), true);
});

test('a palette rendered with a query in it comes out ranked, not in caller order', () => {
  const html = commandPalette({ groups: GROUPS, query: 'report', specimen: true });
  const heads = [...html.matchAll(/class="ui-cmdk__group-head"[^>]*>([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(heads, ['Go to'], 'the group with no answer is not drawn at all');
  assert.match(html, /data-cmdk-empty hidden/);
});

test('a palette rendered with nothing to show says so without being wired', () => {
  const html = commandPalette({ groups: [], specimen: true, empty: 'No matches' });
  assert.match(html, /<p class="ui-cmdk__empty" data-cmdk-empty>No matches<\/p>/);
});
