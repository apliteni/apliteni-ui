import { dropdown } from '../../src/components/dropdown.js';
import { button } from '../../src/components/index.js';
import { pad, row, specimen } from '../_gallery.js';
import { currencyItems } from '../_currencies.js';

const VERSIONS = [
  { label: 'phoenix.2026.002', description: 'Product units, animated deck', badge: 'Live', selected: true },
  { label: 'phoenix.2026.001', description: 'Phoenix, 2026-05-17', badge: 'Archive' },
  { label: 'phoenix.2025.014', description: 'Phoenix, 2025-12-02', badge: 'Archive' },
];

// Use tone: 'state' for off, unset, disabled or archived badges, including translated labels.
// English state words are a fallback only when tone is omitted; explicit neutral uses body ink.
const CHANNELS = [
  { label: 'In-app', description: 'Toasts inside the console', badge: { text: 'On', tone: 'live' }, selected: true },
  { label: 'Email', description: 'Daily digest to your inbox', badge: { text: 'Off', tone: 'state' } },
  { label: 'Webhook', description: 'POST to your endpoint', badge: { text: 'Beta', tone: 'accent' } },
];

const ACTIONS = [
  { label: 'Edit', icon: 'gear' },
  { label: 'Duplicate', icon: 'copy' },
  { label: 'Share link', icon: 'globe' },
  '---',
  { label: 'Delete', icon: 'x', danger: true },
];

const ACCOUNT = [
  { label: 'Workspace settings', icon: 'gear' },
  { label: 'Members', icon: 'user' },
  '---',
  { label: 'Sign out', icon: 'x' },
];

const LONG = Array.from({ length: 22 }, (_, i) => ({
  label: `Region ${String(i + 1).padStart(2, '0')}`,
  description: `edge-${i + 1}.apliteni.net`,
  value: `r${i + 1}`,
  selected: i === 2,
}));

// Interactive stories return HTML strings; the preview decorator wires them via
// wireTopbar() -> wireDropdown(). Open-state specimens pass `open: true`.
export default {
  title: 'Components/Dropdown',
  parameters: { layout: 'centered' },
};

// A tall shell so an open (absolutely-positioned) panel isn't clipped.
const bay = (html, h = 300) => `<div style="min-height:${h}px">${html}</div>`;

export const Playground = {
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    'Single-select — click to open, arrow keys to move, Esc to close',
    dropdown({ label: 'version:', ariaLabel: 'Version', items: VERSIONS }),
  ))),
};

export const SingleSelect = {
  name: 'Single-select (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    'Value shown in the trigger, selected row ticked',
    dropdown({ label: 'version:', ariaLabel: 'Version', items: VERSIONS, open: true }),
  ))),
};

export const ActionMenu = {
  name: 'Action menu (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    'Plain action list with leading icons, a separator, and a danger row',
    dropdown({ value: 'Actions', variant: 'menu', ariaLabel: 'Actions', items: ACTIONS, open: true }),
  ))),
};

export const DescriptionsAndBadges = {
  name: 'With descriptions + badges (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    "Set badge tone: 'state' for off, unset, disabled or archived labels in any language. English state words are a fallback only when tone is omitted.",
    dropdown({ label: 'notify:', value: 'In-app', ariaLabel: 'Notification channel', items: CHANNELS, open: true }),
  ))),
};

export const Grouped = {
  name: 'Grouped sections (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    'Labelled groups separated by a divider',
    dropdown({
      value: 'Move to…', variant: 'menu', ariaLabel: 'Move to', open: true,
      sections: [
        { label: 'Spaces', items: [
          { label: 'Strategy', icon: 'compass' },
          { label: 'Product', icon: 'cube' },
        ] },
        { label: 'Archive', items: [
          { label: '2025 vault', icon: 'layers' },
          { label: 'Cold storage', icon: 'shield' },
        ] },
      ],
    }),
  ), 340)),
};

export const DisabledItem = {
  name: 'Disabled item (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    'A non-interactive, skipped-by-keyboard row',
    dropdown({
      value: 'Export', variant: 'menu', ariaLabel: 'Export', open: true,
      items: [
        { label: 'Export CSV', icon: 'doc' },
        { label: 'Export PDF', icon: 'doc' },
        { label: 'Export to Sheets', icon: 'globe', disabled: true },
      ],
    }),
  ))),
};

