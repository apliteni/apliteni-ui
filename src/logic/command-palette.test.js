// The command palette's shared logic: which key opens it, and how a query ranks the
// commands. The vanilla palette and the React <CommandPalette> both ask these.
//
// The ranking assertions name ORDER and never a score: SCORE is a ladder whose rungs
// can be renumbered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankCommands, scoreCommand, paletteHotkey } from './command-palette.js';

test('paletteHotkey names the key the reader actually has', () => {
  assert.equal(paletteHotkey('MacIntel'), '⌘K');
  assert.equal(paletteHotkey('Win32'), 'Ctrl K');
  // An unknown platform gets Ctrl. Left out, the argument is the host's own platform,
  // so a test that left it out would assert the machine it ran on.
  assert.equal(paletteHotkey(''), 'Ctrl K');
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
