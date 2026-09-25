import { wireElements } from './lifecycle.js';
export function segmentedNextIndex(key, index, length) {
  if (!length) return null;
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % length;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + length) % length;
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  return null;
}

export function initSegmented(root = document) {
  return wireElements(root, '[data-seg]', 'segmented', (group, life) => {
    const buttons = () => [...group.querySelectorAll('button')].filter(b => !b.disabled);
    const pick = button => {
      group.querySelectorAll('button').forEach(b => {
        const active = b === button;
        b.setAttribute('aria-pressed', String(active));
        b.classList.toggle('is-active', active);
        b.tabIndex = active ? 0 : -1;
      });
      group.dispatchEvent(new group.ownerDocument.defaultView.CustomEvent('ui-segment-change', {
        bubbles: true, detail: { value: button.dataset.value },
      }));
    };
    const click = e => { const b = e.target.closest('button'); if (buttons().includes(b)) pick(b); };
    const keydown = e => {
      const list = buttons();
      const index = list.indexOf(e.target);
      if (index < 0) return;
      const next = segmentedNextIndex(e.key, index, list.length);
      if (next == null) return;
      e.preventDefault(); list[next].focus(); pick(list[next]);
    };
    life.on(group, 'click', click); life.on(group, 'keydown', keydown);
  });
}
