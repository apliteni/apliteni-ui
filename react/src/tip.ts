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
 * it has to.
 *
 * `host` must be the box the readout is positioned in: the three custom
 * properties below are written in its coordinates. `bound` narrows the
 * measurement to one element, for a part that keeps its readout inside itself.
 * why: docs/components.md#the-hover-readout
 */
export function placeTip(host: HTMLElement, mark: Element, tip: HTMLElement, bound?: Element, placement: 'top' | 'bottom' = 'top'): void {
  const mrect = mark.getBoundingClientRect();
  const rect = host.getBoundingClientRect();
  const view = host.ownerDocument.documentElement;
  const clip = { top: 0, left: 0, right: view.clientWidth, bottom: view.clientHeight };
  for (let el: HTMLElement | null = host; el && el !== host.ownerDocument.body; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (![style.overflow, style.overflowX, style.overflowY].some(v => v && v !== 'visible')) continue;
    const bounds = el.getBoundingClientRect();
    clip.top = Math.max(clip.top, bounds.top);
    clip.left = Math.max(clip.left, bounds.left);
    clip.right = Math.min(clip.right, bounds.right);
    clip.bottom = Math.min(clip.bottom, bounds.bottom);
  }
  if (bound) {
    const edge = bound.getBoundingClientRect();
    clip.top = Math.max(clip.top, edge.top);
    clip.left = Math.max(clip.left, edge.left);
    clip.right = Math.min(clip.right, edge.right);
    clip.bottom = Math.min(clip.bottom, edge.bottom);
  }
  const declared = parseFloat(getComputedStyle(tip).getPropertyValue('--ui-tip-gap'));
  const gap = Number.isFinite(declared) ? declared : TIP_GAP;
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
  tip.style.setProperty('--ui-tip-x', `${centre - rect.left - host.clientLeft + host.scrollLeft}px`);
  tip.style.setProperty('--ui-tip-y', `${(isBelow ? mrect.bottom : mrect.top) - rect.top - host.clientTop + host.scrollTop}px`);
  tip.style.setProperty('--ui-tip-shift', `${left - ideal}px`);
}
