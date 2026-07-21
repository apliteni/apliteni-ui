import { prism } from '../src/assets/brand.js';
import { icon } from '../src/assets/icons.js';
import pkg from '../package.json';

export default {
  title: 'Introduction',
  parameters: { layout: 'fullscreen', options: { showPanel: false } },
};

// A lively bento cell: gradient icon tile + title + copy + a LIVE demo built
// from real kit components (not a static swatch). Mirrors the ui.apli.tech
// "What's in the box" section so the workbench and the site tell one story.
const cell = (span, ic, t, d, demo, stack = false) => `
  <div class="ix-cell ${span}">
    <span class="ix-ico">${icon(ic)}</span>
    <h3>${t}</h3>
    <p>${d}</p>
    <div class="ix-demo${stack ? ' ix-demo--stack' : ''}">${demo}</div>
  </div>`;

export const Welcome = {
  render: () => `
  <style>
    .ix-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:16px; margin-bottom:46px; }
    .ix-cell { position:relative; background:var(--surface); border:1px solid var(--border); border-radius:18px;
      padding:24px; display:flex; flex-direction:column; gap:13px; overflow:hidden;
      transition:transform .2s var(--ease), background .2s var(--ease), border-color .2s var(--ease); }
    .ix-cell:hover { transform:translateY(-3px); background:var(--surface-2); border-color:var(--border-strong); }
    .ix-cell h3 { font:600 17px/1.2 Poppins; color:var(--strong); }
    .ix-cell p { font:400 14px/1.55 Poppins; color:var(--dim); }
    .ix-ico { width:40px; height:40px; border-radius:12px; display:grid; place-items:center; color:#fff;
      background:linear-gradient(135deg, var(--accent), var(--accent-strong));
      box-shadow:0 6px 16px color-mix(in srgb, var(--accent) 30%, transparent); }
    .ix-ico svg { width:21px; height:21px; }
    .ix-demo { margin-top:auto; padding-top:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .ix-demo--stack { display:block; }
    .ix-demo--stack > * + * { margin-top:12px; }
    .ix-demo .ui-table { font-size:13.5px; }
    .ix-demo .ui-table th, .ix-demo .ui-table td { padding-top:9px; padding-bottom:9px; }
    .ix-c6{grid-column:span 6}.ix-c3{grid-column:span 3}.ix-c2{grid-column:span 2}
    .ix-chip{display:inline-flex;align-items:center;gap:7px;font:400 12px Poppins;color:var(--dim)}
    .ix-dot{width:15px;height:15px;border-radius:50%;display:inline-block}
    .ix-radius{width:22px;height:15px;border-radius:6px;background:var(--surface-3);display:inline-block}
    .ix-aa{font:700 14px Poppins;color:var(--strong)}
    .ix-sw{width:22px;height:22px;border-radius:7px;display:inline-block;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
    @media (max-width:820px){ .ix-grid{grid-template-columns:repeat(2,1fr)} .ix-c6,.ix-c3,.ix-c2{grid-column:span 2} }
    @media (max-width:520px){ .ix-grid{grid-template-columns:1fr} .ix-c6,.ix-c3,.ix-c2{grid-column:auto} }
  </style>
  <div style="position:relative;min-height:100vh;overflow:hidden;padding:0 clamp(20px,5vw,72px)">
    <span class="ui-glow ui-glow--purple" style="top:-120px;left:8%"></span>
    <span class="ui-glow ui-glow--cyan" style="top:40px;right:-60px;width:340px;height:340px"></span>
    <div style="position:relative;z-index:1;max-width:980px;margin:0 auto;padding:72px 0 90px">
      <div style="display:inline-flex;align-items:center;gap:11px;margin-bottom:32px">
        ${prism('intro', 30)}
        <span style="font:600 21px/1 Poppins;letter-spacing:-.01em;color:var(--strong)">apliteni<span style="color:var(--accent)">·</span>ui</span>
      </div>
      <div style="display:inline-flex;align-items:center;gap:8px;font:500 12px Poppins;letter-spacing:.06em;color:var(--purple-mid);background:var(--glow-purple);border-radius:999px;padding:6px 14px;margin-bottom:24px;margin-left:8px">${icon('sparkle')} apliteni·ui · v${pkg.version}</div>
      <h1 style="font:700 clamp(38px,6vw,60px)/1.05 Poppins;letter-spacing:-.03em;color:var(--strong);margin-bottom:20px;max-width:16ch">The Apliteni design system</h1>
      <p style="font:400 clamp(16px,2vw,19px)/1.6 Poppins;color:var(--dim);max-width:62ch;margin-bottom:40px">
        One kit of UI for every Apliteni internal service — the strategy deck, the text portal, <code style="font-family:var(--font-mono);color:var(--text)">/account</code>, and whatever ships next.
        Framework-agnostic HTML&nbsp;+&nbsp;CSS, driven entirely by design tokens, themeable dark and light with accent sub-themes.
      </p>
      <div class="ix-grid">
        ${cell('ix-c3', 'layers', 'Tokens first', 'Colour, type, spacing, radius, elevation and motion as CSS variables. Change one — everything follows.', `
          <span class="ix-chip"><span class="ix-dot" style="background:var(--accent)"></span><span class="ix-dot" style="background:var(--green)"></span><span class="ix-dot" style="background:var(--cyan)"></span><span class="ix-dot" style="background:var(--pink)"></span></span>
          <span class="ix-chip"><span class="ix-radius"></span>radius</span>
          <span class="ix-chip"><span class="ix-aa">Aa</span>type</span>`)}
        ${cell('ix-c3', 'cube', 'Real components', 'Buttons, cards, inputs, tables, the topbar — the actual product vocabulary, not a swatch sheet.', `
          <button class="ui-btn ui-btn--primary ui-btn--sm">Primary</button>
          <button class="ui-btn ui-btn--secondary ui-btn--sm">Secondary</button>
          <button class="ui-btn ui-btn--ghost ui-btn--sm">Ghost</button>`)}
        ${cell('ix-c2', 'check', 'Every state designed', 'Hover, focus, disabled, busy, empty, error, success. No dead ends.', `
          <input class="ui-input" value="focus me" style="padding:9px 12px;font-size:13px">
          <div style="display:flex;gap:7px;flex-wrap:wrap"><span class="ui-badge ui-badge--live">Live</span><span class="ui-badge ui-badge--danger">Error</span></div>`, true)}
        ${cell('ix-c2', 'gear', 'Controls', "Segmented switches and toggles — the deck's pill controls.", `
          <div class="ui-seg ui-seg--sm"><button class="is-active">Deck</button><button>Text</button></div>
          <label class="ui-switch"><input type="checkbox" checked><span class="ui-switch__track"></span></label>`, true)}
        ${cell('ix-c2', 'sparkle', 'Accent sub-themes', 'Four ready-made accents — Nebula, Phoenix, Ocean, Emerald — on top of dark and light.', `
          <span class="ix-sw" style="background:linear-gradient(135deg,#9b5dff,#6a2dcc)"></span>
          <span class="ix-sw" style="background:linear-gradient(135deg,#ff8a5c,#ff6a3d)"></span>
          <span class="ix-sw" style="background:linear-gradient(135deg,#5ab0ff,#3b9dff)"></span>
          <span class="ix-sw" style="background:linear-gradient(135deg,#3ad9a0,#16c98a)"></span>`)}
        ${cell('ix-c6', 'plug', 'Drops into every surface', 'Same class names as the portal — drop the package in, delete the duplicated CSS.', `
          <table class="ui-table ui-table--hover">
            <thead><tr><th>Service</th><th>Status</th><th></th></tr></thead>
            <tbody>
              <tr><td class="ui-table__title">strategy-portal</td><td><span class="ui-badge ui-badge--live">Live</span></td><td class="ui-table__act"><button class="ui-btn ui-btn--ghost ui-btn--sm">Manage</button></td></tr>
              <tr><td class="ui-table__title">operating-model</td><td><span class="ui-badge ui-badge--soon">Soon</span></td><td class="ui-table__act"><button class="ui-btn ui-btn--ghost ui-btn--sm">Manage</button></td></tr>
              <tr class="is-dead"><td class="ui-table__title">legacy-admin</td><td><span class="ui-badge ui-badge--danger">Revoked</span></td><td class="ui-table__act"><button class="ui-btn ui-btn--ghost ui-btn--sm">Restore</button></td></tr>
            </tbody>
          </table>`, true)}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a href="/?path=/story/foundations-colors--semantic" style="text-decoration:none" class="ui-btn ui-btn--primary ui-btn--lg">Explore foundations ${icon('arrowRight')}</a>
        <a href="/?path=/story/apps-landing-page--default" style="text-decoration:none" class="ui-btn ui-btn--secondary ui-btn--lg">See the example apps</a>
      </div>
      <p style="margin-top:44px;font:400 13px Poppins;color:var(--muted)">Toggle the theme from the toolbar above — every story is built for both.</p>
    </div>
  </div>`,
};
