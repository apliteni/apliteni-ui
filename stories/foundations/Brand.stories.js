import { seedling, prism, brand } from '../../src/assets/brand.js';
import { pad } from '../_gallery.js';
import { apliteniLogo, apliteniLogoDark, apliteniMark } from '../../src/assets/brand.generated/index.js';

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

// Raw brand SVGs ship with fixed width/height attrs. Rewrite ONLY the opening
// <svg> tag (leave inner width/height, e.g. clipPath rects, untouched) so the
// mark scales to its box via viewBox. `h` sets a fixed height, width auto.
const fitH = (svg, h) => svg.replace(/<svg\b([^>]*)>/, (_m, a) =>
  `<svg${a.replace(/\s(width|height)="[^"]*"/g, '')} style="height:${h};width:auto;display:block">`);
const fitBox = (svg) => svg.replace(/<svg\b([^>]*)>/, (_m, a) =>
  `<svg${a.replace(/\s(width|height)="[^"]*"/g, '')} style="width:100%;height:100%;display:block">`);

// Suffix internal ids (clip/gradient) so multiple copies of one SVG on a page
// don't collide — collisions break rendering and trip the axe duplicate-id gate.
let _uid = 0;
const uniq = (svg) => {
  const n = ++_uid;
  return svg.replace(/\b(id|xlink:href|href)="#?([\w-]+)"/g, (m, attr, id) =>
    `${attr}="${attr === 'id' ? '' : '#'}${id}-u${n}"`)
    .replace(/url\(#([\w-]+)\)/g, (m, id) => `url(#${id}-u${n})`);
};

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

// The canonical umbrella-brand assets, synced from apliteni/design-system. These
// are the source of truth for the Apliteni wordmark + mark; the inline seedling()
// above is the same design. Edit these upstream, never here.
export const Umbrella = {
  name: 'Umbrella (synced)',
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Umbrella brand</h1>
    <p style="color:var(--dim);max-width:60ch;margin-bottom:8px">The canonical Apliteni wordmark + mark, synced from <code style="font-family:var(--font-mono);font-size:12px">apliteni/design-system</code> into <code style="font-family:var(--font-mono);font-size:12px">src/assets/brand.generated/</code>. Use these for anything that represents <b style="color:var(--strong)">Apliteni the company</b> — the kit's own <b style="color:var(--strong)">prism</b> (see Marks) is separate.</p>
    <p style="color:var(--muted);max-width:60ch;margin-bottom:40px;font:400 13px/1.5 Poppins">Generated — edit upstream, never here.</p>

    <section style="margin-bottom:40px">
      ${h3('Wordmark')}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">
        <div style="background:#121212;border-radius:16px;padding:40px;display:flex;justify-content:center">${uniq(fitH(apliteniLogo, '34px'))}</div>
        <div style="background:#f1efed;border-radius:16px;padding:40px;display:flex;justify-content:center">${uniq(fitH(apliteniLogoDark, '34px'))}</div>
      </div>
    </section>

    <section>
      ${h3('Mark')}
      <div style="display:flex;gap:40px;align-items:flex-end;flex-wrap:wrap">
        ${[72, 48, 32, 24].map((s) => `<div style="width:${s}px;height:${s}px">${uniq(fitBox(apliteniMark))}</div>`).join('')}
      </div>
    </section>`),
};
