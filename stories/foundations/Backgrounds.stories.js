import { pad } from '../_gallery.js';
import { aurora, button, card } from '../../src/components/index.js';

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

const auroraPanel = (label, opts, note) => `
  <div style="position:relative;height:230px;background:var(--bg);border-radius:16px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--border)">
    ${aurora(opts)}
    <div style="position:relative;z-index:1;display:grid;place-items:center;height:100%;text-align:center;padding:18px">
      <div>
        <div style="font:600 14px/1 Poppins;color:var(--strong);margin-bottom:9px">${label}</div>
        <div style="font:400 12px/1.5 Poppins;color:var(--muted);max-width:30ch">${note}</div>
      </div>
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

    ${h3('Ambient aurora')}
    <p style="color:var(--dim);max-width:60ch;margin:-8px 0 20px">The kit's signature page background — layered blurred glow blobs plus an optional paper grain. Built from <code style="font-family:var(--font-mono);color:var(--accent)">aurora()</code>; colours default to the accent glow tokens, so the whole field re-themes with the sub-theme. Drift respects <code style="font-family:var(--font-mono)">prefers-reduced-motion</code>. See <b>Aurora (full-bleed)</b> for the fixed page treatment.</p>
    ${g('280px',
      auroraPanel('Default', {}, 'Three drifting blobs, accent + teal + warm.'),
      auroraPanel('With grain', { grain: true }, 'Adds the fractal-noise veil for tooth and depth.'),
      auroraPanel('Static', { animated: false }, 'Drift off — for dense screens or when motion distracts.'),
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

// ---------------------------------------------------------------------------
// Full-bleed stories — one per background, so each can be judged at real scale
// with the sub-theme + light/dark toggles applying live. They all share the
// same wrapper trick the Aurora story pioneered: a *relative* 100vh wrapper
// with overflow hidden. A fixed; z-index:-1 background would get trapped behind
// Storybook's opaque #storybook-root, so the layer is rendered in-flow instead.
// Decorative layers are aria-hidden (the ui-bg-* treatments paint via ::before,
// which is already out of the a11y tree; explicit glow spans get the attribute).
// ---------------------------------------------------------------------------

// Sample content overlaid on every full-bleed background, so contrast and
// legibility over the field are visible. bgClass drives the ui-bg-* ::before
// treatments; layer injects explicit background markup (e.g. glow spans).
const fullBleed = ({ bgClass = '', layer = '', eyebrow, title, body }) => `
  <div class="${bgClass}" style="position:relative;min-height:100vh;overflow:hidden;background:var(--bg)">
    ${layer}
    <div style="position:relative;z-index:1;min-height:100vh;display:grid;place-items:center;padding:40px">
      <div style="max-width:46ch;text-align:center">
        <div class="ui-eyebrow" style="justify-content:center;margin-bottom:14px">${eyebrow}</div>
        <h1 style="font:700 clamp(30px,5vw,50px)/1.05 Poppins;color:var(--strong);letter-spacing:-.025em;margin-bottom:16px">${title}</h1>
        <p style="font:400 16px/1.6 Poppins;color:var(--dim);margin-bottom:28px">${body}</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:32px">
          ${button({ label: 'Get started', variant: 'primary' })}
          ${button({ label: 'View tokens', variant: 'secondary' })}
        </div>
        <div style="max-width:340px;margin:0 auto;text-align:left">
          ${card({ title: 'Legible on top', sub: 'A card keeps its own surface', body: '<p style="color:var(--dim);font:400 13px/1.5 Poppins;margin:0">Real content sits above the field with a normal stacking context — the backdrop never fights the copy.</p>' })}
        </div>
      </div>
    </div>
  </div>`;

// Wrap decorative glow spans so the whole layer is hidden from assistive tech.
const glowLayer = (...spans) =>
  `<div aria-hidden="true" style="position:absolute;inset:0;pointer-events:none">${spans.join('')}</div>`;

// Full-bleed hero — the aurora as a real page background (grain on), with
// content sitting on top. This is how an app drops it in: one call, no tokens.
// (Rendered here with the absolute variant so it shows inside Storybook's frame;
// in a real page use fixed: true to pin it to the viewport across scroll.)
export const Aurora = {
  name: 'Aurora (full-bleed)',
  render: () => `
    <div style="position:relative;min-height:100vh;overflow:hidden">
      ${aurora({ grain: true })}
      <div style="position:relative;z-index:1;min-height:100vh;display:grid;place-items:center;padding:40px;text-align:center">
        <div style="max-width:44ch">
          <div class="ui-eyebrow" style="justify-content:center;margin-bottom:14px">Ambient background</div>
          <h1 style="font:700 clamp(30px,5vw,50px)/1.05 Poppins;color:var(--strong);letter-spacing:-.025em;margin-bottom:16px">One warm identity, for free</h1>
          <p style="font:400 16px/1.6 Poppins;color:var(--dim);margin-bottom:28px">Drop <code style="font-family:var(--font-mono);color:var(--accent)">aurora({ grain: true, fixed: true })</code> behind your page and every app in the family reads as one product — no hand-rolled tokens or CSS. Flip the <b>Accent</b> and <b>Theme</b> toolbars to watch it re-theme.</p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            ${button({ label: 'Get started', variant: 'primary' })}
            ${button({ label: 'View tokens', variant: 'secondary' })}
          </div>
        </div>
      </div>
    </div>`,
};

// Ambient glow — the signature blurred "depth" blobs (purple + cyan) at page
// scale. Positioned off the corners so the field feels lit from within.
export const Glow = {
  name: 'Glow (full-bleed)',
  render: () =>
    fullBleed({
      layer: glowLayer(
        '<span class="ui-glow ui-glow--purple" style="top:-140px;left:8%;width:560px;height:560px"></span>',
        '<span class="ui-glow ui-glow--cyan" style="bottom:-180px;right:4%;width:520px;height:520px"></span>',
      ),
      eyebrow: 'Ambient glow',
      title: 'Depth without a photo',
      body: 'Two blurred <code style="font-family:var(--font-mono);color:var(--accent)">.ui-glow</code> blobs light the page from the corners. They read the accent glow tokens, so the whole field re-themes with the sub-theme and holds in dark and light.',
    }),
};

// Spotlight — a soft radial from the top-centre. Auth cards, focused heroes.
export const Spotlight = {
  name: 'Spotlight (full-bleed)',
  render: () =>
    fullBleed({
      bgClass: 'ui-bg-spotlight',
      eyebrow: 'Backdrop — Spotlight',
      title: 'Eyes to the centre',
      body: 'One soft radial from the top pulls focus to the middle of the page. <code style="font-family:var(--font-mono);color:var(--accent)">.ui-bg-spotlight</code> is the go-to backdrop for sign-in cards and single-focus heroes.',
    }),
};

// Aurora backdrop — the CSS-only layered accent + cyan glows (no motion).
export const AuroraBackdrop = {
  name: 'Aurora backdrop (full-bleed)',
  render: () =>
    fullBleed({
      bgClass: 'ui-bg-aurora',
      eyebrow: 'Backdrop — Aurora',
      title: 'A richer hero glow',
      body: 'Layered accent + cyan radials give a rich, static hero backdrop with no markup and no motion. <code style="font-family:var(--font-mono);color:var(--accent)">.ui-bg-aurora</code> is the drop-in cousin of the animated <code style="font-family:var(--font-mono)">aurora()</code> field.',
    }),
};

// Accent wash — a gentle top-down tint in the current accent.
export const Wash = {
  name: 'Accent wash (full-bleed)',
  render: () =>
    fullBleed({
      bgClass: 'ui-bg-wash',
      eyebrow: 'Backdrop — Accent wash',
      title: 'A quiet tint from the top',
      body: 'A gentle top-down gradient in the current accent, fading to the page by mid-fold. <code style="font-family:var(--font-mono);color:var(--accent)">.ui-bg-wash</code> warms a section without ever competing with the content.',
    }),
};

// Grid — a faint token-coloured grid, masked to fade at the edges.
export const Grid = {
  name: 'Grid (full-bleed)',
  render: () =>
    fullBleed({
      bgClass: 'ui-bg-grid',
      eyebrow: 'Backdrop — Grid',
      title: 'Structure, barely there',
      body: 'A faint token-coloured grid, radially masked so it fades out at the edges. <code style="font-family:var(--font-mono);color:var(--accent)">.ui-bg-grid</code> adds a technical, blueprint feel to dashboards and docs.',
    }),
};

// Dots — a subtle dot field for dashboards / technical surfaces.
export const Dots = {
  name: 'Dots (full-bleed)',
  render: () =>
    fullBleed({
      bgClass: 'ui-bg-dots',
      eyebrow: 'Backdrop — Dots',
      title: 'A technical hum',
      body: 'A subtle dot field, masked to fade at the edges. <code style="font-family:var(--font-mono);color:var(--accent)">.ui-bg-dots</code> is the quieter sibling of the grid — great behind dense dashboards and data tables.',
    }),
};
