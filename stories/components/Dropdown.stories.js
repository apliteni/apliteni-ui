import { dropdown } from '../../src/components/dropdown.js';
import { pad, row, specimen } from '../_gallery.js';

const VERSIONS = [
  { label: 'phoenix.2026.002', description: 'Product units, animated deck', badge: 'Live', selected: true },
  { label: 'phoenix.2026.001', description: 'Phoenix, 2026-05-17', badge: 'Archive' },
  { label: 'phoenix.2025.014', description: 'Phoenix, 2025-12-02', badge: 'Archive' },
];

const CHANNELS = [
  { label: 'In-app', description: 'Toasts inside the console', badge: { text: 'On', tone: 'live' }, selected: true },
  { label: 'Email', description: 'Daily digest to your inbox', badge: 'Off' },
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
    'Two-line rows with a secondary description and a trailing status badge',
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
