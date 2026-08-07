import { sidebarNav, navTabs, breadcrumbs } from '../../src/components/nav.js';
import { pad, specimen, stack } from '../_gallery.js';

// A sidebar with sections, an active item, per-item counters, and a nested,
// collapsible group whose active child auto-opens it.
const SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'home', icon: 'chart', label: 'Dashboard' },
      { id: 'activity', icon: 'bolt', label: 'Activity', badge: 4 },
      { id: 'inbox', icon: 'mail', label: 'Inbox', badge: { text: 12, tone: 'accent' } },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'revenue', icon: 'chart', label: 'Revenue' },
      {
        icon: 'card', label: 'Payouts',
        items: [
          { id: 'payouts-pending', label: 'Pending', badge: 3 },
          { id: 'payouts-history', label: 'History' },
          { id: 'payouts-methods', label: 'Methods' },
        ],
      },
      { id: 'invoices', icon: 'doc', label: 'Invoices', badge: { text: 'due', tone: 'danger' } },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'members', icon: 'user', label: 'Members' },
      { id: 'keys', icon: 'key', label: 'API keys' },
      { id: 'settings', icon: 'gear', label: 'Settings', disabled: true },
    ],
  },
];

const SIGN_OUT = `<a class="ui-nav__item is-danger" href="#logout">
  <span class="ui-nav__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></span>
  <span class="ui-nav__label">Sign out</span></a>`;

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'payouts', label: 'Payouts', badge: 3 },
  { id: 'transactions', label: 'Transactions' },
  { id: 'disputes', label: 'Disputes', badge: { text: 2, tone: 'danger' } },
  { id: 'exports', label: 'Exports', disabled: true },
];

export default {
  title: 'Components/Navigation',
  parameters: { layout: 'fullscreen' },
};

// A short rail bay so the sticky/vertical sidebar reads on the padded canvas.
const bay = (html) => `<div style="max-width:760px">${html}</div>`;

export const Sidebar = {
  name: 'Sidebar — expanded + nested',
  render: () => pad(bay(specimen(
    'Sections, icon+label items, active state, counters, a collapsible group (its active child auto-opens it), and a sign-out footer',
    sidebarNav({
      ariaLabel: 'Primary',
      sections: SECTIONS,
      active: 'payouts-pending',
      footer: SIGN_OUT,
    }),
  ))),
};

// ---- Proposals -----------------------------------------------------------
// Three candidate treatments of the same rail, each answering a different
// question about why the baseline above reads badly. Same data, same factory,
// same footer — only the wrapper class differs, so switching stories switches
// exactly one thing. See the "PROPOSALS" block at the foot of src/styles/nav.css
// for what each one measured and what it changed.
const proposal = (cls, blurb) => pad(bay(specimen(
  blurb,
  `<div class="${cls}">${sidebarNav({
    ariaLabel: 'Primary',
    sections: SECTIONS,
    active: 'payouts-pending',
    footer: SIGN_OUT,
  })}</div>`,
)));

export const SidebarRepair = {
  name: 'Sidebar — A · repair',
  render: () => proposal(
    'ui-nav-try--repair',
    'Theory A — nothing here is styled badly, three declarations just never reach the element: the nested indent loses to the .ui-nav ul reset, the active child’s marker paints outside the nav box, and .is-active fills with --surface, which is --bg in the light theme. Same design values, restored.',
  ),
};

export const SidebarRhythm = {
  name: 'Sidebar — B · rhythm',
  render: () => proposal(
    'ui-nav-try--rhythm',
    'Theory B — the rail draws four row heights (30.8 / 33 / 35.4 / 37px) because a counter is taller than a label, and its gaps run 2, 4, 9, 10, 11, 12, 14, 15px. One ruled row height a badge cannot push, one declared icon column, every gap on --space-*.',
  ),
};

export const SidebarInk = {
  name: 'Sidebar — C · ink ladder',
  render: () => proposal(
    'ui-nav-try--ink',
    'Theory C — geometry untouched. Two inks are doing six jobs: captions, the sign-out row, the carets and the icons all resolve to --muted, and the disabled row is that same --muted at 55% opacity (2.6:1). Four named levels, no opacity, and the current row carried by ink rather than a fill.',
  ),
};

export const SidebarCollapsed = {
  name: 'Sidebar — collapsed (icon-only)',
  render: () => pad(bay(specimen(
    'Icon-only rail — labels fold into aria-label + title so the icons stay named and hoverable',
    sidebarNav({
      ariaLabel: 'Primary',
      sections: SECTIONS,
      active: 'revenue',
      collapsed: true,
      footer: SIGN_OUT,
    }),
  ))),
};

export const Tabs = {
  name: 'Horizontal tabs — underline',
  render: () => pad(specimen(
    'Top-level page tabs with an active underline; counters and a disabled tab',
    navTabs({ ariaLabel: 'Finance views', items: TABS, active: 'payouts' }),
  )),
};

export const TabsPill = {
  name: 'Horizontal tabs — pill',
  render: () => pad(specimen(
    'The same tabs with a pill active affordance instead of an underline',
    navTabs({ ariaLabel: 'Finance views', items: TABS, active: 'payouts', variant: 'pill' }),
  )),
};

export const Breadcrumbs = {
  name: 'Breadcrumbs',
  render: () => pad(stack(
    specimen(
      'The Finance / Payouts trail — the last crumb is the current page',
      breadcrumbs({
        items: [
          { label: 'Finance', href: '#finance' },
          { label: 'Payouts', href: '#payouts' },
          { label: 'PY-4821' },
        ],
      }),
    ),
    specimen(
      'With a leading home icon',
      breadcrumbs({
        items: [
          { label: 'Home', href: '#home', icon: 'compass' },
          { label: 'Workspace', href: '#workspace' },
          { label: 'API keys' },
        ],
      }),
    ),
  )),
};
