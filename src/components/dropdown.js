// Dropdown — the kit's one popover-list primitive. A trigger (label + optional
// value + rotating chevron) opens a panel of item rows (label, optional
// description, optional leading icon, optional trailing badge, selected +
// disabled state). Two flavours share the same panel + the same open/close JS:
//
//   variant: 'select'  → role="listbox" / role="option", value shown in trigger
//   variant: 'menu'    → role="menu"    / role="menuitem", action list
//
// "dropdown" (not "menu" or "select") is deliberate: `menu` implies actions
// only and `select` implies a form control bound to a value — this factory is
// the umbrella both of those are specialisations of, and it's the word the
// issue and the topbar already use. The topbar's version switcher and account
// menu are thin consumers of the SAME wiring (wireDropdown) so there is exactly
// one open/close/click-outside/Esc/keyboard implementation in the kit.
//
//   container.innerHTML = dropdown({ label: 'version:', value: '…', items });
//   wireDropdown(container);   // or let wireTopbar() do it (it calls this)
import { esc, icon } from './index.js';

const cx = (...a) => a.filter(Boolean).join(' ');

// A trailing status badge. `badge` is a string ("live") or { text, tone }.
function ddBadge(badge) {
  if (!badge) return '';
  const text = typeof badge === 'string' ? badge : badge.text;
  let tone = typeof badge === 'string' ? '' : (badge.tone || '');
  if (!tone) tone = /^live$/i.test(text) ? 'live' : 'neutral';
  return `<span class="${cx('ui-dropdown__badge', `is-${tone}`)}">${esc(text)}</span>`;
}

// One item row. `listbox` picks role=option (selectable) vs role=menuitem (action).
function ddItem(it, listbox) {
  if (it === '---' || it.separator) return '<div class="ui-dropdown__sep" role="separator"></div>';
  const disabled = !!it.disabled;
  const selected = !!it.selected;
  const role = listbox ? 'option' : 'menuitem';
  const asLink = !!it.href && !disabled && !listbox;
  const tag = asLink ? 'a' : 'div';
  const lead = it.icon ? `<span class="ui-dropdown__ic">${icon(it.icon)}</span>` : '';
  const desc = it.description ? `<span class="ui-dropdown__desc">${esc(it.description)}</span>` : '';
  const main = `<span class="ui-dropdown__main"><span class="ui-dropdown__label">${esc(it.label)}</span>${desc}</span>`;
  const badge = ddBadge(it.badge);
  const tick = listbox ? `<span class="ui-dropdown__tick" aria-hidden="true">${icon('check')}</span>` : '';
  const attrs = [
    `class="${cx('ui-dropdown__item', selected && 'is-selected', disabled && 'is-disabled', it.danger && 'is-danger')}"`,
    'data-dd-item',
    `role="${role}"`,
    'tabindex="-1"',
    it.value != null ? `data-value="${esc(it.value)}"` : '',
    listbox ? `aria-selected="${selected ? 'true' : 'false'}"` : '',
    disabled ? 'aria-disabled="true"' : '',
    asLink ? `href="${esc(it.href)}"` : '',
    asLink && it.target ? `target="${esc(it.target)}"` : '',
  ].filter(Boolean).join(' ');
  return `<${tag} ${attrs}>${lead}${main}${badge}${tick}</${tag}>`;
}

// Render a flat item list or grouped sections ([{ label, items }]).
function ddBody({ items, sections }, listbox) {
  if (sections && sections.length) {
    return sections.map((s) => {
      const head = s.label ? `<div class="ui-dropdown__group" role="presentation">${esc(s.label)}</div>` : '';
      return `<div class="ui-dropdown__section" role="group"${s.label ? ` aria-label="${esc(s.label)}"` : ''}>${head}${(s.items || []).map((it) => ddItem(it, listbox)).join('')}</div>`;
    }).join('');
  }
  return (items || []).map((it) => ddItem(it, listbox)).join('');
}

