import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('command-palette.md', new URL('../../guidelines/command-palette.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
//
// Every specimen is a real commandPalette(), rendered as a `specimen` — a
// picture of the dialog rather than the dialog, because six modal palettes on
// one page would trap a reader in the first one. What is wrong in a don't is
// the content, the order or the wording; never the markup.
import { commandPalette } from '../../src/components/command-palette.js';

/**
 * The keys the palette answers, and what each one does.
 *
 * DECLARED here and held against the source by
 * stories/guidelines/command-palette.test.js: a key the code compares against
 * and this list has never heard of fails the build, and so does a key this list
 * promises that nothing handles. The prose and the keyboard cannot drift.
 *
 * `owner` is the file that answers it — Escape and Tab belong to the overlay
 * stack every kit overlay is on, which is why one Escape closes one overlay and
 * the confirm a row opened is the one it closes first.
 */
export const KEYS = [
  { key: 'k', does: 'Cmd+K opens it from anywhere; Ctrl+K is left to a text box the reader is typing in.', owner: 'src/components/command-palette.js' },
  { key: 'ArrowDown', does: 'Moves to the next row, and wraps round to the first.', owner: 'src/components/command-palette.js' },
  { key: 'ArrowUp', does: 'Moves to the previous row, and wraps round to the last.', owner: 'src/components/command-palette.js' },
  { key: 'Enter', does: 'Runs the active row. Cmd or Ctrl held opens a row that goes somewhere in a new tab.', owner: 'src/components/command-palette.js' },
  { key: 'Escape', does: 'Closes the top overlay — the confirm a row opened before the palette under it.', owner: 'src/components/overlay.js' },
  { key: 'Tab', does: 'Stays inside the palette. There is one stop in it, so nothing moves.', owner: 'src/components/overlay.js' },
];

// The specimens are dialogs, and a dialog is `position: fixed` — six of them
// over the page would be one picture with five behind it. The stage puts each
// panel back in the flow at the width the pair needs, and takes the scrim away:
// a scrim is a statement about the page, and there is no page here.
export const SPEC_CSS = `
  <style>
    .gc-stage .ui-cmdk { position: static; inset: auto; pointer-events: auto; }
    .gc-stage .ui-cmdk__scrim { display: none; }
    .gc-stage .ui-cmdk.is-open .ui-cmdk__panel {
      position: static; transform: none; opacity: 1;
      width: auto; max-height: none;
    }
    .gc-stage .ui-cmdk__list { max-height: none; }
  </style>`;

const stage = (html) => `<div class="gc-stage">${html}</div>`;

const palette = (o) => stage(commandPalette({ specimen: true, hint: false, ...o }));

// One product's list, so a reader comparing two specimens is comparing the rule
// and not the content. The finance portal's surfaces, named the way its own
// navigation names them.
const ACTIONS = [
  { id: 'new-invoice', label: 'New invoice', description: 'Draft one for a client', icon: 'plus', shortcut: ['n'] },
  { id: 'invite', label: 'Invite a teammate', description: 'They get a read-only seat', icon: 'user' },
  { id: 'export', label: 'Export rows as CSV', description: 'The current filter, all pages', icon: 'download' },
];
const PLACES = [
  { id: 'reports', label: 'Reports', description: 'Revenue, payouts and fees', icon: 'chart', href: '#r' },
  { id: 'transactions', label: 'Transactions', description: '4,812 rows this month', icon: 'table', href: '#t' },
  { id: 'settings', label: 'Settings', description: 'Billing, members, API keys', icon: 'gear', href: '#s' },
];
const RECENT = [
  { id: 'inv-4812', label: 'INV-4812', description: 'Nebula Ltd · €2,480 · unpaid', icon: 'doc', badge: 'Unpaid', href: '#i1' },
  { id: 'inv-4809', label: 'INV-4809', description: 'Orbit GmbH · €960 · paid', icon: 'doc', href: '#i2' },
];

const GROUPED = [
  { label: 'Actions', items: ACTIONS },
  { label: 'Go to', items: PLACES },
  { label: 'Recent', items: RECENT },
];

export const belongsDo = () => palette({ groups: GROUPED });

// Four rows nobody would type, drawn by the real factory: a heading that is not
// a command, a setting that cannot be done here, the page the reader is already
// on, and a word that names a menu rather than an action.
export const belongsDont = () => palette({
  groups: [{
    label: 'Actions',
    items: [
      { id: 'adv', label: 'Advanced…', description: 'More options', icon: 'gear' },
      { id: 'freq', label: 'Notification frequency', description: 'Daily, weekly or never', icon: 'bell' },
      { id: 'here', label: 'Transactions', description: 'You are here', icon: 'table' },
      { id: 'more', label: 'More', description: '', icon: 'grid' },
    ],
  }],
});

export const groupsDo = () => palette({ groups: GROUPED });
export const groupsDont = () => palette({ items: [...ACTIONS, ...PLACES, ...RECENT] });

export const rankDo = () => palette({ groups: GROUPED, query: 'inv' });
// The same query answered alphabetically: `rank: false` is the seam a
// server-fed palette uses, and this is what it looks like when the server sends
// back an order nobody ranked.
export const rankDont = () => palette({
  rank: false,
  query: 'inv',
  groups: [{
    label: 'Results',
    items: [
      { id: 'inv-4809', label: 'INV-4809', description: 'Orbit GmbH · €960 · paid', icon: 'doc' },
      { id: 'inv-4812', label: 'INV-4812', description: 'Nebula Ltd · €2,480 · unpaid', icon: 'doc' },
      { id: 'invite', label: 'Invite a teammate', description: 'They get a read-only seat', icon: 'user' },
      { id: 'new-invoice', label: 'New invoice', description: 'Draft one for a client', icon: 'plus' },
    ],
  }],
});

export const askDo = () => palette({
  groups: [{
    label: 'Danger zone',
    items: [
      { id: 'del', label: 'Delete workspace…', description: 'Nebula · 42 API keys', icon: 'trash', danger: true, confirm: 'gc-del' },
      { id: 'revoke', label: 'Revoke every API key…', description: 'They stop working at once', icon: 'key', danger: true, confirm: 'gc-del' },
    ],
  }],
});
// `danger` and no `confirm`, which is what the caption is about: the component
// renders the pair aria-disabled rather than running them, and the picture has
// to show that refusal. Drop `danger` and these are two live rows and the last
// sentence of the caption describes something the reader cannot see.
export const askDont = () => palette({
  groups: [{
    label: 'Danger zone',
    items: [
      { id: 'del', label: 'Delete workspace', description: 'Nebula · 42 API keys', icon: 'trash', danger: true },
      { id: 'revoke', label: 'Revoke every API key', description: 'They stop working at once', icon: 'key', danger: true },
    ],
  }],
});

export const RULES = withSpecimens(content.rules, [
{ id: 'named-things', doHtml: belongsDo, dontHtml: belongsDont, kit: [{ ref: 'src/components/command-palette.js:194', pattern: 'function paletteItem' }] },
{ id: 'groups', doHtml: groupsDo, dontHtml: groupsDont, kit: [
      { ref: 'src/components/command-palette.js:255', pattern: 'export function commandPaletteList' },
      { ref: 'src/styles/command-palette.css:148', pattern: '.ui-cmdk__group-head' },
    ] },
{ id: 'ranking', doHtml: rankDo, dontHtml: rankDont, kit: [
      { ref: 'src/components/command-palette.js:33', pattern: 'export const SCORE' },
      { ref: 'src/components/command-palette.js:130', pattern: 'export function rankGroups' },
    ] },
{ id: 'keyboard', kit: [
      { ref: 'src/components/command-palette.js:515', pattern: 'function onKeydown' },
      { ref: 'src/components/overlay.js:97', pattern: 'function ownKeys' },
    ] },
{ id: 'say-it', kit: [
      { ref: 'src/components/command-palette.js:368', pattern: 'function setActive' },
      { ref: 'src/components/command-palette.js:392', pattern: 'function announce' },
      { ref: 'src/components/overlay.js:236', pattern: 'export function returnFocus' },
    ] },
{ id: 'ask-first', doHtml: askDo, dontHtml: askDont, kit: [
      { ref: 'src/components/command-palette.js:229', pattern: 'const isRefused = (it) =>' },
      { ref: 'src/styles/command-palette.css:236', pattern: '.ui-cmdk__item.is-danger' },
    ] }
]);
