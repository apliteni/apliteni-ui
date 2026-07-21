import { prism, brand } from '../../src/assets/brand.js';
import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Brand',
  parameters: { layout: 'fullscreen' },
};

export const Mark = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Brand</h1>
    <p style="color:var(--dim);margin-bottom:36px">The Apliteni prism — the four accent sub-themes in one rounded mark. Pair with a product word.</p>
    <div style="display:flex;gap:40px;align-items:flex-end;flex-wrap:wrap;margin-bottom:44px">
      ${[64, 40, 28, 20].map((s) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px">${prism('m' + s, s)}<code style="font-family:var(--font-mono);font-size:11px;color:var(--muted)">${s}px</code></div>`).join('')}
    </div>
    <h3 style="font:600 13px/1 Poppins;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:18px">Lockups</h3>
    <div style="display:flex;gap:32px;flex-wrap:wrap">
      <div style="padding:20px 24px;background:var(--surface);border-radius:14px">${brand({ p: 'b1', word: 'Strategy' })}</div>
      <div style="padding:20px 24px;background:var(--surface);border-radius:14px">${brand({ p: 'b2', word: 'Operating Model' })}</div>
      <div style="padding:20px 24px;background:var(--surface);border-radius:14px">${brand({ p: 'b3', word: 'Handbook' })}</div>
    </div>`),
};
