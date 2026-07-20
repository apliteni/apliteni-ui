import { icon, iconNames } from '../../src/assets/icons.js';
import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Iconography',
  parameters: { layout: 'fullscreen' },
};

export const Set = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Iconography</h1>
    <p style="color:var(--dim);margin-bottom:34px">A single line set — 24×24, 1.7 stroke, <code style="font-family:var(--font-mono)">currentColor</code>. Call <code style="font-family:var(--font-mono)">icon('name')</code>.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:16px;max-width:900px">
      ${iconNames.map((n) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 10px;background:var(--surface);border-radius:14px">
        <span style="width:24px;height:24px;color:var(--accent)">${icon(n)}</span>
        <code style="font-family:var(--font-mono);font-size:11.5px;color:var(--muted)">${n}</code>
      </div>`).join('')}
    </div>`),
};
