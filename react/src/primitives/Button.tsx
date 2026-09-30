import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type HTMLAttributes, type RefAttributes, type ReactElement, type ReactNode, type SyntheticEvent, type KeyboardEvent } from 'react';
import { Icon } from './Icon';

type ButtonOptions = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: string;
  /** Decorative caller artwork, before the label; takes precedence over icon. */
  leading?: ReactNode;
  iconRight?: string;
  iconOnly?: boolean;
  block?: boolean;
  /** In flight: keeps focus, blocks activation, announces progress, and shows dots. */
  busy?: boolean;
  /** Message after busy ends; an empty string leaves outcome announcements to the caller. */
  completionMessage?: string;
  children?: ReactNode;
};
export type NativeButtonProps = ButtonOptions & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };
export type ButtonLinkProps = ButtonOptions & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; disabled?: boolean };
export type ButtonProps = NativeButtonProps | ButtonLinkProps;
type ButtonElement = HTMLButtonElement | HTMLAnchorElement;
type RootProps = ButtonOptions & HTMLAttributes<ButtonElement> & {
  href?: string; disabled?: boolean; type?: 'button' | 'submit' | 'reset';
};

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

export const Button = forwardRef<ButtonElement, RootProps>(function Button({
  variant = 'secondary', size = 'md', icon, leading, iconRight, iconOnly, block, busy, completionMessage, children,
  type = 'button', href, disabled, className, tabIndex, onAuxClick, onAuxClickCapture, onClick, onClickCapture, onKeyDown, onKeyDownCapture,
  onKeyUp, onKeyUpCapture, ...rest
}, forwardedRef) {
  const buttonRef = useRef<ButtonElement>(null);
  useImperativeHandle(forwardedRef, () => buttonRef.current!, [href !== undefined]);
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
      announcer.current.announce(busy ? `${text}: in progress` : completionMessage ?? `${text}: complete`);
    }
    previous.current = { text, busy };
  });
  useLayoutEffect(() => () => {
    announcer.current?.release();
    announcer.current = null;
    previous.current = null;
  }, []);
  const blockActivation = (event: SyntheticEvent) => {
    if (!busy && !disabled) return false;
    event.preventDefault();
    event.stopPropagation();
    return true;
  };
  // Space activates a button and scrolls the page on a link, so only a button root
  // blocks it: a focused busy link that swallowed Space would trap the scroll.
  const blockKey = (event: KeyboardEvent<ButtonElement>) =>
    (event.key === 'Enter' || (event.key === ' ' && href === undefined)) && blockActivation(event);
  const cls = cx(
    'ui-btn',
    variant && `ui-btn--${variant}`,
    size !== 'md' && `ui-btn--${size}`,
    block && 'ui-btn--block',
    iconOnly && 'ui-btn--icon',
    className,
  );
  // iconOnly drops the visible children and the glyph is aria-hidden, so the
  // control would otherwise have no accessible name. Mirror string children into
  // aria-label + title (an explicit aria-label / aria-labelledby always wins),
  // then the icon name. With neither, nothing is invented: a control named
  // "Button" reads as named to axe and says nothing to the person hearing it.
  // why: guidelines/microcopy.md#name-every-control
  const labelled = rest['aria-label'] != null || rest['aria-labelledby'] != null;
  const fallback = typeof children === 'string' && children.trim() ? children.trim() : icon;
  const named = iconOnly && !labelled && fallback
    ? { 'aria-label': fallback, title: rest.title ?? fallback }
    : {};
  const Root = href === undefined ? 'button' : 'a';
  return (
    <Root
      {...rest}
      ref={buttonRef as React.Ref<HTMLButtonElement & HTMLAnchorElement>}
      data-btn-wired=""
      data-btn-ready={!busy && hasBeenBusy.current ? '' : undefined}
      type={href === undefined ? type : undefined}
      href={disabled || busy ? undefined : href}
      role={href !== undefined ? 'link' : rest.role}
      tabIndex={href !== undefined && disabled ? -1 : href !== undefined ? tabIndex ?? 0 : tabIndex}
      data-btn-disabled={disabled ? '' : undefined}
      className={cls}
      disabled={href === undefined ? disabled : undefined}
      aria-disabled={disabled || busy ? true : undefined}
      aria-busy={busy ? true : undefined}
      {...named}
      onAuxClickCapture={event => { if (!blockActivation(event)) onAuxClickCapture?.(event); }}
      onAuxClick={event => { if (!blockActivation(event)) onAuxClick?.(event); }}
      onClickCapture={event => { if (!blockActivation(event)) onClickCapture?.(event); }}
      onClick={event => { if (!blockActivation(event)) onClick?.(event); }}
      onKeyDownCapture={event => { if (!blockKey(event)) onKeyDownCapture?.(event); }}
      onKeyDown={event => { if (!blockKey(event)) onKeyDown?.(event); }}
      onKeyUpCapture={event => { if (!blockKey(event)) onKeyUpCapture?.(event); }}
      onKeyUp={event => { if (!blockKey(event)) onKeyUp?.(event); }}
    >
      {leading != null ? <span aria-hidden="true" style={{ display: 'inline-flex' }}>{leading}</span> : icon && <Icon name={icon} />}
      {!iconOnly && renderedChildren != null && <span className="ui-btn__label-slot"><span className="ui-btn__label" ref={labelRef}>{renderedChildren}</span></span>}
      {iconRight && <Icon name={iconRight} />}
      {busy && <span className="ui-btn__dots" aria-hidden="true"><i /><i /><i /></span>}
    </Root>
  );
}) as {
  (props: NativeButtonProps & RefAttributes<HTMLButtonElement>): ReactElement;
  (props: ButtonLinkProps & RefAttributes<HTMLAnchorElement>): ReactElement;
  // The union signature is last on purpose. It is what lets a caller forward the
  // exported ButtonProps straight back in, and `ComponentProps<typeof Button>`
  // reads the last signature of an overloaded type — with the anchor there it
  // silently meant "a link, href required".
  (props: ButtonProps & RefAttributes<ButtonElement>): ReactElement;
  // forwardRef carries this; the cast has to keep it or `Button.displayName` stops
  // type-checking for consumers.
  displayName?: string;
};
