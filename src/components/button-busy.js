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
export function setButtonBusy(element, { busy } = {}) {
  wireActivationGuard(element);
  const wasBusy = element.getAttribute('aria-busy') === 'true';
  if ((busy || wasBusy) && !disabledBeforeBusy.has(element)) disabledBeforeBusy.set(element, {
    disabled: wasBusy ? element.hasAttribute('data-btn-disabled') : element.hasAttribute('disabled'),
    ariaDisabled: wasBusy && !element.hasAttribute('data-btn-disabled') ? null : element.getAttribute('aria-disabled'),
  });
  if (busy) {
    element.removeAttribute('data-btn-ready');
    element.setAttribute('aria-busy', 'true');
    element.toggleAttribute('disabled', disabledBeforeBusy.get(element).disabled);
    element.setAttribute('aria-disabled', 'true');
    if (!element.querySelector('.ui-btn__dots')) {
      const dots = element.ownerDocument.createElement('span');
      dots.className = 'ui-btn__dots';
      dots.setAttribute('aria-hidden', 'true');
      dots.innerHTML = '<i></i><i></i><i></i>';
      element.append(dots);
    }
  } else if (wasBusy) {
    element.setAttribute('data-btn-ready', '');
    element.removeAttribute('aria-busy');
    element.querySelector('.ui-btn__dots')?.remove();
    const prior = disabledBeforeBusy.get(element);
    element.toggleAttribute('disabled', prior?.disabled ?? false);
    if (prior?.ariaDisabled != null) element.setAttribute('aria-disabled', prior.ariaDisabled);
    else element.removeAttribute('aria-disabled');
    disabledBeforeBusy.delete(element);
  }
  if (busy || wasBusy) {
    let status = element.nextElementSibling;
    if (!status?.classList.contains('ui-btn__status')) {
      status = element.ownerDocument.createElement('span');
      status.className = 'ui-sr ui-btn__status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      element.after(status);
      // Register the empty live region before its first text update.
      setTimeout(() => {
        status.textContent = messageFor(element);
      }, 0);
    } else {
      const message = messageFor(element);
      if (status.textContent !== message) status.textContent = message;
    }
  }
}

function messageFor(element) {
  const name = element.querySelector('.ui-btn__label')?.textContent ?? element.getAttribute('aria-label') ?? 'Button';
  return `${name}: ${element.getAttribute('aria-busy') === 'true' ? 'in progress' : 'complete'}`;
}
