import { commandPalette, paletteHotkey } from '../../src/components/command-palette.js';
import { confirm } from '../../src/components/confirm.js';
import { button, card } from '../../src/components/index.js';
import { pad } from '../_gallery.js';

// One product's palette, used by every specimen on the page, so the difference
// between two of them is the density and never the content. The order inside
// each group is the order a caller passed: the palette keeps it wherever the
// ranking has nothing to say, which is the whole list until somebody types.
const GROUPS = [
  {
    label: 'Actions',
    items: [
      { id: 'new-invoice', label: 'New invoice', description: 'Draft one for a client', icon: 'plus', shortcut: ['n'] },
      { id: 'invite', label: 'Invite a teammate', description: 'They get a read-only seat', icon: 'user' },
      { id: 'export', label: 'Export rows as CSV', description: 'The current filter, all pages', icon: 'download', shortcut: ['⌘', 'E'] },
    ],
  },
  {
    label: 'Go to',
    items: [
      { id: 'reports', label: 'Reports', description: 'Revenue, payouts and fees', icon: 'chart', href: '#reports' },
      { id: 'transactions', label: 'Transactions', description: '4,812 rows this month', icon: 'table', href: '#transactions' },
      { id: 'settings', label: 'Settings', description: 'Billing, members, API keys', icon: 'gear', keywords: ['preferences', 'account'], href: '#settings' },
    ],
  },
  {
    label: 'Recent',
    items: [
      { id: 'inv-4812', label: 'INV-4812', description: 'Nebula Ltd · €2,480 · unpaid', icon: 'doc', badge: 'Unpaid', href: '#inv-4812' },
      { id: 'inv-4809', label: 'INV-4809', description: 'Orbit GmbH · €960 · paid', icon: 'doc', href: '#inv-4809' },
    ],
  },
];

export default {
  title: 'Components/Command palette',
  parameters: { layout: 'fullscreen' },
  render: (a) => commandPalette({ groups: GROUPS, ...a }),
  argTypes: {
    density: { control: 'inline-radio', options: ['compact', 'roomy'] },
    placeholder: { control: 'text' },
    label: { control: 'text' },
    empty: { control: 'text' },
    hint: { control: 'boolean' },
    open: { control: 'boolean' },
  },
  args: {
    density: 'compact',
    placeholder: 'Search or run a command…',
    label: 'Command palette',
    empty: 'No matches',
    hint: true,
    open: true,
  },
};

export const Playground = {};

// A specimen is a PICTURE of the palette: same markup, no aria-modal and no
// wiring hook, laid out in the page instead of over it. Three real dialogs on
// one page would trap a reader in the first, and the page below wants to show
// two at once.
const STAGE = `
  <style>
    .cp-stage .ui-cmdk { position: static; inset: auto; pointer-events: auto; }
    .cp-stage .ui-cmdk__scrim { display: none; }
    .cp-stage .ui-cmdk.is-open .ui-cmdk__panel {
      position: static; transform: none; opacity: 1;
      width: auto; max-height: none;
    }
    .cp-stage .ui-cmdk__list { max-height: none; }
    .cp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 26px; align-items: start; }
    .cp-label { font: 500 13px/1.4 var(--font-sans); color: var(--strong); margin-bottom: 4px; }
    .cp-note { font: 400 13px/1.55 var(--font-sans); color: var(--muted); max-width: 54ch; margin-bottom: 14px; }
    .cp-head { font: 600 15.5px/1.3 var(--font-sans); color: var(--strong); margin: 34px 0 6px; }
  </style>`;

const stage = (label, note, html) =>
  `<div><div class="cp-label">${label}</div><div class="cp-note">${note}</div>`
  + `<div class="cp-stage">${html}</div></div>`;

const spec = (o) => commandPalette({ groups: GROUPS, specimen: true, ...o });

/**
 * The two densities, side by side. One markup, one stylesheet, one class: the
 * roomy one gives the description a line of its own and the icon a tile.
 */
export const Densities = {
  parameters: { controls: { disable: true } },
  render: () => pad(STAGE + `<div class="cp-grid">`
    + stage(
      'Compact',
      'A row is one line: name, note, keys. Ten rows fit where six do below, which is '
      + 'the whole argument for it — a palette is scanned, not read.',
      spec({ density: 'compact' }),
    )
    + stage(
      'Roomy',
      'The description drops under the name and the icon gets a tile. For rows that '
      + 'need a sentence to tell apart — an invoice from an invoice.',
      spec({ density: 'roomy' }),
    )
    + '</div>'),
};

/** What it looks like while it is being typed into, and when nothing answers. */
export const States = {
  parameters: { controls: { disable: true } },
  render: () => pad(STAGE
    + '<div class="cp-grid">'
    + stage(
      'Ranked',
      'Typed "inv": the group holding the best row comes first, and the row it holds '
      + 'is the one Enter runs.',
      spec({ query: 'inv' }),
    )
    + stage(
      'Nothing matches',
      'The palette says so on the page and once, politely, in a live region. It does '
      + 'not offer to search elsewhere — that is a row the caller can put in the list.',
      spec({ query: 'quarterly vat', groups: [] }),
    )
    + '</div>'
    + '<div class="cp-head">A destructive row</div>'
    + '<div class="cp-grid">'
    + stage(
      'Asks first',
      'The row names a confirm, so Enter opens the question instead of running the '
      + 'command. The confirm paints above the palette and answers Escape first.',
      spec({
        hint: false,
        groups: [{
          label: 'Danger zone',
          items: [
            { id: 'del', label: 'Delete workspace…', description: 'Nebula · 42 API keys', icon: 'trash', danger: true, confirm: 'cp-del' },
            { id: 'revoke', label: 'Revoke every API key…', description: 'They stop working at once', icon: 'key', danger: true, confirm: 'cp-del' },
          ],
        }],
      }),
    )
    + stage(
      'Cannot ask',
      'The same two rows with no confirm named. The palette refuses to run them: a '
      + 'reader typing fast, choosing from a list that reorders under them, is the '
      + 'worst place in the product to lose a workspace.',
      spec({
        hint: false,
        groups: [{
          label: 'Danger zone',
          items: [
            { id: 'del', label: 'Delete workspace', description: 'Nebula · 42 API keys', icon: 'trash', danger: true },
            { id: 'revoke', label: 'Revoke every API key', description: 'They stop working at once', icon: 'key', danger: true },
          ],
        }],
      }),
    )
    + '</div>'),
};

/**
 * The real thing, wired: a page with a control that opens it, and the hotkey
 * live on the whole story. Everything else on this page is a picture; this one
 * owns the keyboard.
 */
export const InPlace = {
  parameters: { controls: { disable: true } },
  render: () => pad(
    card({
      title: 'Transactions',
      body: '<p style="margin:0 0 16px;color:var(--dim);font:400 14.5px/1.6 var(--font-sans)">'
        + `Press <kbd class="ui-cmdk__key">${paletteHotkey('MacIntel')}</kbd> anywhere on this page, `
        + 'or use the control below. Arrows move, Enter runs, Escape closes and puts you back.</p>'
        + button({ label: 'Search or run a command', variant: 'secondary', icon: 'search' })
          .replace('<button ', '<button data-cmdk-open="cp-live" '),
    })
    + commandPalette({ id: 'cp-live', groups: GROUPS })
    + confirm({
      id: 'cp-del',
      title: 'Delete the “Nebula” workspace?',
      body: 'Its 42 API keys stop working immediately. Nothing restores them.',
      confirmLabel: 'Delete workspace',
      cancelLabel: 'Keep it',
    }),
  ),
};
