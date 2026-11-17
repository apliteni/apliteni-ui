// Where a kit readout opens. Shared by <Tooltip> and <Chart>, which is the
// whole reason it is a module: a chart that copied this would drift from the
// placement the specification states, and the flip test is the part that drifts
// first.
// why: docs/components.md#the-hover-readout

const TIP_GAP = 8;

/**
 * Place `tip` against `mark` inside `host`, on the preferred side and centred.
 * Flip only when that side is short and the other side has more room. Room is
 * measured inside the viewport and inside every ancestor whose overflow clips.
 * It then slides along the mark's edge to stay inside that box, no further than
 * it has to. An ancestor too small to hold the readout beside the mark, such as
 * a cut table cell, cannot keep it: the readout is lifted out of it, fixed to the
 * view, and stays inside the others.
 *
 * `host` must be the box the readout is positioned in: the three custom
 * properties below are written in its coordinates. `bound` narrows the
 * measurement to one element, for a part that keeps its readout inside itself.
 * why: docs/components.md#the-hover-readout
 */
export function placeTip(host: HTMLElement, mark: Element, tip: HTMLElement, bound?: Element, placement: 'top' | 'bottom' = 'top'): void {
  const mrect = mark.getBoundingClientRect();
  const view = host.ownerDocument.documentElement;
  const declared = parseFloat(getComputedStyle(tip).getPropertyValue('--ui-tip-gap'));
  const gap = Number.isFinite(declared) ? declared : TIP_GAP;
  const clip = { top: 0, left: 0, right: view.clientWidth, bottom: view.clientHeight };
  let lifted = false;
  for (let el: HTMLElement | null = host; el && el !== host.ownerDocument.body; el = el.parentElement) {
    const style = getComputedStyle(el);
    // Overflow does not apply to an inline box.
    if (style.display === 'inline' || ![style.overflow, style.overflowX, style.overflowY].some(v => v && v !== 'visible')) continue;
    // The padding box clips, inside the border and a scroll bar.
    if (el.clientWidth < tip.offsetWidth || el.clientHeight < mrect.height + gap + tip.offsetHeight) {
      lifted = true;
      continue;
    }
    const edge = el.getBoundingClientRect();
    const top = edge.top + el.clientTop;
    const left = edge.left + el.clientLeft;
    clip.top = Math.max(clip.top, top);
    clip.left = Math.max(clip.left, left);
    clip.right = Math.min(clip.right, left + el.clientWidth);
    clip.bottom = Math.min(clip.bottom, top + el.clientHeight);
  }
  if (bound) {
    const edge = bound.getBoundingClientRect();
    clip.top = Math.max(clip.top, edge.top);
    clip.left = Math.max(clip.left, edge.left);
    clip.right = Math.min(clip.right, edge.right);
    clip.bottom = Math.min(clip.bottom, edge.bottom);
  }
  const above = mrect.top - clip.top;
  const below = clip.bottom - mrect.bottom;
  const prefersBelow = placement === 'bottom';
  const flip = prefersBelow
    ? below < tip.offsetHeight + gap && above > below
    : above < tip.offsetHeight + gap && below > above;
  const isBelow = prefersBelow !== flip;
  tip.classList.toggle('is-below', isBelow);
  tip.toggleAttribute('data-tip-lifted', lifted);
  const centre = mrect.left + mrect.width / 2;
  const ideal = centre - tip.offsetWidth / 2;
  const left = Math.max(clip.left, Math.min(ideal, clip.right - tip.offsetWidth));
  const y = isBelow ? mrect.bottom : mrect.top;
  // A lifted readout is placed in the view's coordinates, the host's otherwise.
  const rect = lifted ? null : host.getBoundingClientRect();
  tip.style.setProperty('--ui-tip-x', `${rect ? centre - rect.left - host.clientLeft + host.scrollLeft : centre}px`);
  tip.style.setProperty('--ui-tip-y', `${rect ? y - rect.top - host.clientTop + host.scrollTop : y}px`);
  tip.style.setProperty('--ui-tip-shift', `${left - ideal}px`);
  if (!lifted) return;
  // A transformed ancestor is the frame a fixed box is placed in: move by what it adds.
  const at = tip.getBoundingClientRect();
  const dx = left - at.left;
  const dy = (isBelow ? y + gap : y - gap - tip.offsetHeight) - at.top;
  if (dx || dy) {
    tip.style.setProperty('--ui-tip-x', `${centre + dx}px`);
    tip.style.setProperty('--ui-tip-y', `${y + dy}px`);
  }
}
