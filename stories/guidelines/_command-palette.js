// The shape of a rule and the gates that walk this page: docs/guidelines.md
//
// Every specimen is a real commandPalette(), rendered as a `specimen` — a
// picture of the dialog rather than the dialog, because six modal palettes on
// one page would trap a reader in the first one. What is wrong in a don't is
// the content, the order or the wording; never the markup.
import { commandPalette } from '../../src/components/command-palette.js';

export const TITLE = 'The command palette';

export const BLURB = 'What goes in it, how the list is ordered, and the five keys it owes a reader.';

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
  { id: 'inv-4812', label: 'INV-4812', description: 'Nebula Ltd · €2,480 · unpaid', icon: 'doc', badge: 'unpaid', href: '#i1' },
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
export const askDont = () => palette({
  groups: [{
    label: 'Danger zone',
    items: [
      { id: 'del', label: 'Delete workspace', description: 'Nebula · 42 API keys', icon: 'trash' },
      { id: 'revoke', label: 'Revoke every API key', description: 'They stop working at once', icon: 'key' },
    ],
  }],
});

export const RULES = [
  {
    id: 'named-things',
    imperative: 'Put a thing in the palette only when a reader can name it.',
    doHtml: belongsDo,
    dontHtml: belongsDont,
    doCaption: 'Commands a reader would say out loud, and records they already know by number. '
      + 'Every one of them can also be reached by clicking through the product — the palette is '
      + 'the short way, never the only way.',
    dontCaption: 'Four rows nobody would type. “Advanced…” and “More” name a menu rather than an '
      + 'action; the frequency setting needs a form, so the palette can open its page but cannot '
      + 'be it; and the third row goes where the reader already is.',
    except: 'A setting the palette can flip in one move is a command — “Switch to the light '
      + 'theme” is a thing somebody types. One that needs a choice made is a page: name the page.',
    kit: [{ ref: 'src/components/command-palette.js:225', pattern: 'function paletteItem' }],
  },
  {
    id: 'groups',
    imperative: 'Group results by what they are, and name each group in the product’s own word.',
    doHtml: groupsDo,
    dontHtml: groupsDont,
    doCaption: 'Three headings a reader scans instead of reading nine rows: what this does, where '
      + 'this goes, what I had open. Sentence case at 13px, the kit’s label role — a group name is '
      + 'a signpost and not a shout.',
    dontCaption: 'The same nine rows, ungrouped. An invoice, a page and a command are three '
      + 'different promises about what Enter is going to do, and nothing here says which is which.',
    why: 'GitHub, VS Code and Slack all reach for a prefix instead — #, @, / and > narrow the '
      + 'palette to one kind before it searches. That is a vocabulary each product owns, so the '
      + 'kit ships the grouping and not the prefixes: a product that wants > can feed the palette '
      + 'a different set of groups when it sees one.',
    kit: [
      { ref: 'src/components/command-palette.js:252', pattern: 'export function commandPaletteList' },
      { ref: 'src/styles/command-palette.css:124', pattern: '.ui-cmdk__group-head' },
    ],
  },
  {
    id: 'ranking',
    imperative: 'Rank on how the query meets the name, and let the caller break every tie.',
    doHtml: rankDo,
    dontHtml: rankDont,
    doCaption: 'Typed “inv”. A whole word beats a fragment, a name beats a note, and the group '
      + 'holding the best row comes first — so the row under Enter is the best answer on the page '
      + 'rather than the best answer in the first group.',
    dontCaption: 'The same query, sorted alphabetically. INV-4809 is first because of a digit; '
      + '“New invoice”, the only row here that is actually named after what was typed, is last.',
    why: 'Ties keep the order the caller passed, which is the whole of the kit’s ordering opinion '
      + 'and the reason a product can put its four most-used commands at the top and have them '
      + 'stay there. Nothing here is a use count: the kit has no memory of what a reader ran '
      + 'yesterday, and a product that does should pass its recents as a group.',
    except: 'A palette fed by a server ranks on the server — pass `rank: false`, answer the '
      + '`ui-command-query` event, and the kit renders the order it is given rather than ranking '
      + 'a page of results it cannot see the rest of.',
    kit: [
      { ref: 'src/components/command-palette.js:39', pattern: 'export const SCORE' },
      { ref: 'src/components/command-palette.js:145', pattern: 'export function rankGroups' },
    ],
  },
  {
    id: 'keyboard',
    imperative: 'Answer six keys, and leave every other key to the text box.',
    why: 'Cmd+K opens it, the arrows move and wrap, Enter runs the active row, Escape closes the '
      + 'top overlay, and Tab does not leave. Home and End stay with the caret, which is what the '
      + 'ARIA combobox pattern says they are for — cmdk rebinds them to the first and last row, '
      + 'along with Ctrl+N/P/J/K and Alt+Arrow, and that is a second keyboard nobody has '
      + 'documented to a reader. The list above is the whole contract, and a key the code answers '
      + 'that is not on it fails the build.',
    except: 'Ctrl+K inside another text box is left alone: it is kill-to-end-of-line there, and a '
      + 'palette that eats it breaks a keystroke the reader had first.',
    kit: [
      { ref: 'src/components/command-palette.js:493', pattern: 'function onKeydown' },
      { ref: 'src/components/overlay.js:92', pattern: 'function ownKeys' },
    ],
  },
  {
    id: 'say-it',
    imperative: 'Open focus in the text box, say how many results there are, and hand focus back.',
    why: 'The caret never leaves the box: the row a reader is on is named by '
      + 'aria-activedescendant, which is the combobox pattern’s answer and the only one that lets '
      + 'the arrows move a selection while the letters keep arriving. The count goes in a polite '
      + 'live region — the count and never the rows, because a region holding the list would read '
      + 'all of it out again on every keystroke. On the way out the opener gets focus back, even '
      + 'when the command that ran took the opener off the page.',
    kit: [
      { ref: 'src/components/command-palette.js:349', pattern: 'function setActive' },
      { ref: 'src/components/command-palette.js:369', pattern: 'function announce' },
      { ref: 'src/components/overlay.js:170', pattern: 'export function returnFocus' },
    ],
  },
  {
    id: 'ask-first',
    imperative: 'Never let the palette run a delete on its own.',
    doHtml: askDo,
    dontHtml: askDont,
    doCaption: 'The ellipsis says a question is coming, the ink is the kit’s danger colour and '
      + 'never the accent, and Enter opens the confirm — which paints above the palette and '
      + 'answers the first Escape.',
    dontCaption: 'The same two commands as ordinary rows. Nothing marks them, nothing asks, and '
      + 'they sit one arrow key from “Export rows as CSV” in a list that reorders as the reader '
      + 'types. A row like this that names no confirm is rendered disabled by the component.',
    why: 'The palette is the fastest surface in the product and the one where a reader is looking '
      + 'at the box rather than the list. A destructive item that names no confirm cannot be run '
      + 'from here at all: it renders aria-disabled, which is a visible refusal rather than a '
      + 'silent one.',
    kit: [
      { ref: 'src/components/command-palette.js:231', pattern: 'const unsafe = !!it.danger && !it.confirm;' },
      { ref: 'src/styles/command-palette.css:194', pattern: '.ui-cmdk__item.is-danger' },
    ],
  },
];
