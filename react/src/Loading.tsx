import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './primitives/Icon';

// The React half of components/loading.js — same classes, same contract, so a
// screen built either way looks and announces identically.
//
// The vanilla side needs setBusy() because it has to reach into a live region
// that is already in the document and change its text; inserting a fresh
// role="status" together with its text announces nothing on several screen
// readers. React gets that for free as long as <BusyRegion> stays mounted
// across the transition — same element, new text, one announcement. Which is
// why BusyRegion wraps the content instead of replacing it: unmounting it and
// mounting the loaded view in its place is the same silent bug in JSX clothing.

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export type SkeletonProps = {
  /** A count of bars, or explicit widths when a ragged prose edge matters. */
  lines?: number | string[];
  width?: string;
  height?: string;
  radius?: string;
  className?: string;
};

// aria-hidden: a shimmer is a picture of content, not content. What a screen
// reader gets is the region's message.
export function Skeleton({ lines = 3, width, height, radius, className }: SkeletonProps) {
  const widths = Array.isArray(lines) ? lines : null;
  const n = widths ? widths.length : Math.max(1, lines as number);
  const styleFor = (i: number): CSSProperties | undefined => {
    const w = widths ? widths[i] : width;
    if (!w && !height && !radius) return undefined;
    return { ...(w && { width: w }), ...(height && { height }), ...(radius && { borderRadius: radius }) };
  };
  return (
    <div className={cx('ui-skel', className)} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="ui-skel__bar m-skeleton" style={styleFor(i)} />
      ))}
    </div>
  );
}

export type SkeletonTableProps = { rows?: number; cols?: number; head?: boolean };

// The column rhythm the real table will have, so the rows landing does not
// resize the page out from under the reader.
export function SkeletonTable({ rows = 5, cols = 4, head = true }: SkeletonTableProps) {
  const cells = Array.from({ length: Math.max(1, cols) }, (_, i) => (
    <span key={i} className="ui-skel__bar m-skeleton" />
  ));
  return (
    <div
      className="ui-skel ui-skel--table"
      style={{ '--skel-cols': Math.max(1, cols) } as CSSProperties}
      aria-hidden="true"
    >
      {head && <div className="ui-skel__row ui-skel__row--head">{cells}</div>}
      {Array.from({ length: Math.max(1, rows) }, (_, i) => (
        <div key={i} className="ui-skel__row">{cells}</div>
      ))}
    </div>
  );
}

export type BusyRegionProps = {
  busy: boolean;
  /** Spoken while it works. */
  label?: string;
  /** Spoken when it finishes — the specific line ("14 invoices") beats "Loaded". */
  message?: string;
  /** Placeholder while busy. Defaults to a three-bar skeleton. */
  placeholder?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function BusyRegion({
  busy, label = 'Loading…', message = 'Loaded', placeholder, className, children,
}: BusyRegionProps) {
  return (
    <div
      className={cx('ui-busy', className)}
      role="status"
      aria-live="polite"
      aria-busy={busy}
    >
      <span className="ui-sr">{busy ? label : message}</span>
      <div className="ui-busy__body">
        {busy ? (placeholder ?? <Skeleton lines={3} />) : children}
      </div>
    </div>
  );
}

export type DeniedProps = {
  title?: string;
  sub?: string;
  /** The scope or role the reader is missing, verbatim. */
  need?: string;
  icon?: string;
  className?: string;
  /** Buttons. Nothing is assumed about what a reader can do next. */
  children?: ReactNode;
};

// No role and no live region: dropped inside a <BusyRegion> it is announced by
// the region, and as a whole page nothing changed to announce. Two live regions
// racing over one event is how a screen says things twice.
export function Denied({
  title = 'You don’t have access', sub, need, icon = 'lock', className, children,
}: DeniedProps) {
  return (
    <div className={cx('ui-denied', className)}>
      <div className="ui-denied__seal"><Icon name={icon} /></div>
      <div className="ui-denied__title">{title}</div>
      {sub && <div className="ui-denied__sub">{sub}</div>}
      {need && <div className="ui-denied__need">Needs <code className="ui-code">{need}</code></div>}
      {children && <div className="ui-denied__actions">{children}</div>}
    </div>
  );
}
