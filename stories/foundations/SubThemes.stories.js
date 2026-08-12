import { button, badge, segmented } from '../../src/components/index.js';
import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Sub-themes',
  parameters: { layout: 'fullscreen' },
  // ACCENT and accentVars are the table and its renderer, exported so the gate
  // in stories/accent-contrast.test.js can measure what this page paints. They
  // are not stories; Storybook would otherwise index them as two.
  excludeStories: ['ACCENT', 'accentVars'],
};

// The real token values (mirrors tokens.css + accents.css) so each preview panel
// is fully self-contained via inline CSS variables — every accent shows in both
// themes at once, independent of the toolbar.
// Surfaces / text / signal colours inherit from the toolbar theme — only the
// accent family is pinned per panel, so the page shows ONE theme at a time.
// One key per token in that family: `a` --accent, `as` --accent-strong (the
// AA-safe button background), `ac` --accent-contrast, `p` --purple, `pl`
// --purple-light, `pm` --purple-mid, `g` --glow-purple, `rg` the --ring colour,
// `gf`/`gt` the gradient stops. Bright accents (Phoenix/Ocean/Emerald) pair with
// their dark --accent-contrast, so accent-strong == accent; the default purple
// darkens to #7c3aed for white text.
//
// A HAND-COPIED MIRROR GOES STALE, and this one twice did: two accents #96
// deepened and four washes #157 thinned were still here as their old literals,
// and every panel painted --purple and --ring from the wrong field. So it is no
// longer trusted — stories/accent-contrast.test.js resolves accentVars() below
// against the two token files, cell by cell and property by property, and fails
// on the first value that has drifted. Move a token, and fix the row here that
// the failure names.
export const ACCENT = {
  Nebula: {
    dark: { a: '#b479ff', as: '#7c3aed', ac: '#fff', p: '#6a2dcc', pl: '#b479ff', pm: '#bd8cff', g: 'rgba(180,121,255,.12)', rg: 'rgba(180,121,255,.35)', gf: '#9b5dff', gt: '#20dcf5' },
    light: { a: '#6a2dcc', as: '#6a2dcc', ac: '#fff', p: '#6a2dcc', pl: '#6a2dcc', pm: '#7a3be0', g: 'rgba(106,45,204,.09)', rg: 'rgba(106,45,204,.25)', gf: '#6a2dcc', gt: '#0c8fa8' },
  },
  Phoenix: {
    dark: { a: '#ff6a3d', as: '#ff6a3d', ac: '#241006', p: '#e0531f', pl: '#ff8a5c', pm: '#ffa273', g: 'rgba(255,106,61,.15)', rg: 'rgba(255,106,61,.38)', gf: '#ff7a45', gt: '#ffcf6a' },
    light: { a: '#a8370c', as: '#a8370c', ac: '#fff', p: '#c2400f', pl: '#d64a12', pm: '#b8420f', g: 'rgba(214,74,18,.1)', rg: 'rgba(214,74,18,.28)', gf: '#d64a12', gt: '#e8992a' },
  },
  Ocean: {
    dark: { a: '#3b9dff', as: '#3b9dff', ac: '#04121f', p: '#1f7fe0', pl: '#5ab0ff', pm: '#7cc0ff', g: 'rgba(59,157,255,.15)', rg: 'rgba(59,157,255,.38)', gf: '#3b9dff', gt: '#20dcf5' },
    light: { a: '#1568d6', as: '#1568d6', ac: '#fff', p: '#1156b8', pl: '#1568d6', pm: '#1560c8', g: 'rgba(21,104,214,.05)', rg: 'rgba(21,104,214,.28)', gf: '#1568d6', gt: '#17a2c0' },
  },
  Emerald: {
    dark: { a: '#16c98a', as: '#16c98a', ac: '#04180f', p: '#0fa876', pl: '#3ad9a0', pm: '#5fe3b4', g: 'rgba(22,201,138,.18)', rg: 'rgba(22,201,138,.38)', gf: '#16c98a', gt: '#20dcf5' },
    light: { a: '#087a52', as: '#087a52', ac: '#fff', p: '#0a865a', pl: '#0b9c68', pm: '#0a9060', g: 'rgba(11,156,104,.08)', rg: 'rgba(11,156,104,.28)', gf: '#0b9c68', gt: '#12b0a0' },
  },
};

export const accentVars = (ac) =>
  `--accent:${ac.a};--accent-strong:${ac.as};--accent-contrast:${ac.ac};--purple:${ac.p};--purple-light:${ac.pl};--purple-mid:${ac.pm};--glow-purple:${ac.g};--ring:0 0 0 3px ${ac.rg};--grad-from:${ac.gf};--grad-to:${ac.gt}`;

const panel = (name, theme) => {
  const ac = ACCENT[name][theme];
  return `<div style="${accentVars(ac)};background:var(--bg);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:16px;box-shadow:inset 0 0 0 1px var(--border)">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span style="font:700 20px/1 Poppins;letter-spacing:-.01em"><span style="background:linear-gradient(120deg,var(--grad-from),var(--grad-to));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">${name}</span></span>
      <span style="display:flex;gap:6px">${badge(theme, theme === 'dark' ? 'archive' : 'archive')}${badge('Live', 'live')}</span>
    </div>
    <div class="ui-card" style="padding:16px 18px;display:flex;flex-direction:column;align-items:flex-start;gap:13px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">${button({ label: 'Primary', variant: 'primary', size: 'sm' })}${button({ label: 'Secondary', variant: 'secondary', size: 'sm' })}${button({ label: 'Ghost', variant: 'ghost', size: 'sm' })}</div>
      ${segmented({ options: ['Deck', 'Text'], active: 0, size: 'sm', ariaLabel: 'View' })}
      <div style="display:flex;align-items:center;gap:10px">
        <label class="ui-switch"><input type="checkbox" checked aria-label="accent drives every control"><span class="ui-switch__track"></span></label>
        <span style="color:var(--dim);font:400 13px Poppins">accent drives every control</span>
      </div>
    </div>
  </div>`;
};

const wall = (theme) => `
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px">
    ${Object.keys(ACCENT).map((n) => panel(n, theme)).join('')}
  </div>`;

export const Overview = {
  render: (_args, ctx) => {
    const theme = ctx && ctx.globals && ctx.globals.theme === 'light' ? 'light' : 'dark';
    return pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Accent sub-themes</h1>
    <p style="color:var(--dim);margin-bottom:32px;max-width:64ch">One orthogonal <code style="font-family:var(--font-mono)">data-accent</code> dimension, on top of dark/light. All four accents at once — only the accent family moves; surfaces, text and signal colours (green = live) stay put. Flip <b>Theme</b> in the toolbar to see them in light or dark.</p>
    ${wall(theme)}
  `);
  },
};
