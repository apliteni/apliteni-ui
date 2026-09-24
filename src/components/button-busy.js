import { slideButtonLabel } from '../lib/button-label.js';

const disabledBeforeBusy = new WeakMap();

/** Update a factory button in place, preserving its icons and prior disabled state. */
export function setButtonBusy(element, { busy, label } = {}) {
  const wasBusy = element.getAttribute('aria-busy') === 'true';
  if (busy && !wasBusy) disabledBeforeBusy.set(element, {
    disabled: element.hasAttribute('disabled'),
    ariaDisabled: element.getAttribute('aria-disabled'),
  });
  if (busy) {
    element.setAttribute('aria-busy', 'true');
    element.setAttribute('disabled', '');
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
}
