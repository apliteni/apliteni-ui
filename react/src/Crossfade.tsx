import { useEffect, useRef, useState, type ReactNode } from 'react';
import './Crossfade.css';

// A count or a status line that changes in place cross-fades: the outgoing text
// stays until the incoming text has faded in, each over 150ms (--dur-fast).
// The first render does not animate, so a value present at load stays still.
// why: guidelines/motion.md#every-visible-change-is-a-smooth-transition
export function Crossfade({ value }: { value: ReactNode }) {
  const [shown, setShown] = useState({ key: 0, value });
  const [leaving, setLeaving] = useState<{ key: number; value: ReactNode } | null>(null);
  const valueRef = useRef(value);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLeaving = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setLeaving(null);
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (Object.is(valueRef.current, value)) return;
    valueRef.current = value;
    setLeaving({ key: shown.key, value: shown.value });
    setShown((prev) => ({ key: prev.key + 1, value }));
    // Fallback for the animationend wait: the event does not come when no
    // animation matched or the element is display: none, so drop the outgoing
    // layer after the fade either way.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; setLeaving(null); }, 200);
  }, [value, shown]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <span className="ui-crossfade">
      {leaving
        ? <span key={leaving.key} className="ui-crossfade__out" onAnimationEnd={clearLeaving} aria-hidden="true">{leaving.value}</span>
        : null}
      <span key={shown.key} className={`ui-crossfade__in${shown.key === 0 ? ' ui-crossfade__in--still' : ''}`}>{shown.value}</span>
    </span>
  );
}
