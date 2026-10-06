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

// Whether the row scrolls AT ALL is measured here, because a sheet cannot ask whether
// the links fit. A scroll box clips its children's paint at its padding edge, and the
// ring's halo reaches about 14px against the 4px of padding inside the box — so a row
// with room to spare was still cutting the halo off every ring in it, at 1280 as much
// as at 390. `data-nav-fit` takes the overflow back off that row; it is an attribute
// rather than a class because React owns the class attribute on its own row. The
// padding and the negative margins stay in both states, so no tab moves. One pixel of
// slack absorbs what a fractional column leaves between the two numbers, and spills
// into the margin the row already bleeds. A row with no layout yet — folded away, or a
// JSDOM tree — keeps the scroll box the sheet wrote, which holds a narrow row inside
// the page. #429
function fitNav(nav) {
  nav.removeAttribute('data-nav-fit');
  if (!nav.clientWidth) return;
  if (nav.scrollWidth - nav.clientWidth <= 1) nav.setAttribute('data-nav-fit', '');
}

// Size the row to its links and reveal the current route, without scrolling the page
// or moving focus. Both halves want the same moments: a load, a resize, a route
// change, a row whose links were replaced.
export function revealCurrentNav(nav) {
  fitNav(nav);
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
