import { topbar } from '../../src/components/topbar.js';
import { button, icon, badge } from '../../src/components/index.js';

export default {
  title: 'Apps/Landing Page',
  parameters: { layout: 'fullscreen' },
};

const VERSIONS = [
  { label: 'phoenix.2026.002', meta: 'Product units · animated deck', badge: 'live' },
  { label: 'phoenix.2026.001', meta: 'Phoenix · 2026-05-17', badge: 'archive' },
];

const feature = (ic, t, d) => `
  <div class="ui-feature">
    <span class="ui-feature__icon">${icon(ic)}</span>
    <h3>${t}</h3><p>${d}</p>
  </div>`;

export const Default = {
  render: () => `
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
        <p>Everything below is composed from the same aplitech-ui components.</p>
      </div>
      <div class="ui-features">
        ${feature('compass', 'Clear direction', 'Product units, superconnectors, governance — the whole model in one navigable place.')}
        ${feature('plug', 'Agent-ready', 'Connect any agent over MCP with a scoped, revocable token. Read the strategy programmatically.')}
        ${feature('shield', 'Access you control', 'Consent screens, per-agent tokens, one-click revoke. You always see who can read what.')}
        ${feature('layers', 'Deck or text', 'The same content as an animated deck or a calm long-form. Switch anytime.')}
        ${feature('globe', 'English & Russian', 'The whole surface localises, so the team reads it in the language they think in.')}
        ${feature('bolt', 'Always current', 'Versioned cleanly — the live version is at the root, archives keep their own path.')}
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

    <footer style="border-top:1px solid var(--border);padding:34px 26px;position:relative;z-index:1">
      <div style="max-width:1080px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;color:var(--muted);font-size:13px">
        <span>© Apliteni · Strategy</span>
        <span style="display:flex;gap:22px">
          <a href="#" style="color:var(--muted)">Deck</a>
          <a href="#" style="color:var(--muted)">Text</a>
          <a href="#" style="color:var(--muted)">Agents</a>
        </span>
      </div>
    </footer>
  </div>`,
};
