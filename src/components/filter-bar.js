import { lifecycle } from './lifecycle.js';
import { button, esc } from './index.js';
import { dropdown, wireDropdown } from './dropdown.js';

export function filterBar({ filters = [], label = 'Filters', clearLabel = 'Clear all filters', disabled = false, busy = false } = {}) {
  return `<fieldset class="ui-filter-bar" data-filter-bar${disabled || busy ? ' disabled' : ''}${busy ? ' aria-busy="true"' : ''}>`
    + `<legend class="ui-filter-bar__legend">${esc(label)}</legend>`
    + filters.map(filter => `<fieldset class="ui-filter-bar__chip" data-filter-id="${esc(filter.id)}"${filter.disabled ? ' disabled' : ''}>`
      + `<legend class="ui-filter-bar__legend">${esc(filter.label)}</legend>`
      + dropdown({ label: filter.label, value: filter.value, items: filter.items || [], variant: 'select', ariaLabel: `${filter.label}: ${filter.value}`, open: !!filter.open && !disabled && !busy && !filter.disabled })
      + `<button type="button" class="ui-filter-bar__remove" data-filter-remove aria-label="${esc(`Remove ${filter.label} filter`)}">×</button></fieldset>`).join('')
    + `<span data-filter-clear>${button({ label: clearLabel, size: 'sm', variant: 'ghost', disabled: !filters.length })}</span></fieldset>`;
}

// The host stays mounted; update() restores the action's focus after controlled removal.
export function initFilterBar(host, options = {}) {
  const life = lifecycle(host, 'filter-bar');
  if (!life.fresh) return life.api;
  let current = options;
  const focusKey = () => {
    const active = host.ownerDocument.activeElement;
    if (!host.contains(active)) return null;
    const chip = active.closest('[data-filter-id]');
    return { id: chip?.dataset.filterId, remove: active.hasAttribute('data-filter-remove'),
      index: [...host.querySelectorAll('[data-filter-id]')].indexOf(chip) };
  };
  let unwire = () => {};
  const wire = () => { unwire = wireDropdown(host); };
  life.add(() => unwire());
  const update = next => {
    if (!life.active) return;
    const focus = focusKey();
    unwire();
    current = next;
    host.innerHTML = filterBar(next); wire();
    if (!focus) return;
    const chips = [...host.querySelectorAll('[data-filter-id]')].filter(c => !c.disabled);
    const same = chips.find(c => c.dataset.filterId === focus.id);
    const target = same || chips[Math.min(Math.max(focus.index, 0), chips.length - 1)];
    const control = target?.querySelector(same && focus.remove ? '[data-filter-remove]' : '[data-dropdown-trigger]')
      || host.querySelector('[data-filter-clear] button');
    if (control && !control.disabled && !control.closest('fieldset:disabled')) control.focus();
    else { const bar = host.querySelector('[data-filter-bar]'); bar.tabIndex = -1; bar.focus(); }
  };
  const emit = (type, detail) => host.dispatchEvent(new host.ownerDocument.defaultView.CustomEvent(type, { bubbles: true, detail }));
  const click = e => {
    if (e.target.closest('fieldset:disabled')) return;
    const chip = e.target.closest('[data-filter-id]');
    if (e.target.closest('[data-filter-remove]')) emit('ui-filter-remove', { id: chip.dataset.filterId });
    else if (e.target.closest('[data-filter-clear] button')) emit('ui-filter-clear', {});
    else if (e.target.closest('[data-dd-item]')) {
      const item = e.target.closest('[data-dd-item]');
      if (item.getAttribute('aria-disabled') !== 'true') {
        const id = chip?.dataset.filterId, value = item.dataset.value;
        // Dropdown completes its own close/focus before the consumer replaces the markup.
        queueMicrotask(() => { if (life.active) emit('ui-filter-change', { id, value }); });
      }
    }
  };
  if (!host.querySelector('[data-filter-bar]')) host.innerHTML = filterBar(current);
  life.on(host, 'click', click, true); wire();
  life.api = { update, destroy: life.destroy };
  return life.api;
}
