// Navigation — the kit's primary wayfinding primitives. One umbrella factory,
// `nav({ variant })`, dispatches to three shapes that share tokens + classes but
// almost no markup, so each is also exported directly for ergonomic use:
//
//   variant: 'sidebar'      → sidebarNav()   vertical rail: sections, icon+label
//                             items, active state, collapsible groups, an
//                             icon-only collapsed mode, optional per-item badge.
//   variant: 'tabs'         → navTabs()      horizontal page tabs with an active
//                             underline (default) or pill.
//   variant: 'breadcrumbs'  → breadcrumbs()  the `Finance / Payouts` trail.
//
// Why an umbrella AND named exports (unlike dropdown, which is one factory): the
// three variants don't share a body the way select/menu share a panel, so a
// single options bag would mean wildly different fields per variant. The named
// exports keep each call site honest; `nav()` stays the discoverable entry the
// issue asks for and the one thing to import when the variant is data-driven.
//
// These are NAVIGATION controls (links between locations), not tab panels — so
// tabs render as <nav> + <a aria-current="page">, not role="tablist" (that's
// what segmented() is for). Only the collapsible sidebar groups need JS; wire
// them once after mount with wireNav() (preview.js does this for Storybook).
import { esc, icon } from './index.js';

const cx = (...a) => a.filter(Boolean).join(' ');

// Unique-per-render ids so a section heading can label its own list. Module
// counter (never Date/random) — matches field()'s nextId() in index.js.
let _uid = 0;
const nextId = (p = 'nav') => `${p}-${++_uid}`;

// A trailing counter/badge on a nav item. `badge` is a number, a string, or
// { text, tone }. Tones map to the badge token set (accent | live | neutral…).
function navBadge(badge) {
  if (badge == null || badge === '') return '';
  const text = typeof badge === 'object' ? badge.text : badge;
  const tone = typeof badge === 'object' && badge.tone ? badge.tone : 'neutral';
  return `<span class="${cx('ui-nav__badge', `is-${tone}`)}">${esc(text)}</span>`;
}

// One sidebar leaf: a link (or a plain, aria-disabled span). `collapsed` folds
// the label into an aria-label + title so the icon stays named and hoverable.
function sideLeaf(it, active, { collapsed, sub } = {}) {
  const on = it.id != null && it.id === active;
  const disabled = !!it.disabled;
  const label = it.label || '';
  const lead = it.icon ? `<span class="ui-nav__ic">${icon(it.icon)}</span>` : '';
  const text = `<span class="ui-nav__label">${esc(label)}</span>`;
  const badge = navBadge(it.badge);
  const cls = cx('ui-nav__item', sub && 'ui-nav__item--sub', on && 'is-active', it.danger && 'is-danger', disabled && 'is-disabled');
  const name = collapsed ? ` aria-label="${esc(label)}" title="${esc(label)}"` : '';
  if (disabled) {
    return `<li><span class="${cls}" aria-disabled="true"${name}>${lead}${text}${badge}</span></li>`;
  }
  const attrs = [
    `class="${cls}"`,
    `href="${esc(it.href || '#' + (it.id ?? ''))}"`,
    it.target ? `target="${esc(it.target)}"` : '',
    on ? 'aria-current="page"' : '',
    name.trim(),
  ].filter(Boolean).join(' ');
  return `<li><a ${attrs}>${lead}${text}${badge}</a></li>`;
}

// A collapsible group: a toggle button (aria-expanded/-controls) over a nested
// list. In collapsed (icon-only) mode groups don't expand, so we render the
// group head as a plain, non-collapsing icon row.
function sideGroup(it, active, { collapsed } = {}) {
  const listId = nextId('nav-grp');
  const childActive = (it.items || []).some((c) => c.id != null && c.id === active);
  const open = collapsed ? false : (it.open != null ? !!it.open : childActive);
  const lead = it.icon ? `<span class="ui-nav__ic">${icon(it.icon)}</span>` : '';
  const label = it.label || '';
  const text = `<span class="ui-nav__label">${esc(label)}</span>`;
  const kids = (it.items || []).map((c) => sideLeaf(c, active, { collapsed, sub: true })).join('');
  const name = collapsed ? ` aria-label="${esc(label)}" title="${esc(label)}"` : '';
  const btn =
    `<button type="button" class="${cx('ui-nav__item', 'ui-nav__toggle', childActive && 'is-current')}"` +
    ` data-nav-toggle aria-expanded="${open ? 'true' : 'false'}" aria-controls="${listId}"${name}>` +
    `${lead}${text}<span class="ui-nav__caret" aria-hidden="true"></span></button>`;
  return `<li class="${cx('ui-nav__group', open && 'is-open')}">${btn}` +
    `<ul class="ui-nav__sub" id="${listId}"${open ? '' : ' hidden'}>${kids}</ul></li>`;
}

function sideItem(it, active, opts) {
  return (it.items && it.items.length) ? sideGroup(it, active, opts) : sideLeaf(it, active, opts);
}

