import { prism, brand } from '../../src/assets/brand.js';
import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Brand',
  parameters: { layout: 'fullscreen' },
};

export const Mark = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Brand</h1>
    <p style="color:var(--dim);margin-bottom:36px">The prism — the mark for the apliteni-ui kit itself. Four accent sub-themes in one rounded mark. It stands for the kit, not for the products built with it.</p>
    <div style="display:flex;gap:40px;align-items:flex-end;flex-wrap:wrap;margin-bottom:44px">
      ${[64, 40, 28, 20].map((s) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px">${prism('m' + s, s)}<code style="font-family:var(--font-mono);font-size:11px;color:var(--muted)">${s}px</code></div>`).join('')}
    </div>
    <h3 style="font:600 13px/1 Poppins;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:18px">Lockup</h3>
    <div style="display:inline-flex;padding:20px 26px;background:var(--surface);border-radius:14px">${brand({ p: 'b1', word: 'apliteni-ui' })}</div>`),
};
