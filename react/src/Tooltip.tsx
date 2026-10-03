import '../../src/styles/tooltip.css';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { placeTip } from './tip';

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

  // The placement is the kit's, in one module, because <Chart> opens the same
  // readout over its own marks.
  const place = () => placeTip(host.current!, trigger.current!, tip.current!);

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
