import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Backgrounds',
  parameters: { layout: 'fullscreen' },
};

const SURFACES = [
  ['--bg', 'Page', 'The base canvas behind everything.'],
  ['--bg-elevated', 'Elevated', 'Menus, toasts, popovers.'],
  ['--surface', 'Surface', 'Cards and panels.'],
  ['--surface-2', 'Inset', 'Inputs, code, sunken areas.'],
  ['--surface-3', 'Raised', 'Chips, tracks, the active pill.'],
];

const swatch = ([token, name, use]) => `
  <div style="display:flex;flex-direction:column;gap:11px">
    <div style="height:88px;background:var(${token});border-radius:14px;box-shadow:inset 0 0 0 1px var(--border)"></div>
    <div>
      <div style="font:600 13px/1 Poppins;color:var(--strong)">${name}</div>
      <code style="font-family:var(--font-mono);font-size:11px;color:var(--muted)">${token}</code>
      <div style="font:400 12px/1.45 Poppins;color:var(--muted);margin-top:5px">${use}</div>
    </div>
  </div>`;

const glowPanel = (label, glows) => `
  <div style="position:relative;height:190px;background:var(--bg);border-radius:16px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--border)">
    ${glows}
    <div style="position:relative;z-index:1;display:grid;place-items:center;height:100%;font:500 13px Poppins;color:var(--dim)">${label}</div>
  </div>`;

const bgPanel = (cls, name, desc) => `
  <div class="${cls}" style="height:190px;background:var(--bg);border-radius:16px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--border);display:grid;place-items:center;text-align:center;padding:18px">
    <div>
      <div style="font:600 14px/1 Poppins;color:var(--strong);margin-bottom:9px">${name}</div>
      <code style="font-family:var(--font-mono);font-size:11.5px;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);border-radius:6px;padding:4px 9px">.${cls}</code>
      <div style="font:400 12px/1.5 Poppins;color:var(--muted);margin-top:11px;max-width:32ch">${desc}</div>
    </div>
  </div>`;

const h3 = (t) => `<h3 style="font:600 13px/1 Poppins;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:52px 0 20px">${t}</h3>`;
const g = (min, ...items) => `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(${min},1fr));gap:22px">${items.join('')}</div>`;

export const Default = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Backgrounds</h1>
    <p style="color:var(--dim);max-width:60ch">Every backdrop in the kit — the flat surface layers, the signature ambient glow, and drop-in backdrop treatments. All read the accent tokens, so they re-theme with the sub-theme and hold up in dark and light.</p>

    ${h3('Surface layers')}
    ${g('180px', ...SURFACES.map(swatch))}

    ${h3('Ambient glow')}
    ${g('260px',
      glowPanel('Signature depth — purple + cyan', '<span class="ui-glow ui-glow--purple" style="top:-70px;left:16%"></span><span class="ui-glow ui-glow--cyan" style="bottom:-90px;right:6%;width:280px;height:280px"></span>'),
      glowPanel('.ui-glow--purple', '<span class="ui-glow ui-glow--purple" style="top:50%;left:50%;transform:translate(-50%,-50%)"></span>'),
      glowPanel('.ui-glow--cyan', '<span class="ui-glow ui-glow--cyan" style="top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:300px"></span>'),
      glowPanel('.ui-glow--green', '<span class="ui-glow ui-glow--green" style="top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:300px"></span>'),
    )}

    ${h3('Backdrop treatments')}
    ${g('260px',
      bgPanel('ui-bg-spotlight', 'Spotlight', 'A soft radial from the top. Auth cards and focused heroes.'),
      bgPanel('ui-bg-aurora', 'Aurora', 'Layered accent + cyan glows for a rich hero backdrop.'),
      bgPanel('ui-bg-wash', 'Accent wash', 'A gentle top-down tint in the current accent.'),
      bgPanel('ui-bg-grid', 'Grid', 'A faint token grid, masked to fade at the edges.'),
      bgPanel('ui-bg-dots', 'Dots', 'A subtle dot field for dashboards and technical surfaces.'),
    )}
  `),
};
