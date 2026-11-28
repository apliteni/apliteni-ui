// Calls `read` now and on each resize of `elements`. Returns the function that stops the
// watch, or `null` where the page has no ResizeObserver, so the caller picks its fallback.
export function watchSize(elements: Element[], read: () => void): (() => void) | null {
  if (typeof ResizeObserver === 'undefined') return null;
  const observer = new ResizeObserver(read);
  for (const el of elements) observer.observe(el);
  read();
  return () => observer.disconnect();
}
