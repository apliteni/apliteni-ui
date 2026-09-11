import { drawer, drawerSection } from '../../src/components/drawer.js';
import { button, field, input, select, switchToggle, card } from '../../src/components/index.js';

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
  <p style="margin:0 0 14px">Motion respects <code>prefers-reduced-motion</code>: the slide
  is dropped for a plain fade. The panel surface, shadow, and scrim are token-driven, so
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

// ---- Variants under review (#272) — one record, four treatments ---------
// The same fabricated transaction in each frame, so the only difference between
// them is how the panel separates its parts. "Today" is the look #272 reported:
// a bordered card per group and a rule under every row.
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

const ruledCard = ({ title, rows, action }) => card({
  body: (title ? `<h3 class="dv-ruled__title">${title}</h3>` : '')
    + rows.map(([k, v]) => `<div class="dv-ruled__row"><span>${k}</span><span>${v}</span></div>`).join('')
    + (action ? `<div class="dv-ruled__row">${button({ label: action, variant: 'ghost', size: 'sm', icon: 'edit' })}</div>` : ''),
});

const sections = () => RECORD.map(({ title, rows, action }) => drawerSection({
  title, rows,
  body: action ? button({ label: action, variant: 'ghost', size: 'sm', icon: 'edit' }) : '',
})).join('');

const VARIANTS = [
  { key: 'today', label: 'Today', note: 'A bordered card per group, a rule under every row.' },
  { key: 'sep-space', label: 'A · Space only', note: 'No rule inside the panel. Groups are held apart by space and a heading.' },
  { key: 'sep-rule', label: 'B · One rule per group', note: 'Header and footer keep their rule. One rule between groups, none between rows.' },
  { key: 'sep-fill', label: 'C · Filled groups', note: 'Each group is a flat tint. Nothing is ruled.' },
];

const VARIANT_CSS = `<style>
  .dv { display: grid; grid-template-columns: repeat(2, 520px); gap: var(--space-8) var(--space-6);
    padding: var(--space-8); justify-content: center; }
  .dv-cell { display: flex; flex-direction: column; gap: var(--space-2); }
  .dv-cell h2 { margin: 0; font: 600 var(--text-md)/1.3 var(--font-sans); color: var(--strong); }
  .dv-cell p { margin: 0 0 var(--space-2); font: 400 var(--text-sm)/1.5 var(--font-sans); color: var(--muted); }
  .dv-frame { position: relative; height: 860px; overflow: hidden; border-radius: var(--radius-md);
    background: var(--bg); box-shadow: inset 0 0 0 1px var(--border); }
  .dv-frame .ui-drawer { position: absolute; }
  .dv-ruled__title { margin: 0 0 var(--space-3); font: 600 var(--text-md)/1.3 var(--font-sans); color: var(--strong); }
  .dv-ruled__row { display: flex; justify-content: space-between; gap: var(--space-4);
    padding-block: var(--space-3); border-bottom: 1px solid var(--border); font-size: var(--text-sm); }
  .dv-ruled__row:last-child { border-bottom: 0; }
  .dv-ruled__row span:first-child { color: var(--strong); }
  .dv .ui-card + .ui-card { margin-top: var(--space-4); }
</style>`;

export const Variants = {
  name: 'Variants (#272)',
  render: () => `${VARIANT_CSS}<div class="dv">${VARIANTS.map(({ key, label, note }) => `
    <div class="dv-cell">
      <h2>${label}</h2><p>${note}</p>
      <div class="dv-frame"${key === 'today' ? ' data-specimen="dont"' : ''}>${drawer({
        side: 'right', title: 'Northwind Payments', specimen: true,
        body: key === 'today' ? RECORD.map(ruledCard).join('') : sections(),
        footer: button({ label: 'Open statement', variant: 'secondary' }) + button({ label: 'Done', variant: 'primary' }),
      }).replace('class="ui-drawer ', `class="ui-drawer ${key === 'today' ? '' : `ui-drawer--${key} `}`)}</div>
    </div>`).join('')}</div>`,
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
