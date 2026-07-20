import { button, badge, segmented } from '../../src/components/index.js';
import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Sub-themes',
  parameters: { layout: 'fullscreen' },
};

// The real token values (mirrors tokens.css + accents.css) so each preview panel
// is fully self-contained via inline CSS variables — every accent shows in both
// themes at once, independent of the toolbar.
const THEME = {
  dark: { bg: '#16151f', surface: '#221f2e', s2: '#1b1927', s3: '#2a2739', border: '#332f45', text: '#e9e7f0', strong: '#fff', dim: '#c6c2d6', muted: '#948fa8', green: '#98ff8f', glowGreen: 'rgba(152,255,143,.16)' },
  light: { bg: '#f6f6f8', surface: '#fff', s2: '#f0f1f5', s3: '#e7e9f0', border: '#d7dae2', text: '#1e232b', strong: '#0f0f13', dim: '#3d434e', muted: '#565c68', green: '#1c8a2c', glowGreen: 'rgba(30,150,50,.1)' },
};
const ACCENT = {
  Nebula: { dark: { a: '#9b5dff', ac: '#fff', pl: '#9b5dff', pm: '#b479ff', g: 'rgba(155,93,255,.18)', gf: '#9b5dff', gt: '#20dcf5' }, light: { a: '#6a2dcc', ac: '#fff', pl: '#6a2dcc', pm: '#7a3be0', g: 'rgba(106,45,204,.09)', gf: '#6a2dcc', gt: '#0c8fa8' } },
  Phoenix: { dark: { a: '#ff6a3d', ac: '#241006', pl: '#ff8a5c', pm: '#ffa273', g: 'rgba(255,106,61,.18)', gf: '#ff7a45', gt: '#ffcf6a' }, light: { a: '#d64a12', ac: '#fff', pl: '#d64a12', pm: '#b8420f', g: 'rgba(214,74,18,.1)', gf: '#d64a12', gt: '#e8992a' } },
  Ocean: { dark: { a: '#3b9dff', ac: '#04121f', pl: '#5ab0ff', pm: '#7cc0ff', g: 'rgba(59,157,255,.18)', gf: '#3b9dff', gt: '#20dcf5' }, light: { a: '#1568d6', ac: '#fff', pl: '#1568d6', pm: '#1560c8', g: 'rgba(21,104,214,.1)', gf: '#1568d6', gt: '#17a2c0' } },
  Emerald: { dark: { a: '#16c98a', ac: '#04180f', pl: '#3ad9a0', pm: '#5fe3b4', g: 'rgba(22,201,138,.18)', gf: '#16c98a', gt: '#20dcf5' }, light: { a: '#0b9c68', ac: '#fff', pl: '#0b9c68', pm: '#0a9060', g: 'rgba(11,156,104,.1)', gf: '#0b9c68', gt: '#12b0a0' } },
};

const vars = (theme, ac) => {
  const t = THEME[theme];
  return `--bg:${t.bg};--surface:${t.surface};--surface-2:${t.s2};--surface-3:${t.s3};--border:${t.border};--text:${t.text};--strong:${t.strong};--dim:${t.dim};--muted:${t.muted};--green:${t.green};--glow-green:${t.glowGreen};--ink:${t.text};--accent:${ac.a};--accent-contrast:${ac.ac};--purple:${ac.a};--purple-light:${ac.pl};--purple-mid:${ac.pm};--glow-purple:${ac.g};--ring:0 0 0 3px ${ac.g};--grad-from:${ac.gf};--grad-to:${ac.gt}`;
};

const panel = (name, theme) => {
  const ac = ACCENT[name][theme];
  return `<div style="${vars(theme, ac)};background:var(--bg);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:16px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span style="font:700 20px/1 Poppins;letter-spacing:-.01em"><span style="background:linear-gradient(120deg,var(--grad-from),var(--grad-to));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">${name}</span></span>
      <span style="display:flex;gap:6px">${badge(theme, theme === 'dark' ? 'archive' : 'archive')}${badge('Live', 'live')}</span>
    </div>
    <div class="ui-card" style="padding:16px 18px;display:flex;flex-direction:column;gap:13px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">${button({ label: 'Primary', variant: 'primary', size: 'sm' })}${button({ label: 'Secondary', variant: 'secondary', size: 'sm' })}${button({ label: 'Ghost', variant: 'ghost', size: 'sm' })}</div>
      ${segmented({ options: ['Deck', 'Text'], active: 0, size: 'sm' })}
      <div style="display:flex;align-items:center;gap:10px">
        <label class="ui-switch"><input type="checkbox" checked><span class="ui-switch__track"></span></label>
        <span style="color:var(--dim);font:400 13px Poppins">accent drives every control</span>
      </div>
    </div>
  </div>`;
};

const wall = (theme) => `
  <div style="margin-bottom:12px;font:600 12px/1 Poppins;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">${theme} theme</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-bottom:38px">
    ${Object.keys(ACCENT).map((n) => panel(n, theme)).join('')}
  </div>`;

export const Overview = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Accent sub-themes</h1>
    <p style="color:var(--dim);margin-bottom:32px;max-width:64ch">One orthogonal <code style="font-family:var(--font-mono)">data-accent</code> dimension, on top of dark/light. Only the accent family moves — surfaces, text and signal colours (green = live) stay put — so every accent works in both themes and every component follows with no per-component change. Switch <b>Accent</b> in the toolbar to theme the whole kit.</p>
    ${wall('dark')}
    ${wall('light')}
  `),
};
