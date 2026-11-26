import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export type MovableCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** The card's heading, such as a link to the record. */
  title: ReactNode;
  /** The card's name for a screen reader: the title as plain text. */
  label: string;
  /** The heading level: one under the column's heading. */
  level?: 3 | 4 | 5 | 6;
  /** The card's menu button. It stands on the centre of the first title line. */
  action?: ReactNode;
  /** True while a person moves the card: its place shows the empty source slot. */
  held?: boolean;
};

/**
 * One record that a person moves to another column, such as a task on a board. The card
 * keeps its box in both themes, is one Tab stop, and the browser can drag it. The page
 * owns the move: it reads the drag and the touch events, and it gives the keyboard the same
 * moves in the card's menu. why: docs/components.md#movable-card
 */
export const MovableCard = forwardRef<HTMLDivElement, MovableCardProps>(function MovableCard(
  { title, label, level = 3, action, held = false, className, children, ...props }, ref,
) {
  const Heading = `h${level}` as 'h3';
  return <div ref={ref} draggable tabIndex={0} role="group" aria-label={label} {...props}
    className={['ui-card', 'ui-card--movable', held && 'is-held', className].filter(Boolean).join(' ')}>
    <div className="ui-card__body">
      <Heading className="ui-card__title">{title}</Heading>
      {children}
    </div>
    {action != null && <span className="ui-card__action">{action}</span>}
  </div>;
});

/** The target slot: the empty place where a moved card lands, as tall as the card. */
export function CardSlot({ height }: { height: number }) {
  return <div className="ui-card-slot" aria-hidden="true" style={{ blockSize: height }} />;
}
