// Changelog data + renderer for ui.apli.tech/changelog.
// One entry per published release; grouped changes with typed tags.

export const RELEASES = [
  {
    v: '0.11.0', date: '2026-08-12', tag: 'latest',
    changes: [
      ['added', '`appShell()` — the kit has one page shell now. A full-height rail built from the kit\'s own `sidebarNav()`, beside exactly one `<main>`. The breadcrumb trail is yours: pass `crumbs` and it renders `breadcrumbs()`, pass nothing and there is no trail. The topbar is off unless you ask for one.', ['Shell']],
      ['added', 'The rail folds to icons below 720px instead of disappearing. Every row keeps its accessible name at every width, and the icon target measures 45×44px on a phone. Before this, a 375px screen got three navigation links, none of them reachable.', ['Shell']],
      ['breaking', '`accountShell()` is now a preset over `appShell()`, and its markup changed. It emits a `<main>` where it emitted none, its sidebar is `sidebarNav()`\'s `.ui-nav--side` rather than a hand-written `.ui-side`, and its breadcrumb comes from `breadcrumbs()`. Every option it took it still takes, including the old `[id, icon, label, href, target]` nav tuples — but CSS or scripts of yours that reached for `.ui-side`, `.ui-shell`, `.ui-shell__crumbs`, `.ui-shell__page`, `.ui-card-stack` or `.sub` no longer find anything. The card stack is `.ui-app__body` and the page subtitle is `.ui-app__sub`.', ['Shell']],
      ['breaking', '`ACCOUNT_NAV` is a list of `{ id, icon, label }` objects, not `[id, icon, label]` tuples. `sidebarNav()`, `appShell()`, `accountShell()`, `topbar()` and `accountMenu()` all read either shape, so passing it anywhere the kit takes a nav still works — but if you spread or destructure its entries yourself, that is the line to change.', ['Shell']],
      ['breaking', 'A nav label that arrives pre-escaped now shows its entity. Every nav primitive escapes what it is given, so `[\'x\', \'gear\', \'Access &amp; agents\']` renders as `Access &amp;amp; agents`. The kit taught this pattern: the `ACCOUNT_NAV` it shipped spelled that ampersand as an entity, because the old shell interpolated raw HTML. Pass raw text — `Access & agents` — wherever you were passing entities.', ['Shell']],
      ['breaking', '`crumb` is escaped rather than inserted as HTML. It used to land inside a `<b>` the shell wrote itself; it now goes through `breadcrumbs()`, which escapes every label. `crumb: \'<em>Payouts</em>\'` rendered italic before and renders the tags as text now. There is no markup slot in the trail — pass an item with an `icon` to `appShell({ crumbs })` if you need one.', ['Shell']],
      ['changed', '`sub` is a `<p>`, not a `<div>`. It is still a trusted-HTML slot, but a `<p>` closes at the first block element the parser meets, so `sub: \'<div>block</div>\'` now leaves a stray `</p>` behind it. Inline markup is unaffected; anything block-level belongs in `body`.', ['Shell']],
      ['removed', 'The `.ui-side` and `.ui-shell` rules are gone from the stylesheet. Nothing emitted that markup any more.', ['Shell']],
      ['fixed', 'A rail label keeps the kit\'s own colour under a host stylesheet\'s `a:link`. The kit\'s declaration was `.ui-nav__item` at (0,1,0) and a host\'s `a:link` is (0,1,1), so every resting rail label took the host\'s link colour. The breadcrumb link is held the same way.'],
      ['fixed', 'A badged rail row is announced with its count. The row carries an accessible name at every width now, and a name built from the label alone had narrowed "Pending 3" to "Pending".'],
      ['fixed', 'The signed-in reader sits beside the rail\'s navigation, not inside it — a screen reader was announcing the reader\'s email address as a navigation entry.'],
      ['fixed', 'A shell no longer names a reader you did not give it. Where a caller passed only an address, or no account at all, the topbar menu filled the gap with the kit\'s own demo person — so a page could name your reader in the rail and somebody else beside it.', ['Shell']],
      ['changed', 'The account menu\'s initials come from the display name when there is one, and from the address otherwise. They were read from the address alone, so the rail and the menu could draw two different marks for one reader.'],
      ['changed', '`ACCOUNT_NAV` spells its ampersand as `&` rather than `&amp;`. If you read that constant\'s labels yourself, they are raw text now.'],
    ],
  },
  {
    v: '0.10.0', date: '2026-08-12',
    changes: [
      ['breaking', '`drawer({ open: true })` now really opens — the page behind goes inert, Tab is trapped in the panel, Escape closes it. A sidebar or an inline specimen that should sit there open wants `specimen: true`. `confirm()` reads `open: true` the same way.'],
      ['added', '`confirm()` — the question a page stops for before something irreversible. A focus-trapped modal over a scrim; Escape cancels, and it opens on the safe answer, so a reader who hits Enter out of habit keeps what they have.'],
      ['fixed', 'Opening a drawer puts the reader inside it. Focus was asked for while the panel still counted as hidden, so it went nowhere — and the page behind was already hidden from assistive technology by then, leaving the reader on the document body with nothing to read and nothing to tab to.', ['Drawer']],
      ['fixed', 'Two overlays open at once — two drawers, or a confirm over a drawer — no longer hide the whole page from assistive technology until a reload. Closing them out of order used to leave everything outside them `inert` for good.'],
    ],
  },
  {
    v: '0.9.1', date: '2026-08-09',
    changes: [
      ['changed', 'Nothing you can see. 0.9.0 shipped, and then two comments inside shipped stylesheets changed without a version bump, so the package on npm stopped matching the source. This release makes them agree again — upgrading from 0.9.0 changes no rendering and no API.'],
      ['fixed', 'Releasing no longer depends on someone remembering to do it. A version bump landing on `main` is tagged, gets a release whose notes are its changelog entry, and is published. A pull request that changes what the package ships without bumping the version fails, and a daily check opens an issue if what is on npm and what is on `main` disagree for more than a day. Silence used to look the same as success; it no longer does.'],
    ],
  },
  {
    v: '0.9.0', date: '2026-08-09',
    changes: [
      ['breaking', 'The inline-icon reset is a floor again, not a ceiling. `svg:not([width]):not([height])` counted both attribute selectors and weighed (0,2,1), so it quietly outranked every `.ui-btn svg`-shaped rule — in the kit and in your own CSS. It is now `svg:where(:not([width]):not([height]))` at (0,0,1). Any icon rule of yours that was silently losing to it now applies, so icons you sized yourself will change to the size you actually asked for.'],
      ['added', '`footer()`, `success()`, `successCheck()` and `wireSuccess()` are reachable from the package root. They were in the source and missing from the entry point, so nobody could import them.'],
      ['added', '`empty.css` ships through `/inline`, so the empty-state styles reach anyone using the inline stylesheet rather than the built one.'],
      ['fixed', 'The theme control reports the theme you are in, never the one a click would produce — in the glyph and in the accessible name, which is rewritten whenever the state changes.', ['Topbar']],
      ['fixed', '`--pink` clears the surfaces it is drawn on in both themes, and the live pill and info badge clear AA in light.', ['Badge', 'Callout']],
      ['fixed', 'A glow wash is a tint of the colour it carries. The values that had drifted are back in line and a test holds them there.'],
      ['fixed', 'The danger nav row is quiet at rest and turns `--pink` on hover, which is what the destructive-actions guideline says it should do.'],
      ['changed', 'Colour contrast is measured rather than reviewed by eye. Every story is mounted per theme against the real stylesheets, and each text-owning element is measured against the background actually composited beneath it. Pairs that stay below the bar are recorded with a written reason rather than left to be rediscovered.'],
    ],
  },
  {
    v: '0.8.1', date: '2026-08-07',
    changes: [
      ['fixed', 'The zebra table recipe insets its own end cells, so a striped row no longer runs into the container border.', ['Table']],
      ['fixed', 'The audience switcher on the homepage announces itself as a tablist and then behaves like one — roving tabindex, arrow keys, `aria-selected`.'],
      ['fixed', 'The Storybook toolbar selector works again, and the workbench stops composing stories from outside the kit.'],
      ['fixed', 'Releases publish again. `npm publish` was handed the tarball as a bare `a/b` path, which npm reads as owner/repo shorthand, so every publish resolved a repository instead of the file and died on a public-key error.'],
    ],
  },
  {
    v: '0.8.0', date: '2026-08-07',
    changes: [
      ['added', 'React components ship as `@apliteni/apliteni-ui/react` — Button, Badge, Card, Icon, Modal and DataTable, with their own stylesheets and stories. The vanilla kit is unchanged and remains the source of truth for tokens.'],
      ['added', 'Guidelines are a place in Storybook now, starting with destructive actions. Each rule cites the lines of the kit that implement it, and a test fails the build when a cited line drifts.'],
      ['added', 'Storybook flips theme in one click instead of through a dropdown.'],
      ['fixed', 'Light-mode Phoenix and Emerald were deepened to meet WCAG AA. Both failed as text and as a button fill.'],
      ['fixed', 'Danger is always `--pink`, and colour comes from tokens rather than from literals scattered through the components.'],
      ['fixed', 'Field errors are connected to their fields, decorative icons are hidden from assistive technology, every icon-only control has a name, and the accessibility gates that were meant to catch all of this actually run.', ['Inputs']],
      ['changed', 'The icon set is unified on canonical Feather/Lucide glyphs, so the same idea is the same drawing everywhere.'],
      ['changed', 'Storybook 8 → 10 and Vite 5 → 6.'],
    ],
  },
  {
    v: '0.7.2', date: '2026-07-24',
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
  Confirm:   'components-confirm--playground',
  Drawer:    'components-drawer--playground',
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
