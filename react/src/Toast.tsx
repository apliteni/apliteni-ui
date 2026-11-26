import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { clearToastPile, watchToastPile, TOAST_PILE_MIN } from './lib/toast-stack';
import { Icon } from './primitives/Icon';
import './Toast.css';

export type ToastNotice = {
  tone?: 'success' | 'danger' | 'warn' | 'info' | 'neutral';
  compact?: boolean;
  dismissible?: boolean;
  timer?: boolean | number;
  title: string;
  text?: string;
  action?: { label: string; onClick: () => void };
};
export type ToastProps = { children: ReactNode; collapse?: boolean; limit?: number; bottomOffset?: number | string };
const Context = createContext<((notice: ToastNotice) => void) | null>(null);
const StackHoldContext = createContext(false);
const glyphs = { success: 'circleCheck', danger: 'circleX', warn: 'circleAlert', info: 'info', neutral: 'bolt' };
/* A notice that leaves with the focus hands it to the nearest newer notice with a control, or else
 * to the newest older one with a control, so a keyboard reader stays in the stack. */
function passFocus(notice: HTMLElement | null) {
  if (!notice?.contains(notice.ownerDocument.activeElement)) return;
  const others = [...(notice.parentElement?.children ?? [])]
    .filter(other => other !== notice && other.classList.contains('ui-toast') && !other.classList.contains('is-leaving'));
  const newer = others.filter(other => notice.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING);
  const older = others.filter(other => !newer.includes(other)).reverse();
  for (const other of [...newer, ...older]) {
    const control = other.querySelector<HTMLElement>('.ui-toast__action, .ui-toast__close');
    if (control) return control.focus();
  }
}
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useToast() {
  const push = useContext(Context);
  if (!push) throw new Error('useToast requires a Toast provider');
  return push;
}

function Notice({ notice, remove, leave, evicted }: { notice: ToastNotice; remove: () => void; leave: () => void; evicted: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const dismissed = useRef(false);
  // The stack holds the pointer and the focus for every notice in it, so a notice keeps no hold of its own.
  const paused = useContext(StackHoldContext);
  const tone = notice.tone ?? 'success';
  // An action notice keeps today's default and stays. With `timer` its action shows a ring.
  const ringed = !!notice.action && (notice.timer === true || (typeof notice.timer === 'number' && notice.timer > 0));
  const timed = ringed || (!notice.action && notice.timer !== false && notice.timer !== 0);
  const duration = typeof notice.timer === 'number' ? notice.timer * 1000 : 5000;
  const remaining = useRef(duration);
  // Under reduced motion the ring does not glide: it takes one step each second.
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(duration / 1000));
  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    passFocus(root.current);
    leave();
    if (reducedMotion()) remove();
    else setLeaving(true);
  }, [leave, remove]);

  useEffect(() => { if (evicted) dismiss(); }, [dismiss, evicted]);

  useEffect(() => {
    if (leaving) {
      const element = root.current;
      const finish = (event: AnimationEvent) => { if (event.target === element) remove(); };
      element?.addEventListener('animationend', finish);
      const timer = setTimeout(remove, 260);
      return () => { clearTimeout(timer); element?.removeEventListener('animationend', finish); };
    }
  }, [leaving, remove]);

  useEffect(() => {
    if (leaving || !timed || paused) return;
    const started = Date.now();
    const timer = setTimeout(dismiss, remaining.current);
    let step: ReturnType<typeof setTimeout> | undefined;
    if (ringed && reducedMotion()) {
      const tick = () => {
        const left = Math.max(0, remaining.current - (Date.now() - started));
        setSecondsLeft(Math.ceil(left / 1000));
        step = setTimeout(tick, left % 1000 || 1000);
      };
      step = setTimeout(tick, remaining.current % 1000 || 1000);
    }
    return () => {
      clearTimeout(timer);
      clearTimeout(step);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started));
    };
  }, [dismiss, leaving, paused, ringed, timed]);

  return (
    <div ref={root} className={`ui-toast ui-toast--${tone} ui-toast--soft${notice.compact ? ' ui-toast--compact' : ''}${leaving ? ' is-leaving' : ''}`}
      role={tone === 'danger' ? 'alert' : 'status'} aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      onKeyDown={event => { if (event.key === 'Escape' && notice.dismissible !== false) dismiss(); }}>
      <span className="ui-toast__icon"><Icon name={glyphs[tone]} /></span>
      <div className="ui-toast__body">
        <div className="ui-toast__title">{notice.title}</div>
        {!notice.compact && notice.text && <div className="ui-toast__text">{notice.text}</div>}
        {ringed && <span className="ui-sr">{notice.action!.label} is available for {Math.ceil(duration / 1000)} seconds.</span>}
      </div>
      {notice.action && <button type="button" className={`ui-toast__action${ringed ? ' ui-toast__action--timed' : ''}`} disabled={leaving}
        onClick={() => { if (!dismissed.current) { dismiss(); notice.action!.onClick(); } }}>
        {ringed && <svg className="ui-toast__ring" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle className="ui-toast__ring-track" cx="8" cy="8" r="7" />
          <circle className="ui-toast__ring-arc is-running" cx="8" cy="8" r="7" pathLength="100"
            style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running',
              strokeDashoffset: reducedMotion() ? (secondsLeft * 1000 / duration - 1) * 100 : undefined }} />
        </svg>}
        {notice.action.label}
      </button>}
      {notice.dismissible !== false && <button type="button" className="ui-toast__close" aria-label="Dismiss" disabled={leaving} onClick={dismiss}>
        <Icon name="x" />
      </button>}
      {timed && !ringed && <span className="ui-toast__timer is-running" aria-hidden="true"
        style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running' }} />}
    </div>
  );
}

