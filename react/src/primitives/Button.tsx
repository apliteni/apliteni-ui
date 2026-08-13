import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

export type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconRight?: string;
  iconOnly?: boolean;
  block?: boolean;
  /** In flight: aria-busy, disabled, and the kit's indeterminate bars. */
  busy?: boolean;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export function Button({
  variant = 'secondary', size = 'md', icon, iconRight, iconOnly, block, busy, children,
  type = 'button', disabled, ...rest
}: ButtonProps) {
  const cls = cx(
    'ui-btn',
    variant && `ui-btn--${variant}`,
    size !== 'md' && `ui-btn--${size}`,
    block && 'ui-btn--block',
    iconOnly && 'ui-btn--icon',
  );
  // iconOnly drops the visible children and the glyph is aria-hidden, so the
  // button would otherwise have no accessible name. Mirror string children into
  // aria-label + title (an explicit aria-label / aria-labelledby always wins),
  // and fall back to the icon name so a nameless icon button can't ship.
  const labelled = rest['aria-label'] != null || rest['aria-labelledby'] != null;
  const fallback = typeof children === 'string' && children.trim() ? children.trim() : icon;
  const named = iconOnly && !labelled && fallback
    ? { 'aria-label': fallback, title: rest.title ?? fallback }
    : {};
  // busy ⇒ disabled, exactly as button() decides it in components/index.js. A
  // control that still takes clicks while it works submits twice, and the two
  // implementations of this button must not disagree about that.
  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || busy}
      aria-disabled={disabled || busy ? true : undefined}
      aria-busy={busy ? true : undefined}
      {...rest}
      {...named}
    >
      {icon && <Icon name={icon} />}
      {!iconOnly && children != null && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} />}
      {busy && <span className="ui-btn__bars"><i /><i /></span>}
    </button>
  );
}
