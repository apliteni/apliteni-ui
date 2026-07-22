import { topbar } from '../../src/components/topbar.js';
import { footer } from '../../src/components/footer.js';
import { button, icon, badge } from '../../src/components/index.js';

export default {
  title: 'Apps/Landing Page',
  parameters: { layout: 'fullscreen' },
};

const VERSIONS = [
  { label: 'phoenix.2026.002', meta: 'Product units, animated deck', badge: 'live' },
  { label: 'phoenix.2026.001', meta: 'Phoenix, 2026-05-17', badge: 'archive' },
];

// Lively feature cell: gradient icon tile + title + copy + a LIVE micro-demo
// built from real kit components, so each value prop shows the thing it claims.
const cell = (ic, t, d, demo) => `
  <div class="lx-cell">
    <span class="lx-ico">${icon(ic)}</span>
    <h3>${t}</h3>
    <p>${d}</p>
    <div class="lx-demo">${demo}</div>
  </div>`;

export const Default = {
  render: () => `
  <style>
    .lx-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    .lx-cell { position:relative; background:var(--surface); border:1px solid var(--border); border-radius:18px;
      padding:24px; display:flex; flex-direction:column; gap:12px; overflow:hidden;
      transition:transform .2s var(--ease), background .2s var(--ease), border-color .2s var(--ease); }
    .lx-cell:hover { transform:translateY(-3px); background:var(--surface-2); border-color:var(--border-strong); }
    .lx-cell h3 { font:600 17px/1.2 Poppins; color:var(--strong); }
    .lx-cell p { font:400 14px/1.55 Poppins; color:var(--dim); }
    .lx-ico { width:40px; height:40px; border-radius:12px; display:grid; place-items:center; color:#fff;
      background:linear-gradient(135deg, var(--accent), var(--accent-strong));
      box-shadow:0 6px 16px color-mix(in srgb, var(--accent) 30%, transparent); }
    .lx-ico svg { width:21px; height:21px; }
    .lx-demo { margin-top:auto; padding-top:8px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .lx-mono { font:500 12px/1 var(--font-mono); color:var(--accent);
      background:color-mix(in srgb, var(--accent) 12%, transparent); border-radius:7px; padding:6px 10px; }
    @media (max-width:820px){ .lx-grid{grid-template-columns:repeat(2,1fr)} }
    @media (max-width:520px){ .lx-grid{grid-template-columns:1fr} }
  </style>
  <div style="position:relative;overflow:hidden;min-height:100vh">
    <span class="ui-glow ui-glow--purple" style="top:-140px;left:12%"></span>
    <span class="ui-glow ui-glow--cyan" style="top:120px;right:-40px;width:360px;height:360px"></span>

    ${topbar({ word: 'Strategy', view: 'deck', versions: VERSIONS })}

    <section class="ui-hero">
      <span class="ui-hero__eyebrow">phoenix.2026.002 ${badge('Live', 'live')}</span>
      <h1 class="ui-hero__title">One strategy, <span class="grad">many agents</span></h1>
      <p class="ui-hero__sub">The Apliteni strategy — as an animated deck, a readable long-form, and a live surface your agents can read over MCP. Always one source of truth.</p>
      <div class="ui-hero__cta">
        ${button({ label: 'Open the deck', variant: 'primary', size: 'lg', icon: 'layers' })}
        ${button({ label: 'Read the text version', variant: 'secondary', size: 'lg', iconRight: 'arrowRight' })}
      </div>
    </section>

    <section style="max-width:1080px;margin:0 auto;padding:20px 26px 90px;position:relative;z-index:1">
      <div class="ui-section-head" style="margin-bottom:44px">
        <h2>Built for people and agents alike</h2>
        <p>Everything below is composed from the same apliteni-ui components.</p>
      </div>
      <div class="lx-grid">
        ${cell('compass', 'Clear direction', 'Product units, superconnectors, governance — the whole model in one navigable place.',
          `<span class="ui-badge ui-badge--info">Units</span><span class="ui-badge ui-badge--info">Connectors</span><span class="ui-badge ui-badge--info">Governance</span>`)}
        ${cell('plug', 'Agent-ready', 'Connect any agent over MCP with a scoped, revocable token. Read the strategy programmatically.',
          `<code class="lx-mono">mcp connect --scope read</code>`)}
        ${cell('shield', 'Access you control', 'Consent screens, per-agent tokens, one-click revoke. You always see who can read what.',
          `<span class="ui-badge ui-badge--live">Read-only</span>${button({ label: 'Revoke', variant: 'danger', size: 'sm' })}`)}
        ${cell('layers', 'Deck or text', 'The same content as an animated deck or a calm long-form. Switch anytime.',
          `<div class="ui-seg ui-seg--sm"><button class="is-active">Deck</button><button>Text</button></div>`)}
        ${cell('globe', 'English & Russian', 'The whole surface localises, so the team reads it in the language they think in.',
          `<div class="ui-seg ui-seg--sm"><button class="is-active">EN</button><button>RU</button></div>`)}
        ${cell('bolt', 'Always current', 'Versioned cleanly — the live version is at the root, archives keep their own path.',
          `<span class="ui-badge ui-badge--soon">phoenix.2026.002</span>${badge('Live', 'live')}`)}
      </div>
    </section>

    <section style="max-width:900px;margin:0 auto 100px;padding:0 26px;position:relative;z-index:1">
      <div class="ui-card ui-card--accent ui-card--pad-lg" style="text-align:center">
        <div style="margin:0 auto 10px;display:inline-flex">${badge('For agents', 'soon')}</div>
        <h2 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:12px">Give your agent the strategy</h2>
        <p style="color:var(--dim);font-size:16px;max-width:48ch;margin:0 auto 26px;line-height:1.6">One command connects an agent over MCP. Scoped to read-only, revocable anytime from your account.</p>
        <div style="display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center">
          ${button({ label: 'Connect an agent', variant: 'primary', size: 'lg', icon: 'plug' })}
          ${button({ label: 'View the docs', variant: 'ghost', size: 'lg' })}
        </div>
      </div>
    </section>

    ${footer({
      variant: 'full',
      brand: { word: 'Strategy' },
      tagline: 'One strategy — an animated deck, a readable long-form, and a live surface your agents can read over MCP.',
      columns: [
        { title: 'Strategy', links: [
          { label: 'Deck', href: '#deck' }, { label: 'Text version', href: '#text' },
          { label: 'Agents', href: '#agents' },
        ] },
        { title: 'Developers', links: [
          { label: 'Connect over MCP', href: '#mcp' },
          { label: 'GitHub', href: 'https://github.com/apliteni/apliteni-ui', target: '_blank' },
        ] },
      ],
      social: [
        { label: 'GitHub', href: 'https://github.com/apliteni/apliteni-ui', icon: 'github' },
        { label: 'Email', href: 'mailto:hi@apliteni.com', icon: 'mail' },
      ],
      legal: '© Apliteni Strategy',
      legalLinks: [{ label: 'Privacy', href: '#privacy' }, { label: 'Terms', href: '#terms' }],
    })}
  </div>`,
};
