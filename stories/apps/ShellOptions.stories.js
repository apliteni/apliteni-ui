// Three candidate answers to "what is the kit's one page shell?" (issue #127),
// rendered side by side so the choice can be made by looking rather than by
// reading. Nothing here is the implementation: the shells are local to this file
// and two of the three are meant to be thrown away.
//
// Every option renders the same screen body, the same three nav entries and the
// same breadcrumb trail, so the only differences visible are the differences
// between the options. Each option has a wide story (read at 1280) and a narrow
// story (read at 375) — pick the width from the viewport toolbar; the narrow
// stories already open there.
import { sidebarNav, breadcrumbs } from '../../src/components/nav.js';
import { topbar } from '../../src/components/topbar.js';
import { card, button, badge, input, snippet, hlShell } from '../../src/components/index.js';
import { prism } from '../../src/assets/brand.js';

export default {
  title: 'Apps/Shell options (#127)',
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        wide: { name: 'Wide — 1280', styles: { width: '1280px', height: '900px' }, type: 'desktop' },
        narrow: { name: 'Narrow — 375', styles: { width: '375px', height: '812px' }, type: 'mobile' },
      },
    },
  },
};

// ---- The one nav definition every option draws from -----------------------
// One icon and one label per entry, written once. The label is raw text: every
// nav primitive escapes, so `&` stays `&` instead of drifting into `&amp;` the
// way it has across the three shells in this folder.
const NAV = [
  { id: 'overview', label: 'Overview', icon: 'chart', href: '#overview' },
  { id: 'prefs', label: 'Preferences', icon: 'gear', href: '#prefs' },
  { id: 'access', label: 'Access & agents', icon: 'key', href: '#access' },
];
const ACTIVE = 'access';

// The same entries in the tuple shape topbar()'s account menu wants, derived
// rather than retyped.
const MENU_NAV = NAV.map((n) => [n.id, n.icon, n.label, n.href]);

const ACCOUNT = { name: 'Ada Lovelace', email: 'ada@apliteni.com' };
const TRAIL = [{ label: 'Account', href: '#account' }, { label: 'Access & agents' }];
const TITLE = 'Access & agents';
const SUB = 'Connect agents to read over MCP. Each gets a scoped, revocable token.';

const rail = (collapsed = false) => sidebarNav({
  sections: [{ label: 'Account', items: NAV }],
  active: ACTIVE,
  collapsed,
  ariaLabel: 'Account',
});

// ---- The one screen body every option renders -----------------------------
const AGENTS = [
  ['Research bot', 'Read only', '2 hours ago', 'live'],
  ['Deck summariser', 'Read only', 'Yesterday', 'live'],
  ['Old integration', 'Read only', '3 weeks ago', 'dead'],
];

const agentTable = () => `
  <table class="ui-table ui-table--hover">
    <thead><tr><th>Agent</th><th>Scope</th><th>Last used</th><th></th></tr></thead>
    <tbody>
      ${AGENTS.map(([name, scope, used, state]) => `
        <tr class="${state === 'dead' ? 'is-dead' : ''}">
          <td class="ui-table__title">${name}</td>
          <td>${scope}</td>
          <td>${used}</td>
          <td class="ui-table__act">${state === 'dead'
            ? '<span style="color:var(--muted);font-size:13px">Revoked</span>'
            : button({ label: 'Revoke', variant: 'danger', size: 'sm' })}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;

const BODY = () => `
  ${card({
    title: `Connect over MCP ${badge('Live', 'live')}`,
    icon: 'plug',
    sub: 'Paste this into your agent. It reads as you — read-only.',
    body: snippet({ label: 'Terminal', code: hlShell('claude mcp add apliteni \\\n  --url "https://ui.apli.tech/mcp" \\\n  --header "Authorization: Bearer $TOKEN"') }),
  })}
  ${card({ title: 'Your agents', body: `
    ${agentTable()}
    <div style="display:flex;gap:10px;margin-top:20px">
      ${input({ placeholder: 'New agent name — e.g. Research bot', ariaLabel: 'New agent name' })}
      ${button({ label: 'Create token', variant: 'primary', icon: 'key' })}
    </div>
  ` })}`;

