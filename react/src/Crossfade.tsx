import { useEffect, useRef, useState, type ReactNode } from 'react';
import './Crossfade.css';

// The visible text of a ReactNode, read without rendering it: a value can be a
// string, a number or an element such as a drill-down link, and the fade must
// follow the shown text, not the identity of a node a parent rebuilds each render.
function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'object' && 'props' in node) {
    return textOf((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
}

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
    // Fade only when the shown text changes. A parent that rebuilds a node with
    // the same text — a StatBand value link, for instance — must not start a fade,
    // or the incoming layer replaces the interactive node and drops its focus. #900
    if (textOf(valueRef.current) === textOf(value)) return;
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
