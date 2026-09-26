import '../../src/styles/tooltip.css';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export type TooltipProps = {
  text: string;
  /** Inline content without nested controls. */
  children: ReactNode;
};

export function Tooltip({ text, children }: TooltipProps) {
  const id = useId();
  const host = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const ignoreMouseUntil = useRef(0);
  const touchMoved = useRef(false);
  const [open, setOpen] = useState(false);

  function place() {
    const h = host.current!;
    const t = tip.current!;
    const mark = trigger.current!.getBoundingClientRect();
    const rect = h.getBoundingClientRect();
    const view = h.ownerDocument.documentElement;
    const clip = { top: 0, left: 0, right: view.clientWidth, bottom: view.clientHeight };
    for (let el: HTMLElement | null = h; el && el !== h.ownerDocument.body; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (![style.overflow, style.overflowX, style.overflowY].some(v => v && v !== 'visible')) continue;
      const bounds = el.getBoundingClientRect();
      clip.top = Math.max(clip.top, bounds.top);
      clip.left = Math.max(clip.left, bounds.left);
      clip.right = Math.min(clip.right, bounds.right);
      clip.bottom = Math.min(clip.bottom, bounds.bottom);
    }
    const gap = parseFloat(getComputedStyle(t).getPropertyValue('--ui-tip-gap')) || 8;
    const above = mark.top - clip.top;
    const below = clip.bottom - mark.bottom;
    const isBelow = above < t.offsetHeight + gap && below > above;
    t.classList.toggle('is-below', isBelow);
    const centre = mark.left + mark.width / 2;
    const ideal = centre - t.offsetWidth / 2;
    const left = Math.max(clip.left, Math.min(ideal, clip.right - t.offsetWidth));
    t.style.setProperty('--ui-tip-x', `${centre - rect.left - h.clientLeft + h.scrollLeft}px`);
    t.style.setProperty('--ui-tip-y', `${(isBelow ? mark.bottom : mark.top) - rect.top - h.clientTop + h.scrollTop}px`);
    t.style.setProperty('--ui-tip-shift', `${left - ideal}px`);
  }

  useLayoutEffect(() => { if (open) place(); }, [open, text]);
  useEffect(() => {
    if (!open) return;
    const doc = host.current!.ownerDocument;
    const view = doc.defaultView!;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    doc.addEventListener('keydown', escape);
    view.addEventListener('scroll', place, true);
    view.addEventListener('resize', place);
    return () => {
      doc.removeEventListener('keydown', escape);
      view.removeEventListener('scroll', place, true);
      view.removeEventListener('resize', place);
    };
  }, [open]);

  return (
    <span ref={host} className="ui-tip-host" style={{ display: 'inline-block' }}>
      <span ref={trigger} className="ui-focusable" tabIndex={0} aria-describedby={id}
        onMouseEnter={() => { if (Date.now() > ignoreMouseUntil.current) setOpen(true); }}
        onMouseLeave={() => { if (Date.now() > ignoreMouseUntil.current) setOpen(false); }}
        onFocus={() => { if (Date.now() > ignoreMouseUntil.current) setOpen(true); }}
        onBlur={() => setOpen(false)}
        onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}
        onTouchStart={() => { ignoreMouseUntil.current = Date.now() + 800; touchMoved.current = false; }}
        onTouchMove={() => { touchMoved.current = true; }}
        onTouchCancel={() => { touchMoved.current = true; }}
        onTouchEnd={() => {
          ignoreMouseUntil.current = Date.now() + 800;
          if (!touchMoved.current) setOpen(value => !value);
        }}
      >{children}</span>
      <span ref={tip} id={id} role="tooltip" className={`ui-tip${open ? ' is-open' : ''}`}>
        <span className="ui-tip__label">{text}</span>
      </span>
    </span>
  );
}
