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

type Parts = { label?: string; value?: string; detail?: string };

// The mark-to-readout distance is --ui-tip-gap in src/styles/tooltip.css. This is
// the fallback for a document that has not loaded the sheet;
// react/src/Tooltip.test.tsx pins the two to each other.
const TIP_GAP = 8;

// ---- The document ---------------------------------------------------------

// Five listeners per document, however many readouts the page holds. The vanilla
// kit does the same with doc.__tipDocWired; a readout per table row would
// otherwise stand up five document listeners each, open or not.
type DocHandlers = {
  pointerdown(event: PointerEvent): void;
  pointercancel(): void;
  click(event: MouseEvent): void;
  keydown(event: KeyboardEvent): void;
  touchend(event: TouchEvent): void;
};

const DOC_EVENTS = ['pointerdown', 'pointercancel', 'click', 'keydown', 'touchend'] as const;
const CAPTURED = new Set<string>(['pointerdown', 'pointercancel']);
const wirings = new WeakMap<Document, { members: Set<DocHandlers>; off(): void }>();

function wireDocument(doc: Document, handlers: DocHandlers) {
  let wiring = wirings.get(doc);
  if (!wiring) {
    const members = new Set<DocHandlers>();
    const offs = DOC_EVENTS.map((type) => {
      // A copy: a handler may unmount another readout while the relay runs.
      const relay = (event: Event) => { for (const member of [...members]) (member[type] as (e: Event) => void)(event); };
      doc.addEventListener(type, relay, CAPTURED.has(type));
      return () => doc.removeEventListener(type, relay, CAPTURED.has(type));
    });
    wiring = { members, off: () => offs.forEach((off) => off()) };
    wirings.set(doc, wiring);
  }
  const { members, off } = wiring;
  members.add(handlers);
  return () => {
    members.delete(handlers);
    if (members.size) return;
    off();
    wirings.delete(doc);
  };
}

// ---- The readout ----------------------------------------------------------

// One place the readout's markup is written, so the live panel and the picture
// below cannot drift apart. `data-tip` is what the vanilla wiring reads to see
// that a host already holds a readout, so a page mixing the two gets one.
function panelProps(open: boolean, below: boolean, named: boolean, id?: string) {
  return {
    id,
    'data-tip': '',
    role: named ? ('tooltip' as const) : undefined,
    className: `ui-tip${below ? ' is-below' : ''}${open ? ' is-open' : ''}`,
  };
}

const Text = ({ label = '', value = '', detail = '' }: Parts) => <>
  <span className="ui-tip__label" hidden={!label}>{label}</span>
  <span className="ui-tip__value" hidden={!value}>{value}</span>
  <span className="ui-tip__detail" hidden={!detail}>{detail}</span>
</>;

export function Tooltip(props: TooltipProps) {
  return <TooltipSurface {...props} />;
}

export const TooltipHost = forwardRef<HTMLDivElement, TooltipHostProps>(function TooltipHost(props, ref) {
  return <TooltipSurface {...props} chart forwardedRef={ref} />;
});

/**
 * A readout rendered open, as a picture of one — what a documentation page or a
 * contrast gate can see. Its host carries `.ui-tip-host` and no `data-tip-host`,
 * so no wiring reaches it and a passing pointer cannot take it down. `x` and `y`
 * are the mark's centre and its top edge (its bottom for 'bottom'), in px from
 * the host's top left.
 *
 * Internal to this module: the showcase uses it, `index.ts` does not export it.
 * why: docs/components.md#the-react-tooltip
 */
export function TooltipPicture({ x, y, placement = 'top', children, style, className, ...parts }: Parts & {
  x: number; y: number; placement?: 'top' | 'bottom'; children: ReactNode; style?: CSSProperties; className?: string;
}) {
  return <div className={['ui-tip-host', className].filter(Boolean).join(' ')} data-tip-picture="" style={style}>
    {children}
    <div {...panelProps(true, placement === 'bottom', !!parts.value)}
      style={{ '--ui-tip-x': `${x}px`, '--ui-tip-y': `${y}px` } as CSSProperties}>
      <Text {...parts} />
    </div>
  </div>;
}

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
    const declared = parseFloat(getComputedStyle(t).getPropertyValue('--ui-tip-gap'));
    const gap = Number.isFinite(declared) ? declared : TIP_GAP;
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

  // The document's five listeners are shared; this instance's share of them is a
  // stable object whose handlers are replaced on every render, so the relay above
  // always calls the current closures without rebinding anything.
  const shared = useRef<DocHandlers>({} as DocHandlers);
  shared.current.keydown = (event) => {
    ignoreMouseUntil.current = 0;
    pointerKind.current = '';
    pendingClick.current = null;
    if (event.key === 'Escape') close();
  };
  shared.current.touchend = (event) => {
    if (!host.current?.contains(event.target as Node)) close(true);
  };
  shared.current.pointerdown = (event) => {
    pointerKind.current = event.pointerType;
    tapping.current = event.pointerType === 'touch' || event.pointerType === 'pen';
    if (tapping.current) ignoreMouseUntil.current = Date.now() + 800;
  };
  shared.current.pointercancel = () => { tapping.current = false; };
  shared.current.click = (event) => {
    tapping.current = false;
    if ((pointerKind.current === 'touch' || pointerKind.current === 'pen') && !host.current?.contains(event.target as Node)) close(true);
  };
  useEffect(() => wireDocument(host.current!.ownerDocument, shared.current), []);

  // Only while a readout is open: a capturing scroll listener hears every
  // scroller on the page, and a closed readout has nothing to re-place.
  useEffect(() => {
    if (!open) return;
    const view = host.current!.ownerDocument.defaultView!;
    const reposition = () => place();
    view.addEventListener('scroll', reposition, true);
    view.addEventListener('resize', reposition);
    return () => {
      view.removeEventListener('scroll', reposition, true);
      view.removeEventListener('resize', reposition);
    };
  }, [open, placement]);

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
      <Panel ref={tip as Ref<HTMLDivElement>} {...panelProps(open, false, !(chart && !mark), id)}>
        <Text {...contents} />
      </Panel>
    </Host>
  );
}