export const Scrollable = {
  name: 'Long / scrollable list (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    'Capped height with an internal scroll for long option lists',
    dropdown({ label: 'region:', ariaLabel: 'Region', items: LONG, scroll: true, open: true }),
  ), 360)),
};

// Search — a field above the rows that filters them as the reader types.
// why: docs/specification.md#a-dropdown-with-a-search-field
const CURRENCY = { label: 'currency:', ariaLabel: 'Currency', search: { placeholder: 'Search currencies' } };

export const Search = {
  name: 'Search — type to filter',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    'search: true — open it, type to filter, ↑ ↓ to move through what is left, Enter to pick, Esc to close',
    dropdown({ ...CURRENCY, items: currencyItems('EUR') }),
  ), 440)),
};

export const SearchOpen = {
  name: 'Search (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    'The field is pinned; the 29 rows scroll under it',
    dropdown({ ...CURRENCY, items: currencyItems('EUR'), open: true }),
  ), 440)),
};

export const SearchFiltered = {
  name: 'Search — matched anywhere in the label (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    '“dollar” finds six rows, none of which starts with it',
    dropdown({ ...CURRENCY, items: currencyItems('EUR'), open: true, search: { ...CURRENCY.search, query: 'dollar' } }),
  ), 440)),
};

export const SearchNoMatch = {
  name: 'Search — no match (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    'A query that matches nothing says so, with a nudge and no action',
    dropdown({
      ...CURRENCY, items: currencyItems('EUR'), open: true,
      search: { ...CURRENCY.search, query: 'bitcoin', empty: 'No currency matches “{q}”' },
    }),
  ), 440)),
};

export const SearchGrouped = {
  name: 'Search — a group with no match (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    '“tax” leaves no row in Operating, so the group goes and no divider sits above Reserve',
    dropdown({
      ariaLabel: 'Account', variant: 'select', open: true, search: { placeholder: 'Search accounts', query: 'tax' },
      sections: [
        { label: 'Operating', items: [{ label: 'Payroll', value: 'payroll' }, { label: 'Payables', value: 'payables', selected: true }] },
        { label: 'Reserve', items: [{ label: 'Tax reserve', value: 'tax-reserve' }, { label: 'Rainy day', value: 'rainy-day' }] },
        { label: 'Escrow', items: [{ label: 'Escrow tax', value: 'escrow-tax' }] },
      ],
    }),
  ), 380)),
};

// A head and a foot — two blocks pinned to the panel's edges, each bleeding back
// through its padding so its rule runs edge to edge. The kit gives them the
// bleed and the line; what goes inside is the page's, laid out by the page.
// `foot` draws its block; a head is the page's own markup through the unwrapped
// `header` slot, which is how `railUser()` has always written one.
// why: docs/specification.md#the-dropdown-panel
const FILTERS = [
  { label: 'Unpaid', description: '12 payouts', icon: 'clock' },
  { label: 'Awaiting approval', description: '3 payouts', icon: 'shield' },
  { label: 'Paid this month', description: '48 payouts', icon: 'check' },
];

const note = (text) => `<span class="ui-dropdown__desc">${text}</span>`;
const HEAD = '<div class="ui-dropdown__head"><b>Filter payouts</b></div>';

export const HeadAndFoot = {
  name: 'A head and a foot (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
'A title over the rows and a note under them, both running edge to edge without the page '
    + 'knowing what the panel is padded by',
    dropdown({
      value: 'Filter', variant: 'menu', ariaLabel: 'Filter payouts', open: true,
      header: HEAD,
      items: FILTERS,
      foot: note('Counts refresh every 5 minutes.'),
    }),
  ), 360)),
};

// A foot of controls goes in a panel that may hold one. A menu takes menuitems
// and a listbox takes options, so a Save / Cancel pair under either is refused
// by axe's aria-required-children; `search: true` makes the panel a dialog,
// which is the same answer the kit already gives for the field above the rows.
// why: docs/specification.md#the-dropdown-panel
export const FootOfControls = {
  name: 'A foot of controls (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(bay(specimen(
    'A Save / Cancel pair under the list, in the panel role that may hold one',
    dropdown({
      value: 'Filter', ariaLabel: 'Filter payouts', open: true,
      search: { placeholder: 'Search filters' },
      header: HEAD,
      items: FILTERS,
      foot: '<div style="display:flex;justify-content:flex-end;gap:8px">'
        + button({ label: 'Cancel', variant: 'ghost', size: 'sm' })
        + button({ label: 'Save', variant: 'primary', size: 'sm' })
        + '</div>',
    }),
  ), 460)),
};

