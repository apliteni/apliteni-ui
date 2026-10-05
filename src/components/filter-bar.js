import { button, esc } from './index.js';
import { dropdown, wireDropdown } from './dropdown.js';
import { filterChipText, filterChipName, filterChipUnset, focusNextStop } from '../logic/filter-bar.js';

export function filterBar({ filters = [], label = 'Filters', clearLabel = 'Clear all filters', disabled = false, busy = false } = {}) {
  return `<fieldset class="ui-filter-bar" data-filter-bar${disabled || busy ? ' disabled' : ''}${busy ? ' aria-busy="true"' : ''}>`
    + `<legend class="ui-filter-bar__legend">${esc(label)}</legend>`
    + filters.map(filter => `<fieldset class="ui-filter-bar__chip" data-filter-id="${esc(filter.id)}"${filter.disabled ? ' disabled' : ''}>`
      + `<legend class="ui-filter-bar__legend">${esc(filter.label)}</legend>`
      + dropdown({ items: filter.items || [], variant: 'select',
        // The chip prints one line; the field's name reaches a reader through the
        // trigger's name and the chip's own legend. why: docs/specification.md#dense-financial-tables
        triggerContent: `<span class="${filterChipUnset(filter) ? 'ui-dropdown__value is-placeholder' : 'ui-dropdown__value'}">${esc(filterChipText(filter))}</span>`,
        ariaLabel: filterChipName(filter), open: !!filter.open && !disabled && !busy && !filter.disabled })
      + `<button type="button" class="ui-filter-bar__remove" data-filter-remove aria-label="${esc(`Remove ${filter.label} filter`)}">×</button></fieldset>`).join('')
    // Nothing to clear, no control: an unavailable action standing in an empty
    // row is the only thing in it, and it reads as a bar that has been turned
    // off rather than one with no filters on it. It is the kit's own `one-page`
    // rule — a control with no action to offer is not shown. It returns with
    // the first chip, in the bordered skin rather than the ghost one, because a
    // live action beside two chips has to read as live.
    // why: docs/specification.md#a-filter-row-holds-its-panels
    + (filters.length
      ? `<span data-filter-clear>${button({ label: clearLabel, size: 'sm' })}</span>`
      : '')
    + '</fieldset>';
}

// The host stays mounted; update() restores the action's focus after controlled removal.
export function initFilterBar(host, options = {}) {
  let current = options;
  const focusKey = () => {
    const active = host.ownerDocument.activeElement;
    if (!host.contains(active)) return null;
    const chip = active.closest('[data-filter-id]');
    return { id: chip?.dataset.filterId, remove: active.hasAttribute('data-filter-remove'),
      index: [...host.querySelectorAll('[data-filter-id]')].indexOf(chip) };
  };
  const wire = () => wireDropdown(host);
  const update = next => {
    const focus = focusKey();
    current = next;
    host.innerHTML = filterBar(next); wire();
    if (!focus) return;
    const chips = [...host.querySelectorAll('[data-filter-id]')].filter(c => !c.disabled);
    const same = chips.find(c => c.dataset.filterId === focus.id);
    const target = same || chips[Math.min(Math.max(focus.index, 0), chips.length - 1)];
    const control = target?.querySelector(same && focus.remove ? '[data-filter-remove]' : '[data-dropdown-trigger]')
      || host.querySelector('[data-filter-clear] button');
    if (control && !control.disabled && !control.closest('fieldset:disabled')) control.focus();
    // No control of its own left to hold it: the shared pair decides where the
    // focus goes and checks that it arrived. why: src/logic/filter-bar.js
    else focusNextStop(host);
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
        queueMicrotask(() => {
          // Dropdown writes the picked row's label into the trigger; the name it is
          // read by follows it, so the two cannot disagree while the consumer answers.
          const filter = (current.filters || []).find(f => f.id === id);
          const trigger = chip?.querySelector('[data-dropdown-trigger]');
          const span = trigger?.querySelector('.ui-dropdown__value');
          const shown = span?.textContent;
          if (filter && trigger) trigger.setAttribute('aria-label', filterChipName({ ...filter, value: shown }));
          // A chip that was empty stops being a placeholder the moment it shows a pick.
          if (span) span.classList.toggle('is-placeholder', filterChipUnset({ value: shown }));
          emit('ui-filter-change', { id, value });
        });
      }
    }
  };
  if (!host.querySelector('[data-filter-bar]')) host.innerHTML = filterBar(current);
  host.addEventListener('click', click, true); wire();
  return { update, destroy: () => host.removeEventListener('click', click, true) };
}
