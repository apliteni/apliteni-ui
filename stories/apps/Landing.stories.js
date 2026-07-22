import { button, icon, snippet } from '../../src/components/index.js';
import { prism } from '../../src/assets/brand.js';
import { iconNames } from '../../src/assets/icons.js';

// The apliteni-ui landing — a design-system docs-home. Ported from the original
// style.apliteni.com page (that repo slimmed to a lean token reference, so this
// showcase design moved here). Sidebar + hero + stat cards + a "browse the
// system" bento + copyable snippets, built from the kit's own tokens/components.

export default {
  title: 'Apps/Landing Page',
  parameters: { layout: 'fullscreen' },
};

// Sidebar section: a header that links to the first story in that Storybook group.
const navGroup = (label, href, items) => `
  <a class="lp-navh" href="${href}" target="_top">
    <span>${label}</span>${icon('arrowRight')}
  </a>
  ${items ? `<div class="lp-navsub">${items.map((i) => `<span>${i}</span>`).join('')}</div>` : ''}`;

// A stat card: big number + label + sub.
const stat = (n, label, sub) => `
  <div class="lp-stat">
    <div class="lp-stat__n">${n}</div>
    <div class="lp-stat__l">${label}</div>
    <div class="lp-stat__s">${sub}</div>
  </div>`;

// A bento tile linking into the system.
const tile = (ic, title, desc, href) => `
  <a class="lp-tile" href="${href}" target="_top">
    <span class="lp-tile__ico">${icon(ic)}</span>
    <h3>${title}</h3>
    <p>${desc}</p>
  </a>`;

const S = (path) => `?path=/story/${path}`; // Storybook story link

