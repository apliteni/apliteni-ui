// The hover delay. A pointer that crosses a mark on its way somewhere else opens
// nothing. Once a readout has closed, the next one opens at once for the skip
// window, so a pointer moving along a row of marks does not wait at each.
const OPEN_DELAY = 300;
const SKIP_WINDOW = 300;
let lastClose = -Infinity;

/** How long a hover waits before it opens a readout, in milliseconds. */
export const hoverWait = () => (Date.now() - lastClose < SKIP_WINDOW ? 0 : OPEN_DELAY);

/** A readout closed: the skip window starts now. */
export function noteClose() {
  lastClose = Date.now();
}
