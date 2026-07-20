import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Spacing & Radius',
  parameters: { layout: 'fullscreen' },
};

const SPACES = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16'];
const RADII = [['xs', '--radius-xs'], ['sm', '--radius-sm'], ['md', '--radius-md'], ['lg', '--radius-lg'], ['xl', '--radius-xl'], ['2xl', '--radius-2xl'], ['pill', '--radius-pill']];

export const Spacing = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Spacing</h1>
    <p style="color:var(--dim);margin-bottom:30px">A 4px base scale. Reach for a token, not a magic number.</p>
    <div style="display:flex;flex-direction:column;gap:14px;max-width:640px">
      ${SPACES.map((s) => `<div style="display:flex;align-items:center;gap:20px">
        <code style="font-family:var(--font-mono);font-size:13px;color:var(--muted);width:130px">--space-${s}</code>
        <div style="height:18px;width:var(--space-${s});background:var(--accent);border-radius:4px"></div>
      </div>`).join('')}
    </div>`),
};

export const Radius = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Radius</h1>
    <p style="color:var(--dim);margin-bottom:30px">Soft, generous corners — the deck rarely uses a sharp edge.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:22px;max-width:820px">
      ${RADII.map(([name, v]) => `<div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start">
        <div style="width:100%;height:84px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border);border-radius:var(${v})"></div>
        <div><div style="font:600 12.5px/1 Poppins;color:var(--strong)">${name}</div><code style="font-family:var(--font-mono);font-size:11px;color:var(--muted)">${v}</code></div>
      </div>`).join('')}
    </div>`),
};