export const Default = {
  name: 'Landing Page',
  render: () => `
  <style>
    .lp { display:grid; grid-template-columns:248px 1fr; min-height:100vh; background:var(--bg); color:var(--text);
      font-family:var(--font-sans); }
    .lp a { text-decoration:none; color:inherit; }

    /* ---- sidebar ---- */
    .lp-side { border-right:1px solid var(--border); background:var(--bg-elevated); padding:22px 16px;
      display:flex; flex-direction:column; gap:20px; position:sticky; top:0; height:100vh; }
    .lp-brand { display:flex; align-items:center; gap:10px; font-weight:650; color:var(--strong);
      letter-spacing:-.01em; padding:2px 6px; }
    .lp-search { display:flex; align-items:center; gap:8px; background:var(--surface-2); border:1px solid var(--border);
      border-radius:var(--radius-sm); padding:8px 11px; color:var(--muted); font-size:13px; }
    .lp-search svg { width:15px; height:15px; }
    .lp-nav { display:flex; flex-direction:column; gap:2px; }
    .lp-navh { display:flex; align-items:center; justify-content:space-between; padding:9px 10px; border-radius:var(--radius-sm);
      font:600 11px/1 var(--font-sans); letter-spacing:.09em; text-transform:uppercase; color:var(--muted);
      transition:background .15s var(--ease), color .15s var(--ease); }
    .lp-navh svg { width:13px; height:13px; opacity:.5; }
    .lp-navh:hover { background:var(--surface); color:var(--text); }
    .lp-navsub { display:flex; flex-wrap:wrap; gap:5px; padding:2px 10px 8px; }
    .lp-navsub span { font-size:11.5px; color:var(--dim); }
    .lp-navsub span::after { content:''; width:3px; height:3px; border-radius:50%; background:var(--border-strong);
      display:inline-block; vertical-align:middle; margin-left:6px; }
    .lp-navsub span:last-child::after { display:none; }
    .lp-side__foot { margin-top:auto; display:flex; align-items:center; gap:8px; padding:10px;
      border-top:1px solid var(--border); color:var(--muted); font-size:12.5px; }
    .lp-side__foot svg { width:15px; height:15px; }

    /* ---- main ---- */
    .lp-main { padding:56px clamp(24px,5vw,72px) 72px; max-width:1080px; }
    .lp-eyebrow { display:inline-flex; align-items:center; gap:7px; font:600 11px/1 var(--font-sans); letter-spacing:.12em;
      text-transform:uppercase; color:var(--accent); background:color-mix(in srgb, var(--accent) 12%, transparent);
      border:1px solid color-mix(in srgb, var(--accent) 30%, transparent); padding:6px 12px; border-radius:999px; margin-bottom:22px; }
    .lp-eyebrow svg { width:13px; height:13px; }
    .lp-hero h1 { font:700 clamp(38px,6vw,60px)/1.02 var(--font-sans); letter-spacing:-.035em; color:var(--strong);
      margin:0 0 18px; text-wrap:balance; }
    .lp-hero p { font-size:clamp(15px,1.6vw,18px); color:var(--dim); max-width:52ch; margin:0 0 28px; line-height:1.55; }
    .lp-cta { display:flex; gap:12px; flex-wrap:wrap; }

    .lp-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:48px 0; }
    .lp-stat { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px 22px; }
    .lp-stat__n { font:700 34px/1 var(--font-sans); letter-spacing:-.02em; color:var(--strong);
      font-variant-numeric:tabular-nums; }
    .lp-stat__l { font-weight:600; font-size:13.5px; color:var(--text); margin-top:8px; }
    .lp-stat__s { font-size:12px; color:var(--muted); margin-top:2px; }

    .lp-h2 { font:600 12px/1 var(--font-sans); letter-spacing:.13em; text-transform:uppercase; color:var(--muted);
      margin:0 0 22px; }
    .lp-bento { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
    .lp-tile { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:22px;
      display:flex; flex-direction:column; gap:9px; transition:transform .18s var(--ease), border-color .18s var(--ease),
      background .18s var(--ease); }
    .lp-tile:hover { transform:translateY(-3px); border-color:var(--border-strong); background:var(--bg-elevated); }
    .lp-tile__ico { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px;
      border-radius:11px; background:color-mix(in srgb, var(--accent) 14%, transparent); color:var(--accent); margin-bottom:4px; }
    .lp-tile__ico svg { width:19px; height:19px; }
    .lp-tile h3 { font-size:15px; color:var(--strong); margin:0; letter-spacing:-.01em; }
    .lp-tile p { font-size:12.5px; color:var(--muted); margin:0; line-height:1.5; }

    .lp-snips { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:56px; align-items:start; }
    .lp-snips h3 { grid-column:1/-1; font:600 12px/1 var(--font-sans); letter-spacing:.13em; text-transform:uppercase;
      color:var(--muted); margin:0 0 -6px; }
    .lp-foot { margin-top:56px; padding-top:24px; border-top:1px solid var(--border); color:var(--muted);
      font-size:12.5px; }

    @media (max-width:880px){ .lp { grid-template-columns:1fr; } .lp-side { display:none; }
      .lp-stats,.lp-bento,.lp-snips { grid-template-columns:1fr 1fr; } }
    @media (max-width:560px){ .lp-stats,.lp-bento,.lp-snips { grid-template-columns:1fr; } }
  </style>

  <div class="lp">
    <aside class="lp-side">
      <div class="lp-brand">${prism('lpb', 24)}<span>apliteni-ui</span></div>
      <div class="lp-search">${icon('search')}<span>Search the kit…</span></div>
      <nav class="lp-nav">
        ${navGroup('Foundations', S('foundations-colors--semantic'), ['Colour', 'Type', 'Spacing', 'Elevation'])}
        ${navGroup('Components', S('components-button--playground'), ['Button', 'Card', 'Nav', 'Table'])}
        ${navGroup('Brand', S('foundations-brand-primitives--palette'), ['Primitives', 'Marks'])}
        ${navGroup('Motion & Effects', S('foundations-backgrounds--aurora'), ['Backgrounds', 'Aurora'])}
        ${navGroup('Screens', S('apps-landing-page--landing-page'), ['Landing', 'Sign in', 'Consent'])}
        ${navGroup('Developer', S('foundations-brand-primitives--palette'), ['Tokens', 'npm'])}
      </nav>
      <div class="lp-side__foot">${icon('eye')}<span>Dark &amp; light, 4 accents</span></div>
    </aside>

    <main class="lp-main">
      <span class="lp-eyebrow">${icon('sparkle')} apliteni-ui / design system</span>
      <div class="lp-hero">
        <h1>One source of truth.</h1>
        <p>Tokens, components and patterns that keep every Apliteni product — ads, analytics, internal
          tools — visually consistent and fast to build. Framework-agnostic HTML + CSS that re-themes instantly.</p>
        <div class="lp-cta">
          ${button({ label: 'Explore the palette', variant: 'primary', icon: 'arrowRight', iconRight: true, href: S('foundations-colors--semantic') })}
          ${button({ label: 'Brand primitives', variant: 'secondary', href: S('foundations-brand-primitives--palette') })}
        </div>
      </div>

      <div class="lp-stats">
        ${stat('108', 'Brand tokens', 'colour + motion, synced')}
        ${stat('20+', 'Components', 'buttons → drawers')}
        ${stat(String(iconNames.length), 'Icons', 'stroke, 24×24')}
        ${stat('4', 'Sub-themes', 'Nebula → Emerald')}
      </div>

      <h2 class="lp-h2">Browse the system</h2>
      <div class="lp-bento">
        ${tile('sparkle', 'Colour', 'Semantic theme tokens over the brand palette', S('foundations-colors--semantic'))}
        ${tile('eye', 'Themes', 'Dark &amp; light via data-theme, four accents', S('foundations-sub-themes--gallery'))}
        ${tile('doc', 'Typography', 'Poppins scale, line-height, letter-spacing', S('foundations-typography--scale'))}
        ${tile('layers', 'Components', 'Buttons, inputs, cards, nav, drawers, tables', S('components-button--playground'))}
        ${tile('cube', 'Icons', `${iconNames.length} stroke icons, SVG, copyable`, S('foundations-iconography--gallery'))}
        ${tile('bolt', 'Motion', 'Duration scale &amp; easing curves', S('foundations-backgrounds--aurora'))}
        ${tile('globe', 'Effects', 'Gradients, glow, aurora, glass', S('foundations-backgrounds--aurora'))}
        ${tile('chart', 'Screens', 'Landing, sign-in, consent — dark &amp; light', S('apps-sign-in-oauth2--default'))}
        ${tile('compass', 'Layout', 'Spacing, radius, breakpoints', S('foundations-spacing-radius--scale'))}
        ${tile('shield', 'Accessibility', 'WCAG-checked pairs, axe-gated in CI', S('foundations-colors--semantic'))}
        ${tile('plug', 'Brand', 'Umbrella marks + primitives, synced upstream', S('foundations-brand--umbrella-synced'))}
      </div>

      <div class="lp-snips">
        <h3>Grab and go</h3>
        ${snippet({ label: 'tokens.css', code: '.card {\n  background: var(--surface);\n  border: 1px solid var(--border);\n  color: var(--text);\n}' })}
        ${snippet({ label: 'theme', code: '<html data-theme="dark"\n      data-accent="phoenix">\n\n<!-- flip to light: -->\n<html data-theme="light">' })}
        ${snippet({ label: 'npm', code: "import '@apliteni/apliteni-ui/css';\n\n// or the inline strings:\nimport { cssText }\n  from '@apliteni/apliteni-ui/inline';" })}
      </div>

      <div class="lp-foot">apliteni-ui — framework-agnostic design system — live at ui.apli.tech</div>
    </main>
  </div>`,
};
