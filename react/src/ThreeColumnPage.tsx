import { useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';
import { BackLink } from './BackLink';
import { Dropdown, type DropdownProps } from './Dropdown';
import { Icon } from './primitives/Icon';
import './ThreeColumnPage.css';

/** How far down the chain the reader is: 1 the parents, 2 the children, 3 the open child. */
export type ThreeColumnDepth = 1 | 2 | 3;

/** The rows of a column's title menu, such as the count, sorting, the view and quick filters.
 *  A row with `selected` set, true or false, is one choice of its group: it takes the check
 *  when true. `scroll` is the panel's cap in px, for a menu taller than the kit's 300px. */
export type ThreeColumnMenu = Pick<DropdownProps, 'items' | 'sections' | 'header' | 'onSelect' | 'scroll'>;

// A choice row is the kit menu's single-choice item, as the account menu's theme rows are.
const choiceRow: NonNullable<DropdownProps['row']> = (item, props) => item.selected === undefined
  ? (props.href ? <a {...props} /> : <div {...props} />)
  : <div {...props} role="menuitemradio" aria-checked={item.selected}>
    {props.children}
    <span className="ui-dropdown__tick"><Icon name="check" /></span>
  </div>;

export type ThreeColumn = {
  /** The column's h2, and the words of the back link that goes to the column. */
  title: string;
  /** A count after the title, such as the number of rows. */
  count?: number;
  /** The count as a screen reader says it, such as "5 folders". */
  countLabel?: string;
  /** Small tools at the end of the header row. */
  tools?: ReactNode;
  /** With rows, the title opens a menu. Without them, the title is plain text. */
  menu?: ThreeColumnMenu;
  children: ReactNode;
};

export type ThreeColumnPageProps = {
  /** The parents, the children of the selected parent, and the open child. Leave out the
   *  third column when the selected parent has no children: the second takes its space. */
  columns: readonly [ThreeColumn, ThreeColumn, ThreeColumn?];
  depth?: ThreeColumnDepth;
  defaultDepth?: ThreeColumnDepth;
  /** The back link asks for one step up the chain. */
  onDepthChange?: (depth: ThreeColumnDepth) => void;
  /** The address of a depth, for the back link. Without it, the link only calls onDepthChange. */
  depthHref?: (depth: ThreeColumnDepth) => string;
  className?: string;
};

// The kit's two breakpoints. CSS shows and hides the columns. This reads the same
// queries only to name the hidden parent in the back link.
type Mode = 'wide' | 'tablet' | 'phone';
const QUERIES = ['(max-width: 560px)', '(max-width: 860px)'];
const lists = () => typeof window === 'undefined' || !window.matchMedia ? null : QUERIES.map(q => window.matchMedia(q));
const subscribe = (fn: () => void) => {
  const all = lists();
  all?.forEach(q => q.addEventListener?.('change', fn));
  return () => all?.forEach(q => q.removeEventListener?.('change', fn));
};
const mode = (): Mode => { const [phone, tablet] = lists() ?? []; return phone?.matches ? 'phone' : tablet?.matches ? 'tablet' : 'wide'; };

/** The first column on show: all three above 860px, two neighbours to 560px, one below. */
const firstShown = (at: Mode, depth: ThreeColumnDepth): ThreeColumnDepth =>
  at === 'wide' ? 1 : at === 'tablet' ? (depth === 3 ? 2 : 1) : depth;

/** A column browser: the parents, the children of the selected parent, and the open child. */
export function ThreeColumnPage({ columns, depth, defaultDepth = 2, onDepthChange, depthHref, className }: ThreeColumnPageProps) {
  const uid = useId();
  const [own, setOwn] = useState(defaultDepth);
  const count = columns[2] ? 3 : 2;
  const at = Math.min(depth ?? own, count) as ThreeColumnDepth;
  const shown = useSyncExternalStore(subscribe, mode, () => 'wide' as Mode);
  const first = firstShown(shown, at);
  const root = useRef<HTMLDivElement>(null);

  // Read while rendering, before the commit can hide or remove the focused row.
  const held = typeof document !== 'undefined' && Boolean(root.current?.contains(document.activeElement));
  // When a move hides or removes the row that had the focus, the focus goes to the title of
  // the open column, which every width shows.
  useEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    const lost = !active || active === document.body || (active.checkVisibility ? !active.checkVisibility() : false);
    if (!held || !lost) return;
    const col = root.current?.querySelector<HTMLElement>(`[data-column="${at}"] .ui-columns__head`);
    const title = col?.querySelector<HTMLElement>('.ui-columns__menu') ?? col?.querySelector<HTMLElement>('h2');
    title?.focus({ preventScroll: true });
  });

  const up = (at - 1) as ThreeColumnDepth;
  const back = () => { if (depth === undefined) setOwn(up); onDepthChange?.(up); };
  const column = (col: ThreeColumn, n: ThreeColumnDepth) => <section key={n} data-column={n}
    className={`ui-columns__col ui-columns__col--${n}`} aria-labelledby={`${uid}-${n}`}>
    <header className="ui-columns__head">
      <h2 id={`${uid}-${n}`} className={col.menu ? 'ui-sr' : 'ui-card__title'} tabIndex={-1}>{col.title}</h2>
      {col.menu && <Dropdown variant="menu" align="start" triggerContent={col.title} triggerClass="ui-columns__menu"
        items={col.menu.items} sections={col.menu.sections} header={col.menu.header} onSelect={col.menu.onSelect}
        scroll={col.menu.scroll} row={choiceRow} />}
      {col.count !== undefined && <>
        <span className="ui-columns__count" aria-hidden={col.countLabel ? true : undefined}>{col.count}</span>
        {col.countLabel && <span className="ui-sr">{col.countLabel}</span>}
      </>}
      {col.tools && <div className="ui-card__tools">{col.tools}</div>}
    </header>
    {col.children}
  </section>;

  return <div ref={root} className={['ui-columns', className].filter(Boolean).join(' ')} data-depth={at}>
    {first > 1 && <div className="ui-columns__up">
      <BackLink href={depthHref?.(up) ?? '#'} label={columns[first - 2]!.title}
        onClick={(event: MouseEvent) => { if (!depthHref) event.preventDefault(); back(); }} />
    </div>}
    {columns.map((col, i) => col && column(col, (i + 1) as ThreeColumnDepth))}
  </div>;
}
