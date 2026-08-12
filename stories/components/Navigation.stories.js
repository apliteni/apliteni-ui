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
  render: () => pad(bay(stack(
    specimen(
      'Sections, icon+label items, active state, counters, a collapsible group (its active child auto-opens it), and a sign-out footer',
      sidebarNav({
        ariaLabel: 'Primary',
        sections: SECTIONS,
        active: 'payouts-pending',
        footer: SIGN_OUT,
      }),
    ),
    // The accent counter ON the active row — the one place the kit reads accent
    // ink on a raised surface. The rail above cannot also show it: only one row
    // is ever active, and that one carries the neutral counter. It is here so
    // the contrast walk measures the pair rather than a person's reading of it.
    // nav.css:113 gives the counter the active row's own --surface-3 instead of
    // laying --glow-purple over it; deleted, that rule broke nothing in the
    // suite until this specimen existed. See #157.
    specimen(
      'The accent counter on the active row — an active row is already raised, so the counter takes that surface rather than stacking the accent wash on it',
      sidebarNav({
        ariaLabel: 'Overview',
        sections: [SECTIONS[0]],
        active: 'inbox',
      }),
    ),
  ))),
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
