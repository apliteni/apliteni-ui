// Where a kit readout opens. Shared by <Tooltip> and <Chart>, which is the
// whole reason it is a module: a chart that copied this would drift from the
// placement the specification states, and the flip test is the part that drifts
// first.
// why: docs/components.md#tooltip

const TIP_GAP = 8;

/**
 * Place `tip` against `mark` inside `host`, on the preferred side and centred.
 * Flip only when that side is short and the other side has more room. Room is
 * measured inside the viewport, less TIP_GAP at each edge, and inside every
 * ancestor whose overflow clips.
 * It then slides along the mark's edge to stay inside that box, no further than
 * it has to. A readout in the top layer, an open popover, is placed in the view's
 * coordinates. No ancestor can cut it there, so an ancestor too small to hold it
 * beside the mark, such as a cut table cell, does not bound it.
 *
 * Otherwise `host` must be the box the readout is positioned in: the three custom
 * properties below are written in its coordinates.
 * why: docs/components.md#tooltip
 */
export function placeTip(host: HTMLElement, mark: Element, tip: HTMLElement, placement: 'top' | 'bottom' = 'top'): void {
  const mrect = mark.getBoundingClientRect();
  const view = host.ownerDocument.documentElement;
  const declared = parseFloat(getComputedStyle(tip).getPropertyValue('--ui-tip-gap'));
  const gap = Number.isFinite(declared) ? declared : TIP_GAP;
  // The readout keeps TIP_GAP from each edge of the view.
  const clip = { top: TIP_GAP, left: TIP_GAP, right: view.clientWidth - TIP_GAP, bottom: view.clientHeight - TIP_GAP };
  const layered = typeof tip.showPopover === 'function' && tip.matches(':popover-open');
  for (let el: HTMLElement | null = host; el && el !== host.ownerDocument.body; el = el.parentElement) {
    const style = getComputedStyle(el);
    // Overflow does not apply to an inline box.
    if (style.display === 'inline' || ![style.overflow, style.overflowX, style.overflowY].some(v => v && v !== 'visible')) continue;
    // In the top layer, an ancestor too small to hold the readout cannot cut it.
    if (layered && (el.clientWidth < tip.offsetWidth || el.clientHeight < mrect.height + gap + tip.offsetHeight)) continue;
    // The padding box clips, inside the border and a scroll bar.
    const edge = el.getBoundingClientRect();
    const top = edge.top + el.clientTop;
    const left = edge.left + el.clientLeft;
    clip.top = Math.max(clip.top, top);
    clip.left = Math.max(clip.left, left);
    clip.right = Math.min(clip.right, left + el.clientWidth);
    clip.bottom = Math.min(clip.bottom, top + el.clientHeight);
  }
  const above = mrect.top - clip.top;
  const below = clip.bottom - mrect.bottom;
  const prefersBelow = placement === 'bottom';
  const flip = prefersBelow
    ? below < tip.offsetHeight + gap && above > below
    : above < tip.offsetHeight + gap && below > above;
  const isBelow = prefersBelow !== flip;
  tip.classList.toggle('is-below', isBelow);
  const centre = mrect.left + mrect.width / 2;
  const ideal = centre - tip.offsetWidth / 2;
  const left = Math.max(clip.left, Math.min(ideal, clip.right - tip.offsetWidth));
  const y = isBelow ? mrect.bottom : mrect.top;
  // The view's coordinates in the top layer, the host's otherwise.
  const rect = layered ? null : host.getBoundingClientRect();
  tip.style.setProperty('--ui-tip-x', `${rect ? centre - rect.left - host.clientLeft + host.scrollLeft : centre}px`);
  tip.style.setProperty('--ui-tip-y', `${rect ? y - rect.top - host.clientTop + host.scrollTop : y}px`);
  tip.style.setProperty('--ui-tip-shift', `${left - ideal}px`);
}
