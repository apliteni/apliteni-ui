import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type ButtonHTMLAttributes, type ReactNode, type SyntheticEvent, type KeyboardEvent } from 'react';
import { Icon } from './Icon';

export type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: string;
  iconRight?: string;
  iconOnly?: boolean;
  block?: boolean;
  /** In flight: keeps focus, blocks activation, announces progress, and shows dots. */
  busy?: boolean;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

// One announcer per document keeps status updates outside aria-busy and the React root.
const announcers = new WeakMap<Document, { node: HTMLSpanElement; users: number; timer?: ReturnType<typeof setTimeout> }>();
function acquireAnnouncer(doc: Document) {
  let entry = announcers.get(doc);
  if (!entry) {
    const node = doc.createElement('span');
    node.className = 'ui-sr ui-btn__status';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    doc.body.append(node);
    entry = { node, users: 0 };
    announcers.set(doc, entry);
  }
  const current = entry;
  current.users++;
  return {
    announce(text: string) {
      clearTimeout(current.timer);
      // Register the empty live region before its first text update.
      current.timer = setTimeout(() => { current.node.textContent = text; }, 0);
    },
    release() {
      if (--current.users === 0) {
        clearTimeout(current.timer);
        current.node.remove();
        announcers.delete(doc);
      }
    },
  };
}

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'secondary', size = 'md', icon, iconRight, iconOnly, block, busy, children,
  type = 'button', disabled, onClick, onClickCapture, onKeyDown, onKeyDownCapture,
  onKeyUp, onKeyUpCapture, ...rest
}, forwardedRef) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(forwardedRef, () => buttonRef.current!, []);
  const labelRef = useRef<HTMLSpanElement>(null);
  const announcer = useRef<ReturnType<typeof acquireAnnouncer> | null>(null);
  const hasBeenBusy = useRef(false);
  if (busy) hasBeenBusy.current = true;
  const readyChildren = useRef(children);
  if (!busy) readyChildren.current = children;
  const renderedChildren = busy ? readyChildren.current : children;
  const previous = useRef<{ text: string; busy: boolean | undefined }>(null);
  useLayoutEffect(() => {
    const label = labelRef.current;
    const text = label?.textContent ?? buttonRef.current?.getAttribute('aria-label') ?? '';
    const prior = previous.current;
    if ((busy || prior?.busy) && (!prior || prior.text !== text || prior.busy !== busy)) {
      announcer.current ??= acquireAnnouncer(buttonRef.current!.ownerDocument);
      announcer.current.announce(`${text}: ${busy ? 'in progress' : 'complete'}`);
    }
    previous.current = { text, busy };
  });
  useLayoutEffect(() => () => {
    announcer.current?.release();
    announcer.current = null;
    previous.current = null;
  }, []);
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
    <button
      ref={buttonRef}
      data-btn-wired=""
      data-btn-ready={!busy && hasBeenBusy.current ? '' : undefined}
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
      {!iconOnly && renderedChildren != null && <span className="ui-btn__label-slot"><span className="ui-btn__label" ref={labelRef}>{renderedChildren}</span></span>}
      {iconRight && <Icon name={iconRight} />}
      {busy && <span className="ui-btn__dots" aria-hidden="true"><i /><i /><i /></span>}
    </button>
  );
});
