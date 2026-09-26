import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './primitives/Icon';
import './Toast.css';

export type ToastNotice = {
  tone?: 'success' | 'danger' | 'warn' | 'info' | 'neutral';
  title: string;
  text?: string;
  action?: { label: string; onClick: () => void };
};
export type ToastProps = { children: ReactNode };
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
    if (!notice.action) {
      const timer = setTimeout(dismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [dismiss, leaving, notice.action, remove]);

  return (
    <div ref={root} className={`ui-toast ui-toast--${tone} ui-toast--soft${leaving ? ' is-leaving' : ''}`}>
      <span className="ui-toast__icon"><Icon name={glyphs[tone]} /></span>
      <div className="ui-toast__body">
        <div className="ui-toast__title">{notice.title}</div>
        {notice.text && <div className="ui-toast__text">{notice.text}</div>}
      </div>
      {notice.action && <button type="button" className="ui-toast__action" disabled={leaving}
        onClick={() => { if (!dismissed.current) { dismiss(); notice.action!.onClick(); } }}>
        {notice.action.label}
      </button>}
      <button type="button" className="ui-toast__close" aria-label="Dismiss" disabled={leaving} onClick={dismiss}>
        <Icon name="x" />
      </button>
      {!notice.action && <span className="ui-toast__timer is-running" aria-hidden="true" />}
    </div>
  );
}

type Entry = { id: number; notice: ToastNotice; remove: () => void };
export function Toast({ children }: ToastProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const nextId = useRef(0);
  const push = useCallback((notice: ToastNotice) => {
    const id = nextId.current++;
    const remove = () => setEntries(current => current.filter(entry => entry.id !== id));
    setEntries(current => [...current, { id, notice, remove }]);
  }, []);
  return <Context.Provider value={push}>
    {children}
    {typeof document !== 'undefined' && createPortal(
      <div className="ui-toast-stack rx-toast-stack" role="status" aria-live="polite" aria-atomic="false" aria-relevant="additions">
        {entries.map(entry => <Notice key={entry.id} notice={entry.notice} remove={entry.remove} />)}
      </div>, document.body)}
  </Context.Provider>;
}
