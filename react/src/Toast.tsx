import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { clearToastPile, toastPileLabel, watchToastPile, TOAST_PILE_MIN } from '@apliteni/apliteni-ui';
import { Icon } from './primitives/Icon';
import './Toast.css';

export type ToastNotice = {
  tone?: 'success' | 'danger' | 'warn' | 'info' | 'neutral';
  compact?: boolean;
  dismissible?: boolean;
  progress?: boolean;
  title: string;
  text?: string;
  action?: { label: string; onClick: () => void };
};
export type ToastProps = { children: ReactNode; collapse?: boolean };
const Context = createContext<((notice: ToastNotice) => void) | null>(null);
const glyphs = { success: 'circleCheck', danger: 'circleX', warn: 'circleAlert', info: 'info', neutral: 'bolt' };

export function useToast() {
  const push = useContext(Context);
  if (!push) throw new Error('useToast requires a Toast provider');
  return push;
}

function Notice({ notice, remove }: { notice: ToastNotice; remove: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const dismissed = useRef(false);
  const remaining = useRef(5000);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const tone = notice.tone ?? 'success';
  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) remove();
    else setLeaving(true);
  }, [remove]);

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
    if (leaving || notice.action || paused) return;
    const started = Date.now();
    const timer = setTimeout(dismiss, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started));
    };
  }, [dismiss, leaving, notice.action, paused]);

  return (
    <div ref={root} className={`ui-toast ui-toast--${tone} ui-toast--soft${notice.compact ? ' ui-toast--compact' : ''}${leaving ? ' is-leaving' : ''}`}
      role={tone === 'danger' ? 'alert' : 'status'} aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <span className="ui-toast__icon"><Icon name={glyphs[tone]} /></span>
      <div className="ui-toast__body">
        <div className="ui-toast__title">{notice.title}</div>
        {!notice.compact && notice.text && <div className="ui-toast__text">{notice.text}</div>}
      </div>
      {notice.action && <button type="button" className="ui-toast__action" disabled={leaving}
        onClick={() => { if (!dismissed.current) { dismiss(); notice.action!.onClick(); } }}>
        {notice.action.label}
      </button>}
      {notice.dismissible !== false && <button type="button" className="ui-toast__close" aria-label="Dismiss" disabled={leaving} onClick={dismiss}>
        <Icon name="x" />
      </button>}
      {!notice.action && notice.progress !== false && <span className="ui-toast__timer is-running" aria-hidden="true"
        style={{ animationPlayState: paused ? 'paused' : 'running' }} />}
    </div>
  );
}

type Entry = { id: number; notice: ToastNotice; remove: () => void };

/* How far up from the bottom of the viewport the stack reaches, published on the
 * document root so a fixed page action can sit clear of any number of notices
 * rather than guess at the height of one. 0px while the stack is empty, so the
 * action rests in its own corner until a notice needs the space (#388).
 * why: docs/specification.md#react-toasts */
const REACH = '--rx-toast-stack';

function usePublishedReach(stack: RefObject<HTMLDivElement | null>, count: number) {
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
    return () => { observer?.disconnect(); root.style.removeProperty(REACH); };
  }, [stack, count]);
}

/* The pile keeps its own measurements: where every notice rests behind the front
 * card, and where it fans out to. applyToastPile() inside watchToastPile() is
 * the kit's own, so the vanilla stack and this one pile identically.
 * The switch between the two positions is the stylesheet's, on :hover and
 * :focus-within — nothing here listens for either. why: docs/specification.md#toast-stacks */
function usePile(stack: RefObject<HTMLDivElement | null>, piled: boolean, count: number) {
  useLayoutEffect(() => {
    const element = stack.current;
    if (!element) return;
    if (!piled) { clearToastPile(element); return; }
    return watchToastPile(element);
  }, [stack, piled, count]);
}

export function Toast({ children, collapse = false }: ToastProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const nextId = useRef(0);
  const stack = useRef<HTMLDivElement>(null);
  const push = useCallback((notice: ToastNotice) => {
    const id = nextId.current++;
    const remove = () => setEntries(current => current.filter(entry => entry.id !== id));
    setEntries(current => [...current, { id, notice, remove }]);
  }, []);
  // One notice is not a pile: collapsing it would only hide it behind itself.
  const piled = collapse && entries.length >= TOAST_PILE_MIN;
  usePublishedReach(stack, entries.length);
  usePile(stack, piled, entries.length);
  return <Context.Provider value={push}>
    {children}
    {typeof document !== 'undefined' && createPortal(
      <div className={`ui-toast-stack rx-toast-stack${piled ? ' ui-toast-stack--collapsed' : ''}`} ref={stack}>
        {entries.map(entry => <Notice key={entry.id} notice={entry.notice} remove={entry.remove} />)}
        {piled && <span className="ui-badge ui-badge--neutral ui-toast-stack__count">{toastPileLabel(entries.length)}</span>}
      </div>, document.body)}
  </Context.Provider>;
}