// The public factory. Returns an HTML string; wire it with wireDropdown().
//   label       muted prefix in the trigger (e.g. "version:")
//   value       current value shown in the trigger (single-select)
//   placeholder shown when there's no value
//   variant     'select' (listbox) | 'menu' (default inferred from items)
//   items       [{ label, value?, description?, icon?, badge?, selected?, disabled?, href?, danger? }]
//   sections    [{ label, items }] — grouped alternative to items
//   header/footer  raw HTML blocks pinned top/bottom of the panel
//   align       'start' (default) | 'end'  — which edge the panel hugs
//   scroll      true | maxHeight px — cap panel height and scroll
//   open        render already-open (handy for screenshots)
//   ariaLabel   accessible name for the panel (and trigger, if no visible text)
export function dropdown({
  label, value, placeholder = 'Select…', variant, items, sections,
  header = '', footer = '', triggerContent, triggerClass = '', chevron = true,
  align = 'start', scroll = false, open = false, ariaLabel, id, panelClass = '',
} = {}) {
  const flat = sections ? sections.flatMap((s) => s.items || []) : (items || []);
  const isSelect = variant === 'select' || (variant == null && flat.some((it) => it && (it.selected || it.value != null)));
  const listRole = isSelect ? 'listbox' : 'menu';
  const cur = value != null ? value : (isSelect ? (flat.find((it) => it && it.selected)?.label) : null);

  const trig = triggerContent != null
    ? triggerContent
    : `${label ? `<span class="ui-dropdown__pre">${esc(label)}</span>` : ''}` +
      `<span class="ui-dropdown__value">${esc(cur != null ? cur : placeholder)}</span>`;
  const triggerAttrs = [
    `class="${cx('ui-dropdown__trigger', triggerClass)}"`,
    'type="button"',
    'data-dropdown-trigger',
    `aria-haspopup="${listRole}"`,
    `aria-expanded="${open ? 'true' : 'false'}"`,
    ariaLabel && triggerContent != null ? `aria-label="${esc(ariaLabel)}"` : '',
  ].filter(Boolean).join(' ');

  const panelAttrs = [
    `class="${cx('ui-dropdown__panel', align === 'end' && 'is-end', scroll && 'is-scroll', panelClass)}"`,
    'data-dropdown-panel',
    `role="${listRole}"`,
    ariaLabel ? `aria-label="${esc(ariaLabel)}"` : '',
    scroll && scroll !== true ? `style="max-height:${typeof scroll === 'number' ? scroll + 'px' : esc(scroll)}"` : '',
  ].filter(Boolean).join(' ');

  return `<div class="${cx('ui-dropdown', open && 'open')}" data-dropdown${isSelect ? ' data-dropdown-select' : ''}${id ? ` id="${esc(id)}"` : ''}>` +
    `<button ${triggerAttrs}>${trig}${chevron ? '<span class="ui-dropdown__chevron" aria-hidden="true"></span>' : ''}</button>` +
    `<div ${panelAttrs}>${header}${ddBody({ items, sections }, isSelect)}${footer}</div>` +
    `</div>`;
}

// ---- Shared behaviour ----------------------------------------------------
// One implementation for every dropdown in the kit — the generic component AND
// the topbar's version switcher / account menu (they emit the same data hooks:
// [data-dropdown] > [data-dropdown-trigger] + [data-dropdown-panel], toggling
// `.open` on the container so each keeps its own visual CSS).
//
// Per-instance trigger + keyboard handlers are attached once (guarded by a flag
// on the element). Document-level click-outside + Esc are attached once per
// document. Safe to call repeatedly (e.g. Storybook re-renders).
let _ddGlobalWired = false;

function ddItemsOf(dd) {
  const panel = dd.querySelector('[data-dropdown-panel]');
  if (!panel) return [];
  return Array.from(panel.querySelectorAll('[data-dd-item]'))
    .filter((el) => el.getAttribute('aria-disabled') !== 'true');
}

