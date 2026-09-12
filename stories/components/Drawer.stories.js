import { drawer, drawerSection } from '../../src/components/drawer.js';
import { button, field, input, select, switchToggle } from '../../src/components/index.js';

// Drawers are position:fixed overlays: each story renders a little faux page
// behind so the scrim reads true, then the drawer on top. Interactive stories
// use a [data-drawer-open="id"] trigger; the preview decorator wires them via
// wireDrawer().
//
// The one-per-side stories pass `specimen: true` rather than `open: true`: a
// picture of a drawer should not close itself the first time someone presses
// Escape or hits the X, because nothing on those stories can open it again.
export default {
  title: 'Components/Drawer',
  parameters: { layout: 'fullscreen' },
};

// Faux page content sitting behind the scrim, so an open drawer has something
// to dim. Height fills the iframe.
const behind = (inner = '') => `
  <div style="min-height:100vh;padding:40px">
    <div style="max-width:560px">
      <h1 style="font:600 22px/1.2 var(--font-display);color:var(--strong);margin:0 0 10px">Workspace</h1>
      <p style="font:400 13px/1.6 var(--font-sans);color:var(--muted);margin:0 0 24px">
        The page behind a drawer stays put and gets a scrim. Focus is trapped in the
        panel; Esc or a scrim click closes it and returns focus to the trigger.
      </p>
      ${inner}
    </div>
  </div>`;

const LOREM = `
  <p style="margin:0 0 14px">Drawers slide in from any edge over a scrim. Left and right
  panels are full-height; top and bottom are full-width. The body scrolls when its
  content overflows while the header and footer stay pinned.</p>
  <p style="margin:0 0 14px">Under <code>prefers-reduced-motion</code> the panel appears at
  once, with no slide. The panel surface, shadow, and scrim are token-driven, so
  the drawer re-themes across accents and light/dark.</p>
  <p style="margin:0">Close on scrim click, on the header button, or with Esc.</p>`;

// ---- One story per side (open) ------------------------------------------
const sideStory = (side) => ({
  name: `${side[0].toUpperCase() + side.slice(1)} (open)`,
  render: () => behind() + drawer({
    side, title: `${side[0].toUpperCase() + side.slice(1)} drawer`,
    body: LOREM, specimen: true,
    footer: button({ label: 'Close', variant: 'secondary' }) + button({ label: 'Save', variant: 'primary' }),
  }),
});

export const Right = sideStory('right');
export const Left = sideStory('left');
export const Top = sideStory('top');
export const Bottom = sideStory('bottom');

// ---- Interactive — trigger opens, Esc / scrim / close returns focus ------
export const Playground = {
  render: () => behind(button({ label: 'Open drawer', variant: 'primary' })
      .replace('<button ', '<button data-drawer-open="dr-play" '))
    + drawer({
      id: 'dr-play', side: 'right', title: 'Filters',
      body: LOREM,
      footer: button({ label: 'Reset', variant: 'ghost' }) + button({ label: 'Apply', variant: 'primary' }),
    }),
};

// ---- Sizes demo — three triggers, sm / md / lg --------------------------
export const Sizes = {
  render: () => {
    const trig = (size) => button({ label: `Open ${size}`, variant: 'secondary' })
      .replace('<button ', `<button data-drawer-open="dr-${size}" `);
    const row = `<div style="display:flex;gap:12px;flex-wrap:wrap">${trig('sm')}${trig('md')}${trig('lg')}</div>`;
    return behind(row)
      + ['sm', 'md', 'lg'].map((size) => drawer({
          id: `dr-${size}`, side: 'right', size, title: `Size ${size}`,
          body: `<p style="margin:0">This panel is size <strong>${size}</strong>. Left/right sizes
          set width (320 / 420 / 560px); top/bottom sizes set height.</p>`,
        })).join('');
  },
};

// ---- A record: the drawer's default look (#272) ----------------------
// Groups under headings, each value beside its label, and the panel's three
// lines: under the header, over the footer, one between each group and the
// next. One fabricated transaction.
const RECORD = [
  { rows: [
    ['Amount', '€ 12,480.50'], ['Date', '31 Aug 2026'], ['Counterparty', 'Northwind Payments'],
    ['Description', 'Card payout · batch 2291'], ['Source', 'Bank feed'],
  ] },
  { title: 'How it is classified', rows: [
    ['Category', '—'], ['Unit', 'Ledger'], ['Team', '—'], ['Answered by', 'import-bot · 1 Sep 2026'],
  ], action: 'Reclassify' },
  { title: 'Where it came from', rows: [['Statement', '#4102'], ['Reference', 'po_example_1047']] },
];

export const Record = {
  name: 'Record (open)',
  render: () => behind() + drawer({
    side: 'right', title: 'Northwind Payments', specimen: true,
    body: RECORD.map(({ title, rows, action }) => drawerSection({
      title, rows,
      body: action ? button({ label: action, variant: 'ghost', size: 'sm', icon: 'edit' }) : '',
    })).join(''),
    footer: button({ label: 'Open statement', variant: 'secondary' }) + button({ label: 'Done', variant: 'primary' }),
  }),
};

// ---- Form in a drawer — header / scrollable body / footer actions -------
export const FormInDrawer = {
  name: 'Form in a drawer (open)',
  render: () => behind() + drawer({
    side: 'right', size: 'md', title: 'New API key', specimen: true,
    body:
      `<p style="margin:0 0 var(--space-5);color:var(--muted)">Give the key a name and pick what it may reach.</p>`
      + field({ label: 'Key name', control: input({ placeholder: 'e.g. CI deploy bot' }) })
      + field({ label: 'Scope', control: select({ options: ['Read only', 'Read + write', 'Admin'] }) })
      + field({ label: 'Expires', control: select({ options: ['30 days', '90 days', 'No expiry'] }) })
      + `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
           <span style="font:500 12.5px/1 var(--font-sans);color:var(--text)">Notify on first use</span>
           ${switchToggle({ checked: true, label: 'Notify on first use' })}
         </div>`,
    footer: button({ label: 'Cancel', variant: 'secondary' }) + button({ label: 'Create key', variant: 'primary' }),
  }),
};
