import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './ThreeColumnPage.css';

export type ThreeColumnView = 'nav' | 'steps' | 'work';

export type ThreeColumnArea = {
  /** The area's heading, an h2. */
  title: ReactNode;
  /** The words of the link that opens the area on a tablet or a phone. */
  link: string;
  children: ReactNode;
};

export type ThreeColumnPageProps = {
  /** The page's h1, at the top of the flow half. Leave it out when AppShell's
   *  `width="full"` puts the title in the band. */
  title?: string;
  /** Small tools for the whole page at the end of the title row, such as a badge. */
  tools?: ReactNode;
  /** The first column: the list that chooses the record, such as the months. */
  nav: ThreeColumnArea;
  /** The second column: the ordered steps, beside the list. */
  steps: ThreeColumnArea;
  /** The work half: the rows of the open step. */
  work: ThreeColumnArea;
  /** The area shown on a phone, and the list's own view on a tablet. */
  view?: ThreeColumnView;
  defaultView?: ThreeColumnView;
  onViewChange?: (view: ThreeColumnView) => void;
  /** The name of the link group. */
  viewsLabel?: string;
  className?: string;
};

const order: ThreeColumnView[] = ['nav', 'steps', 'work'];

/** A list and ordered steps on one half of a split page, and the work on the other half. */
export function ThreeColumnPage({ title, tools, nav, steps, work, view, defaultView = 'steps', onViewChange,
  viewsLabel = 'Page columns', className }: ThreeColumnPageProps) {
  const uid = useId();
  const [own, setOwn] = useState(defaultView);
  const shown = view ?? own;
  const areas = { nav, steps, work };
  const root = useRef<HTMLDivElement>(null);
  // A link moves the reader to its area: focus goes to the area's heading.
  const moved = useRef<ThreeColumnView | null>(null);
  useEffect(() => {
    if (moved.current !== shown) return;
    moved.current = null;
    const heading = root.current?.querySelector<HTMLElement>(`[data-area="${shown}"] > h2`);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView?.({ block: 'nearest' });
  }, [shown]);
  const choose = (next: ThreeColumnView) => {
    moved.current = next;
    if (view === undefined) setOwn(next);
    onViewChange?.(next);
    if (next === shown) {
      moved.current = null;
      root.current?.querySelector<HTMLElement>(`[data-area="${next}"] > h2`)?.focus();
    }
  };
  const area = (key: ThreeColumnView) => <section key={key} data-area={key}
    className={`ui-columns__area ui-columns__area--${key}`} aria-labelledby={`${uid}-${key}`}>
    <h2 id={`${uid}-${key}`} className="ui-card__title" tabIndex={-1}>{areas[key].title}</h2>
    {areas[key].children}
  </section>;

  return <div ref={root} className={['ui-columns', className].filter(Boolean).join(' ')} data-view={shown}>
    <div className="ui-columns__flow">
      <div className="ui-columns__head">
        {title && <h1>{title}</h1>}
        {tools && <div className="ui-app__tools">{tools}</div>}
        <div role="group" aria-label={viewsLabel} className="ui-nav ui-columns__views">
          {order.map(key => <button key={key} type="button" aria-pressed={shown === key}
            className={`ui-nav__item${shown === key ? ' is-active' : ''}`} onClick={() => choose(key)}>{areas[key].link}</button>)}
        </div>
      </div>
      <div className="ui-columns__pair">{area('nav')}{area('steps')}</div>
    </div>
    {area('work')}
  </div>;
}
