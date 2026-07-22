import { dropdown } from '../../src/components/dropdown.js';
import { pad, specimen } from '../_gallery.js';

const VERSIONS = [
  { label: 'phoenix.2026.002', description: 'Product units, animated deck', badge: 'live', selected: true },
  { label: 'phoenix.2026.001', description: 'Phoenix, 2026-05-17', badge: 'archive' },
  { label: 'phoenix.2025.014', description: 'Phoenix, 2025-12-02', badge: 'archive' },
];

const CHANNELS = [
  { label: 'In-app', description: 'Toasts inside the console', badge: { text: 'on', tone: 'live' }, selected: true },
  { label: 'Email', description: 'Daily digest to your inbox', badge: 'off' },
  { label: 'Webhook', description: 'POST to your endpoint', badge: { text: 'beta', tone: 'accent' } },
];

const ACTIONS = [
  { label: 'Edit', icon: 'gear' },
  { label: 'Duplicate', icon: 'copy' },
  { label: 'Share link', icon: 'globe' },
  '---',
  { label: 'Delete', icon: 'x', danger: true },
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
