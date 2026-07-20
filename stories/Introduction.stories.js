import { brand } from '../src/assets/brand.js';
import { icon } from '../src/assets/icons.js';

export default {
  title: 'Introduction',
  parameters: { layout: 'fullscreen', options: { showPanel: false } },
};

const feature = (ic, t, d) => `
  <div style="background:var(--surface);border-radius:16px;padding:22px">
    <span style="display:grid;place-items:center;width:40px;height:40px;border-radius:11px;background:var(--glow-purple);color:var(--accent);margin-bottom:14px">${icon(ic)}</span>
    <div style="font:600 16px/1.2 Poppins;color:var(--strong);margin-bottom:6px">${t}</div>
    <div style="font:400 14px/1.55 Poppins;color:var(--dim)">${d}</div>
  </div>`;

export const Welcome = {
  render: () => `
  <div style="position:relative;min-height:100vh;overflow:hidden;padding:0 clamp(20px,5vw,72px)">
    <span class="ui-glow ui-glow--purple" style="top:-120px;left:8%"></span>
    <span class="ui-glow ui-glow--cyan" style="top:40px;right:-60px;width:340px;height:340px"></span>
    <div style="position:relative;z-index:1;max-width:900px;margin:0 auto;padding:72px 0 90px">
      <div style="margin-bottom:34px">${brand({ p: 'intro', word: 'UI', size: 26 })}</div>
      <div style="display:inline-flex;align-items:center;gap:8px;font:500 12px Poppins;letter-spacing:.06em;color:var(--purple-mid);background:var(--glow-purple);border-radius:999px;padding:6px 14px;margin-bottom:24px">${icon('sparkle')} apliteni-ui · v0.1</div>
      <h1 style="font:700 clamp(38px,6vw,60px)/1.05 Poppins;letter-spacing:-.03em;color:var(--strong);margin-bottom:20px;max-width:16ch">The Apliteni design system</h1>
      <p style="font:400 clamp(16px,2vw,19px)/1.6 Poppins;color:var(--dim);max-width:60ch;margin-bottom:40px">
        One source of UI for every product — the deck, the text portal, <code style="font-family:var(--font-mono);color:var(--text)">/account</code>, and whatever ships next.
        Framework-agnostic HTML + CSS, driven entirely by design tokens, themeable dark and light. Extracted from <code style="font-family:var(--font-mono);color:var(--text)">viz/</code> so there's exactly one place a colour, radius, or component lives.
      </p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;margin-bottom:46px">
        ${feature('layers', 'Tokens first', 'Colours, type, spacing, radius, elevation and motion as CSS variables. Change once, everything follows.')}
        ${feature('cube', 'Real components', 'Buttons, cards, segmented controls, inputs, tables, the topbar — the actual deck vocabulary.')}
        ${feature('globe', 'Every state designed', 'Hover, focus, disabled, busy, empty, error, success. No dead ends.')}
        ${feature('bolt', 'Adopts into viz', 'Same class names as the portal — drop the package in, delete the duplicated CSS.')}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a href="/?path=/story/foundations-colors--semantic" style="text-decoration:none" class="ui-btn ui-btn--primary ui-btn--lg">Explore foundations ${icon('arrowRight')}</a>
        <a href="/?path=/story/apps-landing-page--default" style="text-decoration:none" class="ui-btn ui-btn--secondary ui-btn--lg">See the example apps</a>
      </div>
      <p style="margin-top:44px;font:400 13px Poppins;color:var(--muted)">Toggle the theme from the toolbar above — every story is built for both.</p>
    </div>
  </div>`,
};