// The trigger sits at the foot of its bay, so the panel opens into the space
// above it — the shape a user menu at the bottom of a rail takes — and the
// specimen's own label stays clear of where the panel lands.
const foot = (html, h = 260) =>
  `<div style="min-height:${h}px;display:flex;flex-direction:column;justify-content:flex-end">${html}</div>`;

export const OpensUpward = {
  name: 'Opens upward (open)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(specimen(
    'direction: "up" — the same 9px offset, measured from the trigger\'s top edge',
    foot(dropdown({ value: 'Ada Lovelace', variant: 'menu', ariaLabel: 'Account', direction: 'up', open: true, items: ACCOUNT })),
  )),
};

export const AutoDirection = {
  name: 'Auto direction — the window decides',
  parameters: { layout: 'fullscreen' },
  render: () => pad(specimen(
    'direction: "auto" — measured on each open, so it goes up in a short window and down in a '
    + 'tall one. Resize the preview and open it again.',
    foot(dropdown({ value: 'Ada Lovelace', variant: 'menu', ariaLabel: 'Account', direction: 'auto', items: ACCOUNT }), 520),
  )),
};

// A sticky, scrolling rail — .ui-app__rail is both, and either one on its own is
// enough to trap a panel. why: docs/specification.md#the-dropdown-panel
const rail = (html) =>
  `<div class="ui-app" style="grid-template-columns:249px 1fr">` +
    `<aside class="ui-app__rail" style="width:249px">${html}</aside>` +
    `<main style="padding:24px;display:flex;flex-direction:column;gap:16px">` +
      `<div class="ui-card" style="position:relative">A positioned card, later in the DOM than the rail.</div>` +
      `<div class="ui-card" style="position:relative">A second one, under the panel's path.</div>` +
    `</main>` +
  `</div>`;

export const InAppRail = {
  name: 'Portalled — a switcher in the app rail',
  parameters: { layout: 'fullscreen' },
  render: () => rail(
    dropdown({
      label: 'workspace:', ariaLabel: 'Workspace', portal: true, open: true,
      items: [
        { label: 'Phoenix production', description: 'phoenix.apliteni.example', badge: 'Live', selected: true },
        { label: 'Aurora staging', description: 'aurora.apliteni.example' },
      ],
    }),
  ),
};

// The three tags a row can be, side by side and hand-written, because the
// factory emits two of them and this story is about the third. `is-selected`
// and __tick mean a row gets chosen, and choosing is a <button>'s job — so a
// page builds one, and .ui-dropdown__item takes the browser's button skin back
// off. why: docs/specification.md#a-dropdown-row-is-a-div-a-link-or-a-button
const GUTS = '<span class="ui-dropdown__main">'
  + '<span class="ui-dropdown__label">phoenix.2026.002</span>'
  + '<span class="ui-dropdown__desc">Product units, animated deck</span></span>'
  + '<span class="ui-dropdown__badge is-live">Live</span>'
  + '<span class="ui-dropdown__tick" aria-hidden="true">'
  + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">'
  + '<path d="M20 6 9 17l-5-5"/></svg></span>';

// A panel with no trigger: `position: static` is the specimen, not the
// component — an open panel is absolutely positioned against one.
const flat = (rows) =>
  `<div class="ui-dropdown__panel" role="listbox" aria-label="Version" `
  + `style="position:static;opacity:1;visibility:visible;transform:none;width:280px">${rows}</div>`;

export const RowTags = {
  name: 'A row as div, link and button',
  parameters: { layout: 'fullscreen' },
  render: () => pad(row(
    specimen('&lt;div&gt; — what the factory emits',
      flat(`<div class="ui-dropdown__item is-selected" role="option" aria-selected="true" tabindex="-1">${GUTS}</div>`)),
    specimen('&lt;a href&gt; — an item carrying href',
      flat(`<a class="ui-dropdown__item is-selected" href="#version" role="option" aria-selected="true" tabindex="-1">${GUTS}</a>`)),
    specimen('&lt;button&gt; — a page writing its own row',
      flat(`<button class="ui-dropdown__item is-selected" type="button" role="option" aria-selected="true" tabindex="-1">${GUTS}</button>`)),
  )),
};
