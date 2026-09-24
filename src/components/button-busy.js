import { slideButtonLabel } from '../motion.js';

const disabledBeforeBusy = new WeakMap();
const wired = new WeakSet();

function wireActivationGuard(element) {
  if (wired.has(element)) return;
  const block = event => {
    if (element.getAttribute('aria-busy') !== 'true') return;
    if (event.type !== 'click' && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  for (const type of ['click', 'keydown', 'keyup']) element.addEventListener(type, block, true);
  element.setAttribute('data-btn-wired', '');
  wired.add(element);
}

/** Update a factory button in place, preserving its icons and prior disabled state. */
export function setButtonBusy(element, { busy, label } = {}) {
  wireActivationGuard(element);
  const wasBusy = element.getAttribute('aria-busy') === 'true';
  if ((busy || wasBusy) && !disabledBeforeBusy.has(element)) disabledBeforeBusy.set(element, {
    disabled: wasBusy ? element.hasAttribute('data-btn-disabled') : element.hasAttribute('disabled'),
    ariaDisabled: wasBusy && !element.hasAttribute('data-btn-disabled') ? null : element.getAttribute('aria-disabled'),
  });
  if (busy) {
    element.setAttribute('aria-busy', 'true');
    element.toggleAttribute('disabled', disabledBeforeBusy.get(element).disabled);
    element.setAttribute('aria-disabled', 'true');
    if (!element.querySelector('.ui-btn__bars')) {
      const bars = element.ownerDocument.createElement('span');
      bars.className = 'ui-btn__bars';
      bars.setAttribute('aria-hidden', 'true');
      bars.innerHTML = '<i></i><i></i>';
      element.append(bars);
    }
  } else if (wasBusy) {
    element.removeAttribute('aria-busy');
    element.querySelector('.ui-btn__bars')?.remove();
    const prior = disabledBeforeBusy.get(element);
    element.toggleAttribute('disabled', prior?.disabled ?? false);
    if (prior?.ariaDisabled != null) element.setAttribute('aria-disabled', prior.ariaDisabled);
    else element.removeAttribute('aria-disabled');
    disabledBeforeBusy.delete(element);
  }
  const text = element.querySelector('.ui-btn__label');
  if (label != null && text && text.textContent !== String(label)) {
    const previous = text.cloneNode(true);
    text.textContent = String(label);
    slideButtonLabel(text, previous);
  } else if (label != null && element.classList.contains('ui-btn--icon')) {
    element.setAttribute('aria-label', String(label));
    element.setAttribute('title', String(label));
  }
  if (label != null && (busy || wasBusy)) {
    let status = element.nextElementSibling;
    if (!status?.classList.contains('ui-btn__status')) {
      status = element.ownerDocument.createElement('span');
      status.className = 'ui-sr ui-btn__status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      element.after(status);
      // A caller retaining only the button discarded the factory's empty region.
      setTimeout(() => {
        status.textContent = element.querySelector('.ui-btn__label')?.textContent ?? element.getAttribute('aria-label') ?? '';
      }, 0);
    } else if (status.textContent !== String(label)) status.textContent = String(label);
  }
}
