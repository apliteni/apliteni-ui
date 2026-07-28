import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

export type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconRight?: string;
  iconOnly?: boolean;
  block?: boolean;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export function Button({
  variant = 'secondary', size = 'md', icon, iconRight, iconOnly, block, children, ...rest
}: ButtonProps) {
  const cls = cx(
    'ui-btn',
    variant && `ui-btn--${variant}`,
    size !== 'md' && `ui-btn--${size}`,
    block && 'ui-btn--block',
    iconOnly && 'ui-btn--icon',
  );
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} />}
      {!iconOnly && children != null && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}
