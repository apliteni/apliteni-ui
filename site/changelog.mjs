// Changelog data + renderer for ui.apli.tech/changelog.
// One entry per published release; grouped changes with typed tags.

export const RELEASES = [
  {
    v: '0.7.2', date: '2026-07-24', tag: 'latest',
    changes: [
      ['changed', 'Relicensed as **MIT** (was proprietary/UNLICENSED). The package is published on public npm, so MIT matches how it can actually be used — install and use it freely across your products.'],
    ],
  },
  {
    v: '0.7.1', date: '2026-07-24',
    changes: [
      ['fixed', 'Table row hover no longer collides with its container’s border — `.ui-table--hover` now draws the highlight as an inset, rounded pill (a few px clear of the edge) instead of a full-bleed rectangle. Dense/zebra ledgers keep their existing full-bleed tint.'],
      ['changed', 'Homepage polish: code-block Copy buttons morph a copy glyph into a checkmark on success (reduced-motion swaps instantly), bento icon tiles use larger crisp glyphs, and the footer gets a visible link hover plus an Apliteni → apliteni.com link.'],
    ],
  },
  {
    v: '0.7.0', date: '2026-07-24',
    changes: [
      ['added', 'Tabs component — `tabs({ items, active, name })` renders an accessible tablist + panels (framework-agnostic HTML string); wire it with `initTabs()`. Full WAI-ARIA pattern: roving tabindex, Arrow/Home/End keys, aria-selected and aria-controls wiring. New Components → Tabs story.'],
    ],
  },
  {
    v: '0.6.1', date: '2026-07-23',
    changes: [
      ['changed', 'Theme toggle is now a single icon-only switch — a compact sun/moon button (no "Light/Dark" text). Keeps its `aria-label`, so the accessible name is intact. Affects `topbar({ theme: true })` and the site chrome.'],
    ],
  },
  {
    v: '0.6.0', date: '2026-07-23',
    changes: [
      ['removed', 'Aurora background — the `aurora()` component and the `.ui-bg-aurora` backdrop are gone. Nothing in the kit used them, so they were dead weight. The ambient `.ui-glow` blobs and the other backdrops (spotlight, accent wash, grid, dots) stay. Removing a public export is a breaking change — hence the minor bump.'],
      ['added', 'Homepage bento shows more of the kit — live Icons and Motion cells — and its blocks read as distinct panels (per-cell hue, no card hover).'],
    ],
  },
  {
    v: '0.5.0', date: '2026-07-23',
    changes: [
      ['added', 'Motion library — a small, token-driven set of reusable effects as plain classes: entrances (`.m-fade-in`, `.m-slide-up/-down/-left/-right`, `.m-scale-in`, `.m-blur-in`), micro-interactions (`.m-lift`, `.m-press`, `.m-skeleton`), attention (`.m-pulse`, `.m-shake`, `.m-draw`) and staggered scroll reveals (`[data-reveal]` + the optional `initReveal()` hook). Demoed in Foundations → Motion with a live token table and a Replay playground.'],
      ['added', 'One global `prefers-reduced-motion` rule that neutralises every animation and transition in the kit — closing gaps where the badge pulse and smooth scroll were previously unguarded — while letting one-shots settle on their final frame.'],
      ['changed', 'Motion now speaks the Apliteni brand vocabulary — durations and easings sync from design-system (`--duration-*` / `--easing-*`); the kit’s `--dur-*` / `--ease` alias onto them, with new `--delay-1…5` for staggering.'],
      ['changed', 'Landing “Built for people and agents alike” grid rebuilt as a bento with per-cell hues and no card hover, so the blocks read as distinct and the real controls inside each one no longer fight a card-level animation.'],
    ],
  },
  {
    v: '0.4.0', date: '2026-07-21',
    changes: [
      ['added', 'Ambient aurora background — `aurora()` lays down drifting glow blobs plus an optional paper grain. Colours read the accent tokens, so it re-themes across Nebula, Phoenix, Ocean and Emerald with no per-app CSS. Full-bleed `fixed` mode; `prefers-reduced-motion` respected.'],
      ['added', 'Accessibility CI gate — every story runs through axe (WCAG 2.0/2.1 A + AA) under `npm test`, so violations can’t regress.'],
      ['added', 'Apliteni seedling on the Brand page alongside the kit prism, each with a size ramp.'],
      ['fixed', 'Resolved the WCAG A/AA violations the a11y panel flagged — real labels on every input, named listboxes, `select()` factory.'],
      ['fixed', 'Consent-card brand lockup — the mark no longer jams against the label; `.brand` is now self-contained outside the topbar.'],
      ['fixed', 'The aurora CSS now ships through the inline / server-render bundle too (`/inline` export, site `kit.css`), not just the bundler entry.'],
      ['changed', 'Calmer Storybook manager chrome — purple reads as a sparing accent, not a wall.'],
    ],
  },
  {
    v: '0.3.0', date: '2026-07-21',
    changes: [
      ['changed', 'Light theme is now a true white app — `--bg` / `--surface` both `#ffffff` with retuned neutrals, so downstream products stop forking CSS.'],
      ['added', 'Finance data-table treatment (`.ui-table--dense/--zebra/--hover`, `__num` / `__code`) and the semantic status badges, promoted into the kit.'],
      ['fixed', 'Light cards get a hairline border + soft shadow so they read as panels on white; a too-wide table scrolls inside the card instead of bleeding past its corners.'],
    ],
  },
  {
    v: '0.2.4', date: '2026-07-20',
    changes: [
      ['fixed', 'Active segmented pill now sits inside its track — the heavy card shadow was spilling past the edge and reading as overflow. New tight `--shadow-seg` token.', ['Segmented']],
    ],
  },
  {
    v: '0.2.3', date: '2026-07-20',
    changes: [
      ['added', 'Gradient-bars busy loader on buttons — the button is disabled while it works.', ['Button']],
      ['added', 'Centered + glow Google-SSO sign-in, with idle / signing-in states.'],
    ],
  },
  {
    v: '0.2.2', date: '2026-07-20',
    changes: [
      ['added', '`--accent-strong` token — primary buttons now clear WCAG AA contrast.', ['Button']],
      ['added', '`--seg-active-bg` token — the active segmented pill reads clearly in dark.', ['Segmented']],
      ['added', 'Google-SSO-only sign-in story.'],
      ['fixed', 'Card grids no longer misalign — spacing moved to `.ui-card-stack` (the child margin leaked into rows).', ['Card']],
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

// Component display name → Storybook story id (title kebab + first export).
// A name absent here renders as a plain, unlinked chip.
const COMPONENTS = {
  Table:     'components-table--finance-data',
  Badge:     'components-badge-status--badges',
  Button:    'components-button--playground',
  Card:      'components-card--variants',
  Callout:   'components-callout-toast--callouts',
  Inputs:    'components-inputs--text-fields',
  Segmented: 'components-segmented-control--playground',
  Snippet:   'components-code-snippet--shell',
  Switch:    'components-switch-checkbox--switches',
  Topbar:    'components-topbar--full',
  Feedback:  'components-feedback--default',
};

const STORYBOOK = (id) => `/storybook/?path=/story/${id}`;

const TAG = {
  added: { label: 'Added', cls: 'added' },
  fixed: { label: 'Fixed', cls: 'fixed' },
  changed: { label: 'Changed', cls: 'changed' },
  removed: { label: 'Removed', cls: 'removed' },
  breaking: { label: 'Breaking', cls: 'breaking' },
};

// GitHub handle map — resolves a commit email to an avatar + profile.
// Unknown authors fall back to an initials chip and plain name.
const AUTHORS = {
  'artur.sabirov@apliteni.com': { handle: 'asabirov', name: 'Artur Sabirov' },
};

const initialsOf = (name) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

// Parse `git log --format=%an%x09%ae` output into deduped, bot-filtered contributors.
export const parseContributors = (logText, authors = AUTHORS) => {
  const seen = new Map(); // email → { name, count }
  for (const line of logText.split('\n')) {
    if (!line.trim()) continue;
    const [name, email] = line.split('\t');
    if (!name || !email) continue;
    if (/\[bot\]/i.test(name) || /\[bot\]/i.test(email)) continue;
    const key = email.toLowerCase();
    const cur = seen.get(key) || { name, count: 0 };
    cur.count += 1;
    seen.set(key, cur);
  }
  return [...seen.entries()]
    .map(([email, { name, count }]) => {
      const a = authors[email];
      const person = a
        ? {
            name: a.name, handle: a.handle,
            url: `https://github.com/${a.handle}`,
            avatar: `https://github.com/${a.handle}.png?size=48`,
            initials: initialsOf(a.name),
          }
        : { name, handle: null, url: null, avatar: null, initials: initialsOf(name) };
      return { person, count };
    })
    .sort((a, b) => b.count - a.count || a.person.name.localeCompare(b.person.name))
    .map(({ person }) => person);
};

// Per-release contributor row: avatar (photo or initials) + handle/name chip.
export const contributorChips = (people) => {
  if (!people || !people.length) return '';
  const who = (p) => {
    const av = p.avatar
      ? `<img class="av" src="${attr(p.avatar)}" alt="" width="22" height="22">`
      : `<span class="av ini">${fmt(p.initials)}</span>`;
    const label = p.handle ? `@${fmt(p.handle)}` : fmt(p.name);
    return p.url
      ? `<a class="who" href="${attr(p.url)}">${av}${label}</a>`
      : `<span class="who">${av}${label}</span>`;
  };
  return `<div class="contrib"><span class="people">${people.map(who).join('')}</span></div>`;
};

// tiny inline-code + backtick formatter (no external md)
const fmt = (s) => s
  .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  .replace(/`([^`]+)`/g, '<code class="ui-code">$1</code>');

// Escape a value for use inside a double-quoted HTML attribute.
const attr = (s) => String(s).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));

// Per-change component chips: known → Storybook deeplink, unknown → plain pill.
export const componentChips = (names) => {
  if (!names || !names.length) return '';
  const chip = (n) => COMPONENTS[n]
    ? `<a class="comp" href="${STORYBOOK(COMPONENTS[n])}">${fmt(n)}</a>`
    : `<span class="comp plain">${fmt(n)}</span>`;
  return `<span class="chips">${names.map(chip).join('')}</span>`;
};

export const isBreakingRelease = (r) => r.changes.some(([t]) => t === 'breaking');

const BREAKING_BADGE = `<span class="ui-badge ui-badge--breaking">` +
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>` +
  `Breaking</span>`;

export const release = (r, contributors) => `
  <section class="rel">
    <div class="rel__rail"><span class="rel__dot${r.tag === 'latest' ? ' is-latest' : ''}"></span></div>
    <div class="rel__body">
      <header class="rel__head">
        <span class="rel__v">v${r.v}</span>
        <span class="rel__date">${r.date}</span>
        ${r.tag === 'latest' ? '<span class="ui-badge ui-badge--live">Latest</span>' : ''}
        ${r.tag === 'first' ? '<span class="ui-badge ui-badge--soon">First</span>' : ''}
        ${isBreakingRelease(r) ? BREAKING_BADGE : ''}
      </header>
      <ul class="rel__list">
        ${r.changes.map(([t, text, comps]) => `<li><span class="tag tag--${TAG[t].cls}">${TAG[t].label}</span><span>${fmt(text)}${componentChips(comps)}</span></li>`).join('')}
      </ul>
      ${contributorChips(contributors)}
    </div>
  </section>`;

export const changelogMain = (contributorsByVersion = {}) =>
  RELEASES.map((r) => release(r, contributorsByVersion[r.v])).join('');
