import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from './primitives/Button';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Loading';
import './SplitLayout.css';

/** Fit shows the whole sheet. A number is a percentage of the sheet's own size. */
export type SplitLayoutZoom = 'fit' | 50 | 100 | 150 | 200;
/** The preview's own states: drawn, loading, or not available. */
export type SplitLayoutPreviewState = 'ready' | 'loading' | 'unavailable';

export type SplitLayoutPreview = {
  /** The preview pane's h2. */
  title: string;
  /** The sheet's content. */
  children: ReactNode;
  state?: SplitLayoutPreviewState;
  /** The Try again button of the unavailable state. Without it, the state has no button. */
  onRetry?: () => void;
};

export type SplitLayoutProps = {
  /** The first pane: the page title, the fields and the totals. */
  primary: ReactNode;
  /** The accessible name of the first pane. */
  primaryLabel?: string;
  preview: SplitLayoutPreview;
  /** The buttons at the foot of the first pane. */
  actions?: ReactNode;
  zoom?: SplitLayoutZoom;
  defaultZoom?: SplitLayoutZoom;
  onZoomChange?: (zoom: SplitLayoutZoom) => void;
  className?: string;
};

const STEPS = [50, 100, 150, 200] as const;

// A scroll box is a Tab stop only while it has something to scroll: a permanent stop lands
// the reader nowhere. why: guidelines/accessibility-floor.md#keyboard-first
function useOverflows(watch: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const box = ref.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const read = () => setOverflows(box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(box);
    for (const child of box.children) observer.observe(child);
    return () => observer.disconnect();
  }, [watch]);
  return [ref, overflows] as const;
}

/** A page split under the top bar: the content and its actions, and a preview of the source
 *  document on the document ground. */
export function SplitLayout({
  primary, primaryLabel = 'Details', preview, actions, zoom, defaultZoom = 'fit', onZoomChange, className,
}: SplitLayoutProps) {
  const uid = useId();
  const state = preview.state ?? 'ready';
  const [own, setOwn] = useState(defaultZoom);
  const at = zoom ?? own;
  const [fit, setFit] = useState(1);
  const sheet = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  // Try again leaves with the unavailable state, so the focus goes to the preview's title.
  const retried = useRef(false);
  useEffect(() => {
    if (!retried.current || state === 'unavailable') return;
    retried.current = false;
    title.current?.focus({ preventScroll: true });
  }, [state]);
  const [stage, stageScrolls] = useOverflows(`${state}:${at}`);
  const [pane, paneScrolls] = useOverflows(state);
  // At 860px and below the action row covers the foot of the one scroll, so the scroll keeps its
  // height clear when a control scrolls into view. why: guidelines/accessibility-floor.md#keyboard-first
  const foot = useRef<HTMLDivElement>(null);
  const [footHeight, setFootHeight] = useState(0);
  useEffect(() => {
    const row = foot.current;
    if (!row || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setFootHeight(row.offsetHeight));
    observer.observe(row);
    return () => observer.disconnect();
  }, [!!actions]);

  // Fit is the largest scale, up to 100%, at which the whole sheet shows in the stage, with no
  // floor. The sheet's offset size does not include its own zoom, so the reading does not feed
  // back. A stage with no room left keeps the last scale.
  useEffect(() => {
    const box = stage.current;
    const page = sheet.current;
    if (!box || !page || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const css = getComputedStyle(box);
      const width = box.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
      const height = box.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
      if (width > 0 && height > 0 && page.offsetWidth > 0 && page.offsetHeight > 0) setFit(Math.min(1, width / page.offsetWidth, height / page.offsetHeight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(page);
    return () => observer.disconnect();
  }, [stage, state]);

  const ready = state === 'ready';
  const scale = at === 'fit' ? fit : at / 100;
  const percent = Math.round(scale * 100);
  const down = [...STEPS].reverse().find(step => step < percent);
  const up = STEPS.find(step => step > percent);
  const go = (to: SplitLayoutZoom) => { if (zoom === undefined) setOwn(to); onZoomChange?.(to); };

  // A zoom step at its end turns disabled and the browser drops the focus to <body>, so the
  // focus goes to the other step. why: docs/components.md#split-layout
  const pressed = useRef<{ from: HTMLButtonElement; to: HTMLButtonElement | null } | null>(null);
  const out = useRef<HTMLButtonElement>(null);
  const into = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const was = pressed.current;
    pressed.current = null;
    const lost = document.activeElement === document.body || document.activeElement === was?.from;
    if (was?.from.disabled && lost && was.to && !was.to.disabled) was.to.focus();
  }, [percent]);
  const press = (to: SplitLayoutZoom | undefined, from: typeof out, other: typeof out) => () => {
    if (to === undefined) return;
    pressed.current = { from: from.current!, to: other.current };
    go(to);
  };

  return <div className={['ui-split', className].filter(Boolean).join(' ')}
    style={{ '--ui-split-foot': `${footHeight}px` } as CSSProperties}>
    <div ref={pane} className="ui-split__primary" role="region" aria-label={primaryLabel}
      {...(paneScrolls && { tabIndex: 0 })}>
      <div className="ui-split__content">{primary}</div>
    </div>
    <section className="ui-split__preview ui-document-ground" aria-labelledby={`${uid}-title`}>
      <div className="ui-split__controls">
        <h2 ref={title} id={`${uid}-title`} className="ui-card__title" tabIndex={-1}>{preview.title}</h2>
        <div className="ui-split__tools" role="group" aria-label="Zoom">
          <Button ref={out} variant="ghost" iconOnly icon="minus" aria-label="Zoom out"
            disabled={!ready || down === undefined} onClick={press(down, out, into)} />
          <output className="ui-split__scale" aria-live="polite">{ready ? `${percent}%` : ''}</output>
          <Button ref={into} variant="ghost" iconOnly icon="plus" aria-label="Zoom in"
            disabled={!ready || up === undefined} onClick={press(up, into, out)} />
          <Button variant="ghost" aria-pressed={at === 'fit'} disabled={!ready} onClick={() => go('fit')}>Fit</Button>
        </div>
      </div>
      <div ref={stage} className="ui-split__stage" aria-busy={state === 'loading'}
        {...(stageScrolls && { tabIndex: 0, role: 'region', 'aria-label': `${preview.title}, page` })}>
        {state === 'unavailable'
          ? <EmptyState className="ui-split__empty" title="Preview unavailable" sub="" icon=""
            actions={preview.onRetry && <Button onClick={() => { retried.current = true; preview.onRetry?.(); }}>Try again</Button>} />
          : <div ref={sheet} className="ui-card__page ui-split__sheet" style={{ zoom: scale }}>
            {state === 'loading'
              ? <><span className="ui-sr" role="status">Loading the preview</span><Skeleton lines={8} /></>
              : preview.children}
          </div>}
      </div>
    </section>
    {actions && <div ref={foot} className="ui-split__actions"><div className="ui-split__row">{actions}</div></div>}
  </div>;
}
