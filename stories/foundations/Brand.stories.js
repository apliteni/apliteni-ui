import { seedling, prism, brand } from '../../src/assets/brand.js';
import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Brand',
  parameters: { layout: 'fullscreen' },
};

const h3 = (t) => `<h3 style="font:600 13px/1 Poppins;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 18px">${t}</h3>`;

// A size ramp for a mark: the mark rendered at each px size with a caption.
const ramp = (mark, prefix, sizes) => `<div style="display:flex;gap:40px;align-items:flex-end;flex-wrap:wrap;margin-bottom:26px">${
  sizes.map((s) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px">${mark(prefix + s, s)}<code style="font-family:var(--font-mono);font-size:11px;color:var(--muted)">${s}px</code></div>`).join('')
}</div>`;

const lockup = (inner) => `<div style="display:inline-flex;padding:20px 26px;background:var(--surface);border-radius:14px">${inner}</div>`;

export const Marks = {
  name: 'Marks',
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Brand</h1>
    <p style="color:var(--dim);max-width:60ch;margin-bottom:44px">Two marks, two jobs. The <b style="color:var(--strong)">seedling</b> is Apliteni — the company. The <b style="color:var(--strong)">prism</b> is apliteni-ui — this kit. Don't swap them: products carry the Apliteni seedling, the kit carries the prism.</p>

    <section style="margin-bottom:52px">
      ${h3('Apliteni — the company')}
      <p style="color:var(--dim);max-width:56ch;margin:-6px 0 22px">The seedling. Growth, green, the parent brand every product ships under.</p>
      ${ramp(seedling, 'ap', [64, 40, 28, 20])}
      ${lockup(`<span class="brand">${seedling('apl', 28)}<span style="font-size:16px">Apliteni</span></span>`)}
    </section>

    <section>
      ${h3('apliteni-ui — the kit')}
      <p style="color:var(--dim);max-width:56ch;margin:-6px 0 22px">The prism — four accent sub-themes in one rounded mark. It stands for the kit, not for the products built with it.</p>
      ${ramp(prism, 'pr', [64, 40, 28, 20])}
      ${lockup(brand({ p: 'b1', word: 'apliteni-ui' }))}
    </section>`),
};
