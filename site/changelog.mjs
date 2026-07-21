// Changelog data + renderer for ui.apli.tech/changelog.
// One entry per published release; grouped changes with typed tags.

export const RELEASES = [
  {
    v: '0.3.0', date: '2026-07-21', tag: 'latest',
    changes: [
      ['added', 'Ambient aurora background — `aurora()` lays down drifting glow blobs plus an optional paper grain. Colours read the accent tokens, so it re-themes across Nebula, Phoenix, Ocean and Emerald with no per-app CSS. Full-bleed `fixed` mode; `prefers-reduced-motion` respected.'],
      ['added', 'Accessibility CI gate — every story runs through axe (WCAG 2.0/2.1 A + AA) under `npm test`, so violations can’t regress.'],
      ['added', 'Apliteni seedling on the Brand page alongside the kit prism, each with a size ramp.'],
      ['fixed', 'Resolved the WCAG A/AA violations the a11y panel flagged — real labels on every input, named listboxes, `select()` factory.'],
      ['fixed', 'Consent-card brand lockup — the mark no longer jams against the label; `.brand` is now self-contained outside the topbar.'],
      ['changed', 'Calmer Storybook manager chrome — purple reads as a sparing accent, not a wall.'],
    ],
  },
  {
    v: '0.2.4', date: '2026-07-20',
    changes: [
      ['fixed', 'Active segmented pill now sits inside its track — the heavy card shadow was spilling past the edge and reading as overflow. New tight `--shadow-seg` token.'],
    ],
  },
  {
    v: '0.2.3', date: '2026-07-20',
    changes: [
      ['added', 'Gradient-bars busy loader on buttons — the button is disabled while it works.'],
      ['added', 'Centered + glow Google-SSO sign-in, with idle / signing-in states.'],
    ],
  },
  {
    v: '0.2.2', date: '2026-07-20',
    changes: [
      ['added', '`--accent-strong` token — primary buttons now clear WCAG AA contrast.'],
      ['added', '`--seg-active-bg` token — the active segmented pill reads clearly in dark.'],
      ['added', 'Google-SSO-only sign-in story.'],
      ['fixed', 'Card grids no longer misalign — spacing moved to `.ui-card-stack` (the child margin leaked into rows).'],
      ['changed', 'Removed the auto-generated Storybook “Docs” pages; intro wordmark reads apliteni-ui.'],
    ],
  },
  {
    v: '0.2.1', date: '2026-07-20',
    changes: [
      ['fixed', 'Larger feature icons; aligned landing preview cards; roomier hero.'],
      ['changed', 'Version moved to a nav pill; dropped the Strategy footer link.'],
    ],
  },
  {
    v: '0.2.0', date: '2026-07-20',
    changes: [
      ['changed', 'Renamed the package to `@apliteni/apliteni-ui` (was `@apliteni/aplitech-ui`).'],
    ],
  },
  {
    v: '0.1.2', date: '2026-07-20',
    changes: [['fixed', 'Enlarged the consent scope + app-chip icons.']],
  },
  {
    v: '0.1.1', date: '2026-07-20',
    changes: [['fixed', 'Account menu stays hidden until the session is confirmed (`.acct.on`).']],
  },
  {
    v: '0.1.0', date: '2026-07-20', tag: 'first',
    changes: [
      ['added', 'First release — tokens, components, and the deck theme.'],
      ['added', 'Accent sub-themes — Nebula, Phoenix, Ocean and Emerald — in dark and light.'],
      ['added', 'Storybook workbench + the ui.apli.tech landing.'],
    ],
  },
];

const TAG = {
  added: { label: 'Added', cls: 'added' },
  fixed: { label: 'Fixed', cls: 'fixed' },
  changed: { label: 'Changed', cls: 'changed' },
  removed: { label: 'Removed', cls: 'removed' },
};

// tiny inline-code + backtick formatter (no external md)
const fmt = (s) => s
  .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  .replace(/`([^`]+)`/g, '<code class="ui-code">$1</code>');

const release = (r) => `
  <section class="rel">
    <div class="rel__rail"><span class="rel__dot${r.tag === 'latest' ? ' is-latest' : ''}"></span></div>
    <div class="rel__body">
      <header class="rel__head">
        <span class="rel__v">v${r.v}</span>
        <span class="rel__date">${r.date}</span>
        ${r.tag === 'latest' ? '<span class="ui-badge ui-badge--live">Latest</span>' : ''}
        ${r.tag === 'first' ? '<span class="ui-badge ui-badge--soon">First</span>' : ''}
      </header>
      <ul class="rel__list">
        ${r.changes.map(([t, text]) => `<li><span class="tag tag--${TAG[t].cls}">${TAG[t].label}</span><span>${fmt(text)}</span></li>`).join('')}
      </ul>
    </div>
  </section>`;

export const changelogMain = () => RELEASES.map(release).join('');
