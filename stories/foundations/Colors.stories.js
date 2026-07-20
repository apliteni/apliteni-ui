import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Colors',
  parameters: { layout: 'fullscreen' },
};

const swatch = (name, note = '') => `
  <div style="display:flex;flex-direction:column;gap:8px">
    <div style="height:72px;border-radius:14px;background:var(${name});box-shadow:inset 0 0 0 1px rgba(128,128,128,.16)"></div>
    <div>
      <div style="font:600 12.5px/1.3 Poppins;color:var(--strong)">${name}</div>
      ${note ? `<div style="font:400 11.5px/1.4 Poppins;color:var(--muted)">${note}</div>` : ''}
    </div>
  </div>`;

const group = (title, ...items) => `
  <section style="margin-bottom:40px">
    <h3 style="font:600 13px/1 Poppins;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:18px">${title}</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:20px">${items.join('')}</div>
  </section>`;

export const Semantic = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:8px">Semantic colours</h1>
    <p style="color:var(--dim);margin-bottom:36px;max-width:60ch">Every component references these tokens — switch the theme (top toolbar) and watch them all follow. Raw hues live in the brand ramp; components never touch them directly.</p>
    ${group('Brand & accent',
      swatch('--accent', 'primary action, focus'),
      swatch('--purple', 'brand purple'),
      swatch('--purple-light', 'accent light'),
      swatch('--purple-mid', 'accent mid'),
    )}
    ${group('Signal',
      swatch('--green', 'live / success'),
      swatch('--cyan', 'link / flag'),
      swatch('--amber', 'warning'),
      swatch('--pink', 'danger / revoke'),
    )}
    ${group('Surfaces',
      swatch('--bg', 'page background'),
      swatch('--bg-elevated', 'raised surface'),
      swatch('--surface', 'card'),
      swatch('--surface-2', 'inset / input'),
      swatch('--surface-3', 'track'),
      swatch('--border', 'hairline'),
    )}
    ${group('Text',
      swatch('--strong', 'headings'),
      swatch('--text', 'body'),
      swatch('--dim', 'secondary'),
      swatch('--muted', 'tertiary / captions'),
    )}
    ${group('Glows (tints)',
      swatch('--glow-purple'),
      swatch('--glow-green'),
      swatch('--glow-cyan'),
      swatch('--glow-pink'),
    )}
  `),
};
