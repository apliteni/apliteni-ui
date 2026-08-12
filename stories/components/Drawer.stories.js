import { drawer } from '../../src/components/drawer.js';
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
      <h1 style="font:600 22px/1.2 Poppins;color:var(--strong);margin:0 0 10px">Workspace</h1>
      <p style="font:400 13px/1.6 Poppins;color:var(--muted);margin:0 0 24px">
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

// ---- Form in a drawer — header / scrollable body / footer actions -------
export const FormInDrawer = {
  name: 'Form in a drawer (open)',
  render: () => behind() + drawer({
    side: 'right', size: 'md', title: 'New API key', specimen: true,
    body:
      card({ body:
        `<p style="margin:0;font:400 12.5px/1.55 Poppins;color:var(--muted)">Scoped, named, and
        audited — keys, not root. Give it a name and pick what it may reach.</p>` })
      + `<div style="height:18px"></div>`
      + field({ label: 'Key name', control: input({ placeholder: 'e.g. CI deploy bot' }) })
      + field({ label: 'Scope', control: select({ options: ['Read only', 'Read + write', 'Admin'] }) })
      + field({ label: 'Expires', control: select({ options: ['30 days', '90 days', 'No expiry'] }) })
      + `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
           <span style="font:500 12.5px/1 Poppins;color:var(--text)">Notify on first use</span>
           ${switchToggle({ checked: true, label: 'Notify on first use' })}
         </div>`,
    footer: button({ label: 'Cancel', variant: 'secondary' }) + button({ label: 'Create key', variant: 'primary' }),
  }),
};