// ---- Option A — the kit's shell wins, rebuilt on the kit's own nav --------
// accountShell() keeps its centred ~960px settings look and its topbar, but
// stops hand-writing the sidebar and the crumb: the rail is sidebarNav(), the
// trail is breadcrumbs() and the caller owns it, and the page column is <main>.
// At ≤720px layout.css already stacks the rail above the content.
const styleA = `<style>
  .so-a { position: relative; overflow: hidden; min-height: 100vh; background: var(--bg); color: var(--text); }
  .so-a .ui-shell { grid-template-columns: 216px 1fr; }
  .so-a .ui-nav--side { position: sticky; top: 80px; align-self: start; }
  .so-a .ui-nav--crumbs { margin-bottom: var(--space-2); }
  @media (max-width: 720px) {
    .so-a .ui-shell { grid-template-columns: 1fr; }
    .so-a .ui-nav--side { position: static; width: 100%; }
  }
</style>`;

const optionA = () => `${styleA}
  <div class="so-a" data-shell="A">
    <span class="ui-glow ui-glow--purple" style="top:-120px;right:6%;opacity:.35"></span>
    ${topbar({ word: 'Account', view: 'text', showSwitch: false, account: { ...ACCOUNT, active: ACTIVE, nav: MENU_NAV } })}
    <div class="ui-shell">
      ${rail()}
      <main class="ui-shell__page">
        ${breadcrumbs({ items: TRAIL })}
        <h1>${TITLE}</h1>
        <div class="sub">${SUB}</div>
        <div class="ui-card-stack">${BODY()}</div>
      </main>
    </div>
  </div>`;

// ---- Option B — the app shell's design wins, promoted into the kit --------
// Full-height rail: brand at the top, the signed-in user pinned at the bottom,
// a wider content column, <main>. Rebuilt on sidebarNav() and a token-driven
// stylesheet instead of the .ax* inline block. Narrow renders the icon-only
// collapsed rail sidebarNav({ collapsed: true }) already supports.
const styleB = `<style>
  .so-b { display: grid; grid-template-columns: max-content 1fr; min-height: 100vh;
    background: var(--bg); color: var(--text); font-family: var(--font-sans); }
  .so-b__rail { display: flex; flex-direction: column; gap: var(--space-5);
    padding: var(--space-5) var(--space-4); border-right: 1px solid var(--border);
    background: var(--bg-elevated); position: sticky; top: 0; height: 100vh; }
  .so-b__brand { display: flex; align-items: center; gap: var(--space-2);
    padding: 2px 6px; font-weight: var(--weight-semibold); color: var(--strong);
    letter-spacing: var(--tracking-tight); }
  .so-b__user { margin-top: auto; display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-2); border-top: 1px solid var(--border); }
  .so-b__av { width: 30px; height: 30px; flex: none; border-radius: var(--radius-pill);
    background: var(--surface-3); color: var(--strong); display: grid; place-items: center;
    font: var(--weight-semibold) 12px var(--font-sans); }
  .so-b__who { font-size: 12.5px; line-height: 1.3; min-width: 0; }
  .so-b__who b { display: block; color: var(--strong); font-weight: var(--weight-semibold); }
  .so-b__who span { color: var(--muted); }
  .so-b__main { padding: 40px clamp(24px, 4vw, 56px) 72px; max-width: 900px; min-width: 0; }
  .so-b__main h1 { font: var(--weight-bold) 30px/1.1 var(--font-sans);
    letter-spacing: var(--tracking-tight); color: var(--strong); margin: 10px 0 8px; }
  .so-b__main > p { color: var(--dim); font-size: 15px; margin: 0 0 32px; max-width: 60ch; }
  .so-b__body { display: flex; flex-direction: column; gap: var(--space-5); }
  .so-b:has(.ui-nav--side.is-collapsed) .so-b__brand span,
  .so-b:has(.ui-nav--side.is-collapsed) .so-b__who { display: none; }
  .so-b:has(.ui-nav--side.is-collapsed) .so-b__user { justify-content: center; }
  .so-b:has(.ui-nav--side.is-collapsed) .so-b__rail { padding-inline: var(--space-2); }
</style>`;