/* `evicted` marks a notice that a newer one pushed over the stack's limit. */
type Entry = { id: number; notice: ToastNotice; remove: () => void; leave: () => void; evicted?: boolean };

/* How far up from the bottom of the viewport the stack reaches, published on the
 * document root so a fixed page action can sit clear of any number of notices
 * rather than guess at the height of one. 0px while the stack is empty, so the
 * action rests in its own corner until a notice needs the space (#388).
 * why: docs/components.md#toast */
const REACH = '--rx-toast-stack';

function usePublishedReach(stack: RefObject<HTMLDivElement | null>, count: number, offset?: string) {
  useLayoutEffect(() => {
    const element = stack.current;
    const view = element?.ownerDocument.defaultView;
    const root = element?.ownerDocument.documentElement;
    if (!element || !view || !root) return;
    const publish = () => {
      const box = element.getBoundingClientRect();
      root.style.setProperty(REACH, `${box.height ? Math.round(view.innerHeight - box.top) : 0}px`);
    };
    publish();
    // A notice grows when its text wraps and the stack grows with every notice
    // added, so the height is watched rather than read once.
    const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(publish) : undefined;
    observer?.observe(element);
    // Under reduced motion the kit's net gives every change a 0.01ms transition, so a new
    // offset moves the stack after this read. The reach is read again when the move ends, or
    // after 100ms when no end event comes, as for a stack that is not drawn.
    const moved = (event: TransitionEvent) => { if (event.target === element) publish(); };
    element.addEventListener('transitionend', moved);
    const late = setTimeout(publish, 100);
    return () => {
      observer?.disconnect(); clearTimeout(late);
      element.removeEventListener('transitionend', moved); root.style.removeProperty(REACH);
    };
    // A new offset moves the stack without a resize, so it publishes the reach again.
  }, [stack, count, offset]);
}

/* The pile keeps its own measurements: where every notice rests behind the front
 * card, and where it fans out to. applyToastPile() inside watchToastPile()
 * (lib/toast-stack.ts) writes both.
 * The switch between the two positions is the stylesheet's, on :hover and
 * :focus-within — nothing here listens for either. why: docs/components.md#toast */
function usePile(stack: RefObject<HTMLDivElement | null>, piled: boolean, count: number) {
  useLayoutEffect(() => {
    const element = stack.current;
    if (!element) return;
    if (!piled) { clearToastPile(element); return; }
    return watchToastPile(element);
  }, [stack, piled, count]);
}

