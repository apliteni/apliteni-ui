// A tab row's padding is the room its links' focus rings are painted in, so an item
// brought to the row's CONTENT edge keeps its whole ring inside the scroll box: the
// solid band reaches --ring-gap-width + --ring-width = 3px out of a 4px padding.
// Both readers below want that edge — the current route so its label is not cut off,
// a link Tab landed on so its ring is not. Neither moves focus or scrolls the page;
// only the row's own scrollLeft changes.
function revealNavItem(nav, item) {
  if (!item || nav.scrollWidth <= nav.clientWidth) return;
  const bounds = nav.getBoundingClientRect();
  const box = item.getBoundingClientRect();
  const style = nav.ownerDocument.defaultView.getComputedStyle(nav);
  const left = bounds.left + (parseFloat(style.paddingLeft) || 0);
  const right = bounds.right - (parseFloat(style.paddingRight) || 0);
  if (box.left < left) nav.scrollLeft += box.left - left;
  else if (box.right > right) nav.scrollLeft += box.right - right;
}

// Reveal the current route without scrolling the page or moving focus.
export function revealCurrentNav(nav) {
  revealNavItem(nav, nav.querySelector('[aria-current="page"]'));
}

// Reveal the tab a focus event landed on. Chromium brings a focused child to the
// scroll box's own edge at best, which is the ring's room rather than the label's,
// so the solid band is clipped by the pixels the link hangs out: measured at 390px,
// 3.86px on the underline row and 13.86px on the pill row, with scrollLeft left at
// 0. Repaying the padding puts the band back inside. #429
export function revealFocusedNav(nav, target) {
  const item = target && target.closest ? target.closest('.ui-nav__tab') : null;
  if (item && nav.contains(item)) revealNavItem(nav, item);
}
