import { useLayoutEffect, useRef, type ButtonHTMLAttributes, type ReactNode, type SyntheticEvent, type KeyboardEvent } from 'react';
import { slideButtonLabel } from '@apliteni/apliteni-ui';
import { Icon } from './Icon';

export type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: string;
  iconRight?: string;
  iconOnly?: boolean;
  block?: boolean;
  /** In flight: keeps focus, blocks activation, announces label changes, and shows bars. */
  busy?: boolean;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export function Button({
  variant = 'secondary', size = 'md', icon, iconRight, iconOnly, block, busy, children,
  type = 'button', disabled, onClick, onClickCapture, onKeyDown, onKeyDownCapture,
  onKeyUp, onKeyUpCapture, ...rest
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const cancelSlide = useRef<(() => void) | undefined>(undefined);
  const previous = useRef<{ node: HTMLElement | null; text: string; busy: boolean | undefined }>(null);
  useLayoutEffect(() => {
    const label = labelRef.current;
    const text = label?.textContent ?? buttonRef.current?.getAttribute('aria-label') ?? '';
    const prior = previous.current;
    if (prior && (busy || prior.busy) && prior.text !== text) {
      cancelSlide.current?.();
      if (label) cancelSlide.current = slideButtonLabel(label, prior.node);
    }
    if (prior && (busy || prior.busy) && statusRef.current && statusRef.current.textContent !== text) {
      statusRef.current.textContent = text;
    }
    previous.current = { node: (label?.cloneNode(true) as HTMLElement | undefined) ?? null, text, busy };
  });
  useLayoutEffect(() => () => cancelSlide.current?.(), []);
  const blockActivation = (event: SyntheticEvent) => {
    if (!busy) return false;
    event.preventDefault();
    event.stopPropagation();
    return true;
  };
  const blockKey = (event: KeyboardEvent<HTMLButtonElement>) =>
    (event.key === 'Enter' || event.key === ' ') && blockActivation(event);
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
  return (
    <>
      <button
        ref={buttonRef}
        data-btn-wired=""
        type={type}
        className={cls}
        disabled={disabled}
        aria-disabled={disabled || busy ? true : undefined}
        aria-busy={busy ? true : undefined}
        {...rest}
        {...named}
        onClickCapture={event => { if (!blockActivation(event)) onClickCapture?.(event); }}
        onClick={event => { if (!blockActivation(event)) onClick?.(event); }}
        onKeyDownCapture={event => { if (!blockKey(event)) onKeyDownCapture?.(event); }}
        onKeyDown={event => { if (!blockKey(event)) onKeyDown?.(event); }}
        onKeyUpCapture={event => { if (!blockKey(event)) onKeyUpCapture?.(event); }}
        onKeyUp={event => { if (!blockKey(event)) onKeyUp?.(event); }}
      >
        {icon && <Icon name={icon} />}
        {!iconOnly && children != null && <span className="ui-btn__label-slot"><span className="ui-btn__label" ref={labelRef}>{children}</span></span>}
        {iconRight && <Icon name={iconRight} />}
        {busy && <span className="ui-btn__bars" aria-hidden="true"><i /><i /></span>}
      </button>
      <span ref={statusRef} className="ui-sr ui-btn__status" role="status" aria-live="polite" />
    </>
  );
}
