import { topbar } from '../../src/components/topbar.js';
import { footer } from '../../src/components/footer.js';
import { button, icon, badge } from '../../src/components/index.js';
import { tabs } from '../../src/components/tabs.js';

export default {
  title: 'Apps/Landing Page',
  parameters: { layout: 'fullscreen' },
};

const VERSIONS = [
  { label: 'phoenix.2026.002', meta: 'Product units, animated deck', badge: 'live' },
  { label: 'phoenix.2026.001', meta: 'Phoenix, 2026-05-17', badge: 'archive' },
];

// Feature cell: a static, hue-tinted icon tile + title + copy + a LIVE micro-demo
// built from real kit components, so each value prop shows the thing it claims.
// No card-level hover — the only interactive things are the real controls in the
// demo. Each cell owns a hue (tinted tile + a hairline top edge) so the six read
// as distinct; the bento layout gives them different footprints on top of that.
// Micro-demo for a cell whose control genuinely switches what is shown. Wrapped
// full-width because the demo slot is a flex row and a tab strip plus its panel
// is a block.
const demoTabs = (name, ariaLabel, items) =>
  `<div style="width:100%">${tabs({ name, ariaLabel, active: 0, items })}</div>`;

const demoBlurb = (t) => `<p style="color:var(--dim);font:400 13px/1.6 Poppins;margin:0">${t}</p>`;

const cell = (ic, hue, t, d, demo) => `
  <div class="lx-cell" style="--lx-hue:${hue}">
    <span class="lx-ico">${icon(ic)}</span>
    <h3>${t}</h3>
    <p>${d}</p>
    <div class="lx-demo">${demo}</div>
  </div>`;

export const Default = {
  render: () => `
  <style>
    .lx-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px;
      grid-template-areas:"agent agent access" "clear deck access" "lang cur cur"; }
    .lx-grid .lx-cell:nth-child(1){grid-area:clear} .lx-grid .lx-cell:nth-child(2){grid-area:agent}
    .lx-grid .lx-cell:nth-child(3){grid-area:access} .lx-grid .lx-cell:nth-child(4){grid-area:deck}
    .lx-grid .lx-cell:nth-child(5){grid-area:lang} .lx-grid .lx-cell:nth-child(6){grid-area:cur}
    .lx-cell { position:relative; background:var(--surface); border:1px solid var(--border); border-radius:18px;
      padding:22px; display:flex; flex-direction:column; gap:12px; overflow:hidden; }
    .lx-cell::before { content:""; position:absolute; inset:0 0 auto 0; height:3px;
      background:linear-gradient(90deg, var(--lx-hue), transparent 70%); }
    .lx-cell h3 { font:600 17px/1.2 Poppins; color:var(--strong); }
    .lx-cell p { font:400 14px/1.55 Poppins; color:var(--dim); }
    .lx-ico { width:40px; height:40px; border-radius:12px; display:grid; place-items:center; flex:none;
      background:color-mix(in srgb, var(--lx-hue) 20%, var(--surface-3));
      box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--lx-hue) 40%, transparent); }
    .lx-ico svg { width:21px; height:21px; color:var(--lx-hue); }
    .lx-demo { margin-top:auto; padding-top:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .lx-mono { font:500 12px/1 var(--font-mono); color:var(--accent);
      background:color-mix(in srgb, var(--accent) 12%, transparent); border-radius:7px; padding:6px 10px; }
    @media (max-width:820px){ .lx-grid{grid-template-columns:1fr;grid-template-areas:none} .lx-grid .lx-cell{grid-area:auto} }
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
        ${cell('compass', 'var(--purple-light)', 'Clear direction', 'Product units, superconnectors, governance — the whole model in one navigable place.',
          `<span class="ui-badge ui-badge--info">Units</span><span class="ui-badge ui-badge--info">Connectors</span><span class="ui-badge ui-badge--info">Governance</span>`)}
        ${cell('plug', 'var(--cyan)', 'Agent-ready', 'Connect any agent over MCP with a scoped, revocable token. Read the strategy programmatically.',
          `<code class="lx-mono">mcp connect --scope read</code>`)}
        ${cell('shield', 'var(--pink)', 'Access you control', 'Consent screens, per-agent tokens, one-click revoke. You always see who can read what.',
          `<span class="ui-badge ui-badge--live">Read-only</span>${button({ label: 'Revoke', variant: 'danger', size: 'sm' })}`)}
        ${cell('layers', 'var(--amber)', 'Deck or text', 'The same content as an animated deck or a calm long-form. Switch anytime.',
          demoTabs('lx-view', 'View', [
            { label: 'Deck', panel: demoBlurb('Slides that move as you do. Made for a room and a big screen.') },
            { label: 'Text', panel: demoBlurb('One scrollable long-form. Made for search, quoting and rereading.') },
          ]))}
        ${cell('globe', 'var(--green)', 'English & Russian', 'The whole surface localises, so the team reads it in the language they think in.',
          demoTabs('lx-lang', 'Language', [
            { label: 'EN', panel: demoBlurb('One strategy, many agents.') },
            { label: 'RU', panel: demoBlurb('Одна стратегия, много агентов.') },
          ]))}
        ${cell('bolt', 'var(--purple-mid)', 'Always current', 'Versioned cleanly — the live version is at the root, archives keep their own path.',
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
