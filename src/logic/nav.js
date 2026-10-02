// Reveal the current route without scrolling the page or moving focus.
export function revealCurrentNav(nav) {
  const current = nav.querySelector('[aria-current="page"]');
  if (!current || nav.scrollWidth <= nav.clientWidth) return;
  const bounds = nav.getBoundingClientRect();
  const item = current.getBoundingClientRect();
  const style = nav.ownerDocument.defaultView.getComputedStyle(nav);
  const left = bounds.left + (parseFloat(style.paddingLeft) || 0);
  const right = bounds.right - (parseFloat(style.paddingRight) || 0);
  if (item.left < left) nav.scrollLeft += item.left - left;
  else if (item.right > right) nav.scrollLeft += item.right - right;
}