const optionB = ({ railCollapsed = false } = {}) => `${styleB}
  <div class="so-b" data-shell="B">
    <aside class="so-b__rail">
      <div class="so-b__brand">${prism('sob', 24)}<span>apliteni-ui</span></div>
      ${rail(railCollapsed)}
      <div class="so-b__user">
        <span class="so-b__av">AL</span>
        <div class="so-b__who"><b>${ACCOUNT.name}</b><span>${ACCOUNT.email}</span></div>
      </div>
    </aside>
    <main class="so-b__main">
      ${breadcrumbs({ items: TRAIL })}
      <h1>${TITLE}</h1>
      <p>${SUB}</p>
      <div class="so-b__body">${BODY()}</div>
    </main>
  </div>`;

// ---- Option C — two shells, both the kit's, with a stated rule ------------
// appShell() for a product console, accountShell() for a settings page. Nothing
// new is drawn: C is A and B shipping together, fed by the one NAV above and
// the one breadcrumbs() call, so the icon, the label, the trail and the
// landmark answer are identical across both. What C adds is the rule.
const RULE = 'Pick appShell() when the page is a place you work in — a console with '
  + 'its own sections. Pick accountShell() when the page is a form you visit, change and leave.';

const styleC = `<style>
  .so-c__rule { font-family: var(--font-sans); font-size: 13px; line-height: 1.55; color: var(--dim);
    background: var(--surface); border-bottom: 1px solid var(--border);
    padding: var(--space-3) clamp(16px, 4vw, 40px); }
  .so-c__rule b { color: var(--strong); font-weight: var(--weight-semibold); }
  .so-c__which { font-family: var(--font-sans); font-size: 11px; letter-spacing: var(--tracking-caps);
    text-transform: uppercase; color: var(--muted); background: var(--bg-elevated);
    border-block: 1px solid var(--border); padding: var(--space-2) clamp(16px, 4vw, 40px); }
</style>`;

const optionC = ({ railCollapsed = false } = {}) => `${styleC}
  <div class="so-c">
    <p class="so-c__rule"><b>The rule.</b> ${RULE}</p>
    <div class="so-c__which">appShell() — product console</div>
    ${optionB({ railCollapsed })}
    <div class="so-c__which">accountShell() — settings page</div>
    ${optionA()}
  </div>`;

// ---- Stories --------------------------------------------------------------
const wide = { globals: { viewport: { value: 'wide' } } };
const narrow = { globals: { viewport: { value: 'narrow' } } };

export const AWide = { name: 'A — kit shell on kit nav (1280)', ...wide, render: () => optionA() };
export const ANarrow = { name: 'A — kit shell on kit nav (375)', ...narrow, render: () => optionA() };

export const BWide = { name: 'B — app shell promoted (1280)', ...wide, render: () => optionB() };
export const BNarrow = {
  name: 'B — app shell promoted (375, collapsed rail)',
  ...narrow,
  render: () => optionB({ railCollapsed: true }),
};

export const CWide = { name: 'C — two shells + a rule (1280)', ...wide, render: () => optionC() };
export const CNarrow = {
  name: 'C — two shells + a rule (375, collapsed rail)',
  ...narrow,
  render: () => optionC({ railCollapsed: true }),
};

// Each option is a full-height page, so a plain stack would be three screens of
// scrolling with one option in view at a time. Capping each at 430px and letting
// it scroll inside its own pane puts two options on screen at once; the panes are
// the full page width, so every media query still fires off the real viewport.
const styleStack = `<style>
  .so-stack__cap { font-family: var(--font-sans); font-size: 12px; font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--muted);
    background: var(--bg-elevated); border-block: 1px solid var(--border);
    padding: var(--space-2) clamp(16px, 4vw, 40px); position: sticky; top: 0; z-index: var(--z-sticky); }
  .so-stack__pane { height: 430px; overflow: auto; }
</style>`;

const pane = (label, html) =>
  `<div class="so-stack__cap">${label}</div><div class="so-stack__pane">${html}</div>`;

export const AllThree = {
  name: 'All three, one scroll (1280)',
  ...wide,
  render: () => `${styleStack}
    ${pane('Option A — kit shell on kit nav', optionA())}
    ${pane('Option B — app shell promoted', optionB())}
    ${pane('Option C — two shells + a rule', optionC())}`,
};
