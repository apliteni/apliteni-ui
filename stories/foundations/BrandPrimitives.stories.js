import { pad } from '../_gallery.js';

// The Apliteni umbrella-brand palette — the `--color-apliteni-*` primitives
// synced from apliteni/design-system (style.apliteni.com) into
// src/tokens/brand.generated.css. Rendered straight from the CSS variables, so
// this page updates itself whenever the sync PR lands.

export default {
  title: 'Foundations/Brand primitives',
  parameters: { layout: 'fullscreen' },
};

const h3 = (t) =>
  `<h3 style="font:600 13px/1 Poppins;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 16px">${t}</h3>`;

// A single named primitive as a tall swatch + its token name.
const chip = (token, label) => `
  <div style="display:flex;flex-direction:column;gap:8px">
    <div style="height:72px;border-radius:14px;background:var(${token});box-shadow:inset 0 0 0 1px rgba(128,128,128,.18)"></div>
    <div>
      <div style="font:600 12.5px/1.3 Poppins;color:var(--strong)">${label}</div>
      <code style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted)">${token}</code>
    </div>
  </div>`;

const grid = (...items) =>
  `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:18px;margin-bottom:40px">${items.join('')}</div>`;

// An 8-step hue ramp: one strip, light step numbers underneath.
const ramp = (hue, n = 8) => `
  <div style="margin-bottom:26px">
    <div style="font:600 12.5px/1 Poppins;color:var(--strong);text-transform:capitalize;margin-bottom:10px">${hue}</div>
    <div style="display:flex;border-radius:12px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(128,128,128,.18)">${
      Array.from({ length: n }, (_, i) => i + 1).map((s) => `
        <div style="flex:1;height:56px;background:var(--color-apliteni-${hue}-${s});display:flex;align-items:flex-end;justify-content:center;padding-bottom:5px">
          <span style="font:600 10px/1 var(--font-mono);color:rgba(0,0,0,.45)">${s}</span>
        </div>`).join('')
    }</div>
  </div>`;

const section = (inner) => `<section style="margin-bottom:16px">${inner}</section>`;

export const Palette = {
  name: 'Palette',
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:8px">Brand primitives</h1>
    <p style="color:var(--dim);max-width:64ch;margin-bottom:14px">The Apliteni umbrella-brand palette, synced from <code style="font-family:var(--font-mono);font-size:12px">apliteni/design-system</code> (<a href="https://style.apliteni.com" style="color:var(--accent)">style.apliteni.com</a>) into <code style="font-family:var(--font-mono);font-size:12px">brand.generated.css</code>. Edit these upstream, never here.</p>
    <p style="color:var(--dim);max-width:64ch;margin-bottom:40px">These are the brand <b style="color:var(--strong)">source of truth</b>. This kit's deck theme maps its own semantic tokens on top of them (see <b style="color:var(--strong)">Colors</b>) — where the two diverge is a deliberate product choice, not a bug.</p>

    <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:stretch;margin-bottom:44px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:16px">
      <div style="flex:1;min-width:200px">
        <div style="font:600 11px/1 Poppins;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Brand accent</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:11px;background:var(--color-apliteni-primary-violet);box-shadow:inset 0 0 0 1px rgba(128,128,128,.18)"></div>
          <div><div style="font:600 13px/1.3 Poppins;color:var(--strong)">#914dff</div><code style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted)">--color-apliteni-primary-violet</code></div>
        </div>
      </div>
      <div style="width:1px;background:var(--border)"></div>
      <div style="flex:1;min-width:200px">
        <div style="font:600 11px/1 Poppins;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Kit accent (deck)</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:11px;background:var(--accent);box-shadow:inset 0 0 0 1px rgba(128,128,128,.18)"></div>
          <div><div style="font:600 13px/1.3 Poppins;color:var(--strong)">var(--accent)</div><code style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted)">drifts — run npm run tokens:drift</code></div>
        </div>
      </div>
    </div>

    ${section(h3('Primary') + grid(
      chip('--color-apliteni-primary-violet', 'Violet'),
      chip('--color-apliteni-primary-black', 'Black'),
      chip('--color-apliteni-primary-white', 'White'),
    ))}

    ${section(h3('Supporting') + grid(
      chip('--color-apliteni-supporting-red', 'Red'),
      chip('--color-apliteni-supporting-orange', 'Orange'),
      chip('--color-apliteni-supporting-yellow', 'Yellow'),
      chip('--color-apliteni-supporting-green', 'Green'),
      chip('--color-apliteni-supporting-blue', 'Blue'),
      chip('--color-apliteni-supporting-pink', 'Pink'),
    ))}

    ${section(h3('Neutral ramp') + ramp('neutral', 9))}

    ${section(h3('Hue ramps') +
      ramp('violet') + ramp('red') + ramp('orange') + ramp('yellow') +
      ramp('green') + ramp('blue') + ramp('pink'))}
  `),
};