export function Toast({ children, collapse = false, limit, bottomOffset }: ToastProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stackHovered, setStackHovered] = useState(false);
  const [stackFocused, setStackFocused] = useState(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const nextId = useRef(0);
  const leaving = useRef(new Set<number>());
  const cap = useRef(Infinity);
  // A limit under 1 keeps today's stack, which has no limit.
  cap.current = limit !== undefined && limit >= 1 ? Math.floor(limit) : Infinity;
  const stack = useRef<HTMLDivElement>(null);
  const push = useCallback((notice: ToastNotice) => {
    const id = nextId.current++;
    const remove = () => { leaving.current.delete(id); setEntries(current => current.filter(entry => entry.id !== id)); };
    const leave = () => { leaving.current.add(id); };
    setEntries(current => {
      const next = [...current, { id, notice, remove, leave }];
      // Over the limit, the oldest notices leave. Their changes stay.
      const live = next.filter(entry => !entry.evicted && !leaving.current.has(entry.id));
      const out = new Set(live.slice(0, Math.max(0, live.length - cap.current)).map(entry => entry.id));
      return out.size ? next.map(entry => out.has(entry.id) ? { ...entry, evicted: true } : entry) : next;
    });
  }, []);
  // One notice is not a pile: collapsing it would only hide it behind itself.
  const piled = collapse && entries.length >= TOAST_PILE_MIN;
  // The pointer or the focus anywhere in the stack holds every timer, so no notice moves under it.
  const stackHeld = stackHovered || stackFocused;
  // `bottomOffset` is the stack's whole inset from the bottom of the view: a number in pixels or a
  // CSS length. A page with a bar at the bottom sets it to clear the bar. The default is 16px.
  const inset = typeof bottomOffset === 'number' ? `${bottomOffset}px` : bottomOffset;
  // A length the browser cannot read keeps the kit's 16px, not the last offset that it could read.
  const placed = inset !== undefined && (typeof CSS === 'undefined' || CSS.supports('bottom', inset)) ? inset : undefined;
  usePublishedReach(stack, entries.length, placed);
  usePile(stack, piled, entries.length);
  /* A focused notice that leaves takes the focus with it and sends no blur. A notice that leaves
   * from under a still pointer sends no mouseleave. So each hold is read again here when a notice
   * leaves: the focus from the document, the pointer from what is under its last point now. */
  useLayoutEffect(() => {
    const element = stack.current;
    if (!element) return;
    const document = element.ownerDocument;
    if (stackFocused && !element.contains(document.activeElement)) setStackFocused(false);
    const at = pointer.current;
    // Without elementFromPoint (jsdom) nothing tells where the pointer is, so the hold stays.
    if (stackHovered && at && typeof document.elementFromPoint === 'function'
      && !element.contains(document.elementFromPoint(at.x, at.y))) setStackHovered(false);
  }, [entries, stackFocused, stackHovered]);
  const trackPointer = (event: MouseEvent<HTMLDivElement>) => { pointer.current = { x: event.clientX, y: event.clientY }; };
  const leaveStackFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setStackFocused(false);
  };
  return <Context.Provider value={push}>
    {children}
    {typeof document !== 'undefined' && createPortal(
      <div className={`ui-toast-stack rx-toast-stack${piled ? ' ui-toast-stack--collapsed' : ''}`} ref={stack}
        style={placed === undefined ? undefined : { bottom: placed }}
        tabIndex={piled ? 0 : undefined} role={piled ? 'region' : undefined} aria-label={piled ? 'Notifications' : undefined}
        onMouseEnter={event => { trackPointer(event); setStackHovered(true); }} onMouseMove={trackPointer}
        onMouseLeave={() => setStackHovered(false)}
        onFocus={() => setStackFocused(true)} onBlur={leaveStackFocus}>
        <StackHoldContext.Provider value={stackHeld}>
          {entries.map(entry => <Notice key={entry.id} notice={entry.notice} remove={entry.remove}
            leave={entry.leave} evicted={!!entry.evicted} />)}
        </StackHoldContext.Provider>
      </div>, document.body)}
  </Context.Provider>;
}
