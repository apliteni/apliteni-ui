import '../../src/styles/tooltip.css';
import { placeTip } from './tip';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export type TooltipProps = {
  text?: string;
  label?: string;
  value?: string;
  detail?: string;
  placement?: 'top' | 'bottom';
  /** Inline content without nested controls. */
  children: ReactNode;
};

type Parts = { label?: string; value?: string; detail?: string };

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

const Text = ({ label = '', value = '', detail = '' }: Parts) => <>
  <span className="ui-tip__label" hidden={!label}>{label}</span>
  <span className="ui-tip__value" hidden={!value}>{value}</span>
  <span className="ui-tip__detail" hidden={!detail}>{detail}</span>
</>;

export function Tooltip({ text, label = text, value, detail, placement = 'top', children }: TooltipProps) {
  const id = useId();
  const host = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLElement>(null);
  const ignoreMouseUntil = useRef(0);
  const touchMoved = useRef(false);
  const pointerKind = useRef('');
  const pendingClick = useRef<'open' | 'close' | null>(null);
  const dismissed = useRef<Element | null>(null);
  const [mark, setMark] = useState<Element | null>(null);
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
      setMark(target);
    }
  }
  function markOf(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    return trigger.current?.contains(target) ? trigger.current : null;
  }
  function place() {
    const h = host.current;
    const t = tip.current;
    const target = active.current;
    if (!h || !t || !target) return;
    const anchor = target.querySelector('[data-tip-anchor]') || target;
    placeTip(h, anchor, t, undefined, placement);
  }

  // Runs after content changes too: the current readout can change size.
  useLayoutEffect(() => {
    if (!mark) return;
    if (!host.current?.contains(mark)) { close(true); return; }
    place();
  });

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
    if (event.pointerType === 'touch' || event.pointerType === 'pen') ignoreMouseUntil.current = Date.now() + 800;
  };
  shared.current.pointercancel = () => { pendingClick.current = null; };
  shared.current.click = (event) => {
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

  return (
    <span ref={host} className="ui-tip-host" style={{ display: 'inline-block' }}
      onMouseOver={event => {
        if (Date.now() <= ignoreMouseUntil.current) return;
        const target = markOf(event.target);
        if (target) show(target); else setMark(null);
      }}
      onMouseLeave={() => { if (Date.now() > ignoreMouseUntil.current) close(true); }}
      onFocus={event => { if (Date.now() > ignoreMouseUntil.current) show(markOf(event.target)); }}
      onBlur={event => { if (!markOf(event.relatedTarget)) close(true); }}
      onPointerOver={event => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') ignoreMouseUntil.current = Date.now() + 800;
        else if (event.pointerType === 'mouse') { ignoreMouseUntil.current = 0; show(markOf(event.target)); }
      }}
      onClickCapture={event => {
        const touched = pendingClick.current;
        pendingClick.current = null;
        if (pointerKind.current !== 'pen') return;
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
      onTouchStart={() => { ignoreMouseUntil.current = Date.now() + 800; touchMoved.current = false; pendingClick.current = null; }}
      onTouchMove={() => { touchMoved.current = true; }}
      onTouchCancel={() => { touchMoved.current = true; }}
      onTouchEnd={event => {
        ignoreMouseUntil.current = Date.now() + 800;
        if (touchMoved.current) return;
        const target = markOf(event.target);
        if (!target || target === mark) { pendingClick.current = 'close'; close(); }
        else { pendingClick.current = 'open'; dismissed.current = null; show(target); }
      }}
    >
      <span ref={trigger} className="ui-focusable" tabIndex={0} aria-describedby={id}>{children}</span>
      <span ref={tip} id={id} data-tip="" role="tooltip" className={`ui-tip${open ? ' is-open' : ''}`}>
        <Text label={label} value={value} detail={detail} />
      </span>
    </span>
  );
}
