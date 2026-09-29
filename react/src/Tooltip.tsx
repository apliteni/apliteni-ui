import '../../src/styles/tooltip.css';
import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type ForwardedRef, type Ref } from 'react';

export type TooltipProps = {
  text?: string;
  label?: string;
  value?: string;
  detail?: string;
  placement?: 'top' | 'bottom';
  /** Inline content without nested controls. */
  children: ReactNode;
};

export type TooltipHostProps = {
  /** Marks carry data-tip-value, optional data-tip-label/detail and data-tip-anchor. */
  children: ReactNode;
  placement?: 'top' | 'bottom';
  className?: string;
  style?: CSSProperties;
};

export function Tooltip(props: TooltipProps) {
  return <TooltipSurface {...props} />;
}

export const TooltipHost = forwardRef<HTMLDivElement, TooltipHostProps>(function TooltipHost(props, ref) {
  return <TooltipSurface {...props} chart forwardedRef={ref} />;
});

function TooltipSurface({ text, label = text, value, detail, placement = 'top', children, chart = false, className, style, forwardedRef }: TooltipProps & TooltipHostProps & { chart?: boolean; forwardedRef?: ForwardedRef<HTMLDivElement> }) {
  const id = useId();
  const host = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLElement>(null);
  const ignoreMouseUntil = useRef(0);
  const touchMoved = useRef(false);
  const tapping = useRef(false);
  const pointerKind = useRef('');
  const pendingClick = useRef<'open' | 'close' | null>(null);
  const dismissed = useRef<Element | null>(null);
  const [mark, setMark] = useState<Element | null>(null);
  const [readout, setReadout] = useState({ label: '', value: '', detail: '' });
  function readMark(target: Element) {
    return { label: target.getAttribute('data-tip-label') || '', value: target.getAttribute('data-tip-value') || '', detail: target.getAttribute('data-tip-detail') || '' };
  }
  const active = useRef<Element | null>(null);
  active.current = mark;
  const open = mark !== null;

  function close(reset = false) {
    dismissed.current = reset ? null : active.current;
    setMark(null);
  }
  function show(target: Element | null) {
    if (target && target !== dismissed.current) {
      dismissed.current = null;
      if (chart) setReadout(readMark(target));
      setMark(target);
    }
  }
  function markOf(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    if (!chart) return trigger.current?.contains(target) ? trigger.current : null;
    const candidate = target.closest('[data-tip-value]');
    return candidate?.closest('[data-tip-host]') === host.current ? candidate : null;
  }
  function place() {
    const h = host.current;
    const t = tip.current;
    const target = active.current;
    if (!h || !t || !target) return;
    const anchor = (target.querySelector('[data-tip-anchor]') || target).getBoundingClientRect();
    const rect = h.getBoundingClientRect();
    const view = h.ownerDocument.documentElement;
    const clip = { top: 0, left: 0, right: view.clientWidth, bottom: view.clientHeight };
    for (let el: HTMLElement | null = h; el && el !== h.ownerDocument.body && el !== view; el = el.parentElement) {
      const computed = getComputedStyle(el);
      if (![computed.overflow, computed.overflowX, computed.overflowY].some(v => v && v !== 'visible')) continue;
      const bounds = el.getBoundingClientRect();
      clip.top = Math.max(clip.top, bounds.top);
      clip.left = Math.max(clip.left, bounds.left);
      clip.right = Math.min(clip.right, bounds.right);
      clip.bottom = Math.min(clip.bottom, bounds.bottom);
    }
    const gap = parseFloat(getComputedStyle(t).getPropertyValue('--ui-tip-gap')) || 8;
    const above = anchor.top - clip.top;
    const below = clip.bottom - anchor.bottom;
    const prefersBelow = placement === 'bottom';
    const flip = prefersBelow ? below < t.offsetHeight + gap && above > below : above < t.offsetHeight + gap && below > above;
    const isBelow = prefersBelow !== flip;
    t.classList.toggle('is-below', isBelow);
    const centre = anchor.left + anchor.width / 2;
    const ideal = centre - t.offsetWidth / 2;
    const left = Math.max(clip.left, Math.min(ideal, clip.right - t.offsetWidth));
    t.style.setProperty('--ui-tip-x', `${centre - rect.left - h.clientLeft + h.scrollLeft}px`);
    t.style.setProperty('--ui-tip-y', `${(isBelow ? anchor.bottom : anchor.top) - rect.top - h.clientTop + h.scrollTop}px`);
    t.style.setProperty('--ui-tip-shift', `${left - ideal}px`);
  }

  // Runs after content changes too: the current readout can change size.
  useLayoutEffect(() => {
    if (!mark) return;
    if (!host.current?.contains(mark)) { close(true); return; }
    if (chart) {
      const next = readMark(mark);
      if (next.label !== readout.label || next.value !== readout.value || next.detail !== readout.detail) setReadout(next);
    }
    place();
  });
  useLayoutEffect(() => {
    if (!chart || !mark || mark.hasAttribute('aria-describedby')) return;
    mark.setAttribute('aria-describedby', id);
    return () => { if (mark.getAttribute('aria-describedby') === id) mark.removeAttribute('aria-describedby'); };
  }, [chart, mark, id]);
  useEffect(() => {
    const doc = host.current!.ownerDocument;
    const view = doc.defaultView!;
    const keyboard = (event: KeyboardEvent) => {
      ignoreMouseUntil.current = 0;
      pointerKind.current = '';
      pendingClick.current = null;
      if (event.key === 'Escape') close();
    };
    const outside = (event: TouchEvent) => {
      if (!host.current?.contains(event.target as Node)) close(true);
    };
    const pointer = (event: PointerEvent) => {
      pointerKind.current = event.pointerType;
      tapping.current = event.pointerType === 'touch' || event.pointerType === 'pen';
      if (event.pointerType === 'touch' || event.pointerType === 'pen') ignoreMouseUntil.current = Date.now() + 800;
    };
    const cancel = () => { tapping.current = false; };
    const outsideClick = (event: MouseEvent) => {
      tapping.current = false;
      if ((pointerKind.current === 'touch' || pointerKind.current === 'pen') && !host.current?.contains(event.target as Node)) close(true);
    };
    doc.addEventListener('pointerdown', pointer, true);
    doc.addEventListener('pointercancel', cancel, true);
    doc.addEventListener('click', outsideClick);
    doc.addEventListener('keydown', keyboard);
    doc.addEventListener('touchend', outside);
    view.addEventListener('scroll', place, true);
    view.addEventListener('resize', place);
    return () => {
      doc.removeEventListener('pointerdown', pointer, true);
      doc.removeEventListener('pointercancel', cancel, true);
      doc.removeEventListener('click', outsideClick);
      doc.removeEventListener('keydown', keyboard);
      doc.removeEventListener('touchend', outside);
      view.removeEventListener('scroll', place, true);
      view.removeEventListener('resize', place);
    };
  }, [placement]);

  const contents = chart ? readout : { label, value, detail };
  const Host = chart ? 'div' : 'span';
  const Panel = chart ? 'div' : 'span';
  return (
    <Host ref={node => {
      host.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node as HTMLDivElement | null);
      else if (forwardedRef) forwardedRef.current = node as HTMLDivElement | null;
    }} className={['ui-tip-host', className].filter(Boolean).join(' ')} data-tip-host={chart ? '' : undefined}
      style={chart ? style : { display: 'inline-block' }}
      onMouseOver={event => {
        if (Date.now() <= ignoreMouseUntil.current) return;
        const target = markOf(event.target);
        if (target) show(target); else setMark(null);
      }}
      onMouseLeave={() => { if (Date.now() > ignoreMouseUntil.current) close(true); }}
      onFocus={event => { if (chart ? !tapping.current : Date.now() > ignoreMouseUntil.current) show(markOf(event.target)); }}
      onBlur={event => { if (!markOf(event.relatedTarget)) close(true); }}
      onPointerOver={event => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') ignoreMouseUntil.current = Date.now() + 800;
        else if (event.pointerType === 'mouse') { ignoreMouseUntil.current = 0; show(markOf(event.target)); }
      }}
      onClickCapture={event => {
        if (!chart) return;
        tapping.current = false;
        const touched = pendingClick.current;
        pendingClick.current = null;
        if (!touched && pointerKind.current !== 'touch' && pointerKind.current !== 'pen') return;
        const target = markOf(event.target);
        const opening = touched ? touched === 'open' : !!target && target !== mark;
        if (!opening) { if (!touched) close(); return; }
        event.preventDefault();
        event.stopPropagation();
        // Page dismissal listeners still receive the opening tap.
        const doc = host.current!.ownerDocument;
        pointerKind.current = '';
        doc.documentElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        pointerKind.current = 'touch';
        dismissed.current = null;
        show(target);
      }}
      onTouchStart={() => { tapping.current = true; ignoreMouseUntil.current = Date.now() + 800; touchMoved.current = false; pendingClick.current = null; }}
      onTouchMove={() => { touchMoved.current = true; }}
      onTouchCancel={() => { touchMoved.current = true; }}
      onTouchEnd={event => {
        tapping.current = false;
        ignoreMouseUntil.current = Date.now() + 800;
        if (touchMoved.current) return;
        const target = markOf(event.target);
        if (!target || target === mark) { pendingClick.current = 'close'; close(); }
        else { pendingClick.current = 'open'; dismissed.current = null; show(target); }
      }}
    >
      {chart ? children : <span ref={trigger} className="ui-focusable" tabIndex={0} aria-describedby={id}>{children}</span>}
      <Panel ref={tip as Ref<HTMLDivElement>} id={id} role={chart && !mark ? undefined : 'tooltip'} className={`ui-tip${open ? ' is-open' : ''}`}>
        <span className="ui-tip__label" hidden={!contents.label}>{contents.label}</span>
        <span className="ui-tip__value" hidden={!contents.value}>{contents.value}</span>
        <span className="ui-tip__detail" hidden={!contents.detail}>{contents.detail}</span>
      </Panel>
    </Host>
  );
}
