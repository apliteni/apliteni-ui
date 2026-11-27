import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import './Crossfade.css';

// A count or a status line that changes in place cross-fades: the outgoing text
// stays until the incoming text has faded in, each over 150ms (--dur-fast).
// The first render does not animate, so a value present at load stays still.
// The fade follows the rendered text, read from the DOM after commit, not a
// walk of the children: a component value such as <Amount amount={43}> renders
// its number with no children to walk, and a static walk sees two empty
// strings and freezes the old node. #900
// why: guidelines/motion.md#every-visible-change-is-a-smooth-transition
export function Crossfade({ value }: { value: ReactNode }) {
  const [key, setKey] = useState(0);
  const [leaving, setLeaving] = useState<{ key: number; value: ReactNode } | null>(null);
  const shownRef = useRef<HTMLSpanElement | null>(null);
  const prevText = useRef('');
  const prevValue = useRef<ReactNode>(value);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLeaving = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setLeaving(null);
  };

  // The newest node always renders in the same slot, so React updates its props
  // in place and keeps the DOM node and its focus. After the commit, compare the
  // rendered text with the previous one: a same-text change (a link's href, say)
  // stays still, while a text change starts the cross-fade from the previous
  // node. #900
  useLayoutEffect(() => {
    const text = shownRef.current?.textContent ?? '';
    if (first.current) {
      first.current = false;
      prevText.current = text;
      return;
    }
    if (text === prevText.current) {
      prevValue.current = value;
      return;
    }
    const outgoing = prevValue.current;
    prevText.current = text;
    prevValue.current = value;
    setLeaving({ key, value: outgoing });
    setKey((k) => k + 1);
    // Fallback for the animationend wait: the event does not come when no
    // animation matched or the element is display: none, so drop the outgoing
    // layer after the fade either way.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; setLeaving(null); }, 200);
  }, [value, key]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <span className="ui-crossfade">
      {leaving
        ? <span key={leaving.key} className="ui-crossfade__out" onAnimationEnd={clearLeaving} aria-hidden="true">{leaving.value}</span>
        : null}
      <span ref={shownRef} key={key} className={`ui-crossfade__in${key === 0 ? ' ui-crossfade__in--still' : ''}`}>{value}</span>
    </span>
  );
}