function closeDropdown(dd) {
  if (!dd.classList.contains('open')) return;
  dd.classList.remove('open');
  dd.querySelector('[data-dropdown-trigger]')?.setAttribute('aria-expanded', 'false');
}

function closeAllDropdowns(except) {
  document.querySelectorAll('[data-dropdown].open').forEach((dd) => { if (dd !== except) closeDropdown(dd); });
}

function openDropdown(dd, focusIdx) {
  closeAllDropdowns(dd);
  dd.classList.add('open');
  dd.querySelector('[data-dropdown-trigger]')?.setAttribute('aria-expanded', 'true');
  if (focusIdx != null) {
    const items = ddItemsOf(dd);
    const sel = items.findIndex((el) => el.getAttribute('aria-selected') === 'true');
    (items[focusIdx === 'selected' && sel >= 0 ? sel : (focusIdx === 'selected' ? 0 : focusIdx)] || items[0])?.focus();
  }
}

// Single-select: reflect the picked option into aria-selected + the trigger value.
function selectOption(dd, item) {
  if (!dd.hasAttribute('data-dropdown-select')) return;
  ddItemsOf(dd).forEach((el) => el.setAttribute('aria-selected', el === item ? 'true' : 'false'));
  dd.querySelectorAll('[data-dd-item].is-selected').forEach((el) => el.classList.remove('is-selected'));
  item.classList.add('is-selected');
  const valueEl = dd.querySelector('[data-dropdown-trigger] .ui-dropdown__value');
  const label = item.querySelector('.ui-dropdown__label');
  if (valueEl && label) valueEl.textContent = label.textContent;
}

export function wireDropdown(root = document) {
  const scope = root === document ? document : root;
  scope.querySelectorAll('[data-dropdown]').forEach((dd) => {
    if (dd.__ddWired) return;
    dd.__ddWired = true;
    const trigger = dd.querySelector('[data-dropdown-trigger]');
    const panel = dd.querySelector('[data-dropdown-panel]');
    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dd.classList.contains('open')) closeDropdown(dd);
      else openDropdown(dd);
    });

    if (panel) {
      // Clicks inside the panel shouldn't reach the document close handler;
      // activating an item selects (single-select) + closes.
      panel.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = e.target.closest('[data-dd-item]');
        if (!item || item.getAttribute('aria-disabled') === 'true') return;
        selectOption(dd, item);
        closeDropdown(dd);
        trigger.focus();
      });
    }

    dd.addEventListener('keydown', (e) => {
      const open = dd.classList.contains('open');
      const onTrigger = e.target === trigger;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && (onTrigger || open)) {
        e.preventDefault();
        if (!open) return openDropdown(dd, e.key === 'ArrowDown' ? 0 : 'selected');
        const items = ddItemsOf(dd);
        const i = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next < 0 ? 0 : next]?.focus();
      } else if (e.key === 'Home' && open) {
        e.preventDefault(); ddItemsOf(dd)[0]?.focus();
      } else if (e.key === 'End' && open) {
        e.preventDefault(); const it = ddItemsOf(dd); it[it.length - 1]?.focus();
      } else if ((e.key === 'Enter' || e.key === ' ') && open && e.target.matches('[data-dd-item]')) {
        e.preventDefault(); e.target.click();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault(); e.stopPropagation(); closeDropdown(dd); trigger.focus();
      } else if (e.key === 'Tab' && open) {
        closeDropdown(dd);
      }
    });
  });

  if (!_ddGlobalWired) {
    _ddGlobalWired = true;
    document.addEventListener('click', () => closeAllDropdowns());
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = document.querySelector('[data-dropdown].open');
      if (open) { closeDropdown(open); open.querySelector('[data-dropdown-trigger]')?.focus(); }
    });
  }
}
