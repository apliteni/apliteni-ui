import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import './ColumnResizer.css';

/** A step of the arrow keys, and of the arrow keys with Shift: --space-4 and --space-12. */
const STEP = 16;
const BIG_STEP = 48;

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export type ColumnResizerProps = {
  /** The width of the pane before the line, in px. */
  value: number;
  min: number;
  max: number;
  /** The id of the pane that the line sizes. */
  controls: string;
  /** The id of the pane's title, which names the line. */
  labelledBy: string;
  /** Gets each new width, already inside the limits. */
  onChange: (width: number) => void;
  /** A double click puts the pane back to its first width. */
  onReset: () => void;
};

/** The line between two panes, as a separator that a pointer drags and the arrow keys move.
 *  It stands over the 1px line that the pane after it draws. Only a page that resizes draws it.
 *  why: docs/components.md#three-column-page */
export function ColumnResizer({ value, min, max, controls, labelledBy, onChange, onReset }: ColumnResizerProps) {
  const drag = useRef<{ x: number; from: number; pointer: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const set = (width: number) => { const next = Math.round(clamp(width, min, max)); if (next !== value) onChange(next); };
  const end = (el: HTMLElement, cancel: boolean) => {
    const was = drag.current;
    if (!was) return;
    drag.current = null;
    setDragging(false);
    if (el.hasPointerCapture?.(was.pointer)) el.releasePointerCapture(was.pointer);
    if (cancel) set(was.from);
  };
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      if (!drag.current) return;
      event.preventDefault();
      end(event.currentTarget, true);
      return;
    }
    const step = event.shiftKey ? BIG_STEP : STEP;
    const to = { ArrowLeft: value - step, ArrowRight: value + step, Home: min, End: max }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    set(to);
  };
  return <div className="ui-resizer" role="separator" tabIndex={0} aria-orientation="vertical"
    aria-controls={controls} aria-labelledby={labelledBy}
    aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} aria-valuetext={`${value} pixels`}
    data-dragging={dragging || undefined}
    onKeyDown={keys}
    onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      // The line takes the focus, so Escape reaches it, and the text beside it stays unselected.
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragging(true);
      drag.current = { x: event.clientX, from: value, pointer: event.pointerId };
    }}
    onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
      if (drag.current) set(drag.current.from + event.clientX - drag.current.x);
    }}
    onPointerUp={(event: PointerEvent<HTMLDivElement>) => end(event.currentTarget, false)}
    onPointerCancel={(event: PointerEvent<HTMLDivElement>) => end(event.currentTarget, true)}
    onDoubleClick={onReset} />;
}