// Sidebar nav. Pass `sections` ([{ label, items }]) or a flat `items` list.
//   items/section items: { id, label, icon?, href?, target?, badge?, danger?,
//                           disabled?, items?, open? }  (items ⇒ collapsible group)
//   active     id of the current item (gets aria-current="page")
//   collapsed  icon-only rail; labels fold into aria-label + title
//   footer     trusted HTML pinned below a divider (e.g. a sign-out link)
//   ariaLabel  accessible name for the <nav> landmark
export function sidebarNav({
  sections, items, active, collapsed = false, footer = '', ariaLabel = 'Sidebar', id,
} = {}) {
  const blocks = (sections && sections.length)
    ? sections
    : [{ items: items || [] }];
  const body = blocks.map((sec) => {
    const capId = sec.label ? nextId('nav-cap') : '';
    const cap = sec.label
      ? `<div class="ui-nav__cap" id="${capId}"${collapsed ? ' aria-hidden="true"' : ''}>${esc(sec.label)}</div>`
      : '';
    const list = `<ul class="ui-nav__list"${capId ? ` aria-labelledby="${capId}"` : ''}>` +
      (sec.items || []).map((it) => sideItem(it, active, { collapsed })).join('') + `</ul>`;
    return `<div class="ui-nav__section">${cap}${list}</div>`;
  }).join('');
  const foot = footer ? `<div class="ui-nav__foot">${footer}</div>` : '';
  return `<nav class="${cx('ui-nav', 'ui-nav--side', collapsed && 'is-collapsed')}"` +
    ` aria-label="${esc(ariaLabel)}"${id ? ` id="${esc(id)}"` : ''}>${body}${foot}</nav>`;
}

// Horizontal page tabs — links, not a tablist. `variant` picks the active
// affordance: 'underline' (default) or 'pill'.
//   items   { id, label, href?, target?, badge?, disabled? }
//   active  id of the current tab (aria-current="page")
export function navTabs({
  items = [], active, variant = 'underline', ariaLabel = 'Tabs', id,
} = {}) {
  const tabs = items.map((it) => {
    const on = it.id != null && it.id === active;
    const badge = navBadge(it.badge);
    const inner = `<span class="ui-nav__tab-label">${esc(it.label)}</span>${badge}`;
    if (it.disabled) {
      return `<span class="ui-nav__tab is-disabled" aria-disabled="true">${inner}</span>`;
    }
    const attrs = [
      `class="${cx('ui-nav__tab', on && 'is-active')}"`,
      `href="${esc(it.href || '#' + (it.id ?? ''))}"`,
      it.target ? `target="${esc(it.target)}"` : '',
      on ? 'aria-current="page"' : '',
    ].filter(Boolean).join(' ');
    return `<a ${attrs}>${inner}</a>`;
  }).join('');
  return `<nav class="${cx('ui-nav', 'ui-nav--tabs', `is-${variant}`)}"` +
    ` aria-label="${esc(ariaLabel)}"${id ? ` id="${esc(id)}"` : ''}>${tabs}</nav>`;
}

// Breadcrumb trail. The last crumb is the current page (aria-current="page",
// rendered as text). Earlier crumbs link when they carry an `href`.
//   items   { label, href?, target?, icon? }
export function breadcrumbs({ items = [], ariaLabel = 'Breadcrumb', id } = {}) {
  const last = items.length - 1;
  const crumbs = items.map((it, i) => {
    const lead = it.icon ? `<span class="ui-nav__ic">${icon(it.icon)}</span>` : '';
    const label = `<span class="ui-nav__crumb-label">${esc(it.label)}</span>`;
    const inner = `${lead}${label}`;
    const isLast = i === last;
    const cell = (!isLast && it.href)
      ? `<a class="ui-nav__crumb" href="${esc(it.href)}"${it.target ? ` target="${esc(it.target)}"` : ''}>${inner}</a>`
      : `<span class="${cx('ui-nav__crumb', isLast && 'is-current')}"${isLast ? ' aria-current="page"' : ''}>${inner}</span>`;
    return `<li class="ui-nav__crumb-item">${cell}</li>`;
  }).join('');
  return `<nav class="ui-nav ui-nav--crumbs" aria-label="${esc(ariaLabel)}"${id ? ` id="${esc(id)}"` : ''}>` +
    `<ol class="ui-nav__crumbs">${crumbs}</ol></nav>`;
}

// Umbrella dispatcher — the one thing to import when the variant is data-driven.
export function nav({ variant = 'sidebar', ...opts } = {}) {
  if (variant === 'tabs') return navTabs(opts);
  if (variant === 'breadcrumbs') return breadcrumbs(opts);
  return sidebarNav(opts);
}

// ---- Behaviour -----------------------------------------------------------
// Only the collapsible sidebar groups need JS: toggle a group's `.is-open` +
// its button's aria-expanded, and show/hide the nested list. Idempotent and
// event-delegated, so it's safe to call repeatedly (Storybook re-renders).
let _navGlobalWired = false;

function toggleGroup(btn) {
  const li = btn.closest('.ui-nav__group');
  const list = document.getElementById(btn.getAttribute('aria-controls'));
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', open ? 'false' : 'true');
  if (li) li.classList.toggle('is-open', !open);
  if (list) { if (open) list.setAttribute('hidden', ''); else list.removeAttribute('hidden'); }
}

export function wireNav(root = document) {
  // Per-collapsed-rail behaviour would go here; groups use one delegated handler.
  if (_navGlobalWired) return;
  _navGlobalWired = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-nav-toggle]');
    if (btn) { e.preventDefault(); toggleGroup(btn); }
  });
}
