import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { watchSize } from './watch-size';

type TableRef = RefObject<HTMLTableElement | null>;

// The box the strip sits in, held as state and not as a ref: the strip is conditional,
// and an effect reading a ref cannot see one arrive. A surface that supplies its own pager
// and later asks for this one left the arriving strip uncapped, because the dependencies
// below — the columns and the rows — are exactly what such a caller keeps still (#504).
export function usePagerStrip(table: TableRef, columns: unknown, rows: unknown) {
  const [pagerHost, setPagerHost] = useState<HTMLElement | null>(null);
  const holdPagerBox = useCallback(
    (box: HTMLDivElement | null) => setPagerHost(box?.parentElement ?? null), []);
  const [strip, setStrip] = useState<{ width: number; inset: number }>();
  // The strip starts where the table starts and ends where it ends, read against the box
  // the strip itself sits in rather than against the table's own parent: a scroll region
  // insets the table 4px inside itself, and a dense table in a card is bled 16px out of it,
  // so neither edge can be copied from the table's width alone. A table bled past its
  // container keeps the strip inside — only the table hangs into a card's padding.
  // A width of zero is no measurement: jsdom and a page that has not laid out yet both
  // report one, and a cap of zero would collapse the strip rather than leave it alone.
  useEffect(() => {
    const el = table.current;
    const host = pagerHost;
    const stop = el && host && watchSize([el], () => {
      const rect = el.getBoundingClientRect();
      const box = host.getBoundingClientRect();
      const left = box.left + host.clientLeft
        + (Number.parseFloat(getComputedStyle(host).paddingLeft) || 0);
      const inset = Math.max(0, rect.left - left);
      const width = rect.right - left - inset;
      setStrip(width > 0 ? { width, inset } : undefined);
    });
    // No strip, no cap to keep: a width measured for the last one would reach the next.
    if (!stop) setStrip(undefined);
    return stop || undefined;
  }, [pagerHost, columns, rows]);
  return { holdPagerBox, strip };
}

// The frame is a tab stop only while its content overflows: a stop that scrolls nothing
// leads nowhere. It is read again on each resize of the frame or the table. Without a
// ResizeObserver the frame stays a stop, so the far columns stay reachable.
export function useFrameOverflow(table: TableRef, scrollable: unknown) {
  const frame = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(true);
  useEffect(() => {
    const box = frame.current;
    const el = table.current;
    if (!box || !el) return;
    return watchSize([box, el], () => setOverflows(
      box.scrollWidth > box.clientWidth || box.scrollHeight > box.clientHeight)) ?? undefined;
  }, [scrollable]);
  return { frame, overflows };
}

// An engine scrolls a focused control into the frame's view only when the control is
// fully hidden, so a Tab to a control that shows in part leaves it cut. A focus that
// the keyboard or a script moves brings the whole control in. A pointer's focus is left
// alone, so a click does not move its target. The frame and a card that scrolls the
// table both do this.
export function useFocusReveal() {
  const pressed = useRef(false);
  const reveal = (e: { target: EventTarget | null }) => {
    if (!pressed.current) (e.target as Element).scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  const press = (down: boolean) => () => { pressed.current = down; };
  return { reveal, press };
}

// A table that is not sticky or pinned sits directly in a card, and the card scrolls it
// sideways (card.css `.ui-card:has(> .ui-table)`). The card is then the scroll region, so it
// takes the name and keyboard access the `.ui-table-scroll` frame takes. The attributes are
// written on the card and removed when the table leaves, because the card's own render does
// not know the table. why: docs/components.md#data-table
export function useCardRegion(table: TableRef, scrollable: unknown, scrollLabel: string,
  { reveal, press }: ReturnType<typeof useFocusReveal>) {
  useEffect(() => {
    if (scrollable) return;
    const el = table.current;
    const card = el?.parentElement;
    if (!el || !card || !card.classList.contains('ui-card')) return;
    const handlers = [['focusin', reveal], ['pointerdown', press(true)], ['pointerup', press(false)],
      ['pointercancel', press(false)]] as const;
    for (const [type, fn] of handlers) card.addEventListener(type, fn);
    const unwire = () => { for (const [type, fn] of handlers) card.removeEventListener(type, fn); };
    // A card that is itself a link or a button, or that already declares a role, name or
    // stop of its own, keeps them: the table inside scrolls without a named region rather
    // than stealing the card's role and name. Only a plain, unnamed card takes the frame's.
    if (card.tagName === 'A' || card.tagName === 'BUTTON') return unwire;
    for (const attr of ['role', 'aria-label', 'aria-labelledby', 'tabindex']) {
      if (card.hasAttribute(attr)) return unwire;
    }
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', scrollLabel);
    const clear = () => {
      unwire();
      card.removeAttribute('role');
      card.removeAttribute('aria-label');
      card.removeAttribute('tabindex');
    };
    const stop = watchSize([card, el], () => {
      if (card.scrollWidth > card.clientWidth) card.tabIndex = 0;
      else card.removeAttribute('tabindex');
    });
    // No size to read: the card stays a stop, as the frame does without an observer.
    if (!stop) {
      card.tabIndex = 0;
      return clear;
    }
    return () => { stop(); clear(); };
  }, [scrollable, scrollLabel]);
}
