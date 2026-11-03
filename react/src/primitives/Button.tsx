import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type HTMLAttributes, type RefAttributes, type ReactElement, type ReactNode, type SyntheticEvent, type KeyboardEvent } from 'react';
import { Icon } from './Icon';

type ButtonOptions = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
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
type HoldOptions = {
  /** Hold to confirm: a 1 s press, or two presses within 3 s, calls onConfirm. A click never calls onClick. */
  hold?: boolean;
  onConfirm?: () => void;
};
export type NativeButtonProps = ButtonOptions & HoldOptions & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };
export type ButtonLinkProps = ButtonOptions & AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string; disabled?: boolean; hold?: never; onConfirm?: never;
};
export type ButtonProps = NativeButtonProps | ButtonLinkProps;
type ButtonElement = HTMLButtonElement | HTMLAnchorElement;
type RootProps = ButtonOptions & HoldOptions & HTMLAttributes<ButtonElement> & {
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

// why: docs/components.md#hold-to-confirm
const HOLD_MS = 1000, TAP_MS = 300, STEP_MS = 250, TWICE_MS = 3000;
const HOLD_HELP = 'Hold to confirm, or press twice.';

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export const Button = forwardRef<ButtonElement, RootProps>(function Button({
  variant = 'secondary', size = 'md', icon, leading, iconRight, iconOnly, block, busy, completionMessage, children, hold, onConfirm,
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
  // The hold runs on the element itself: its fill and hint change every frame,
  // and a re-render for each would replace what the caller renders inside.
  const holds = hold === true && href === undefined;
  const holdHelpId = useId();
  const live = useRef({ busy, disabled, onConfirm });
  live.current = { busy, disabled, onConfirm };
  const cancelHold = useRef(() => {});
  useEffect(() => {
    const btn = buttonRef.current;
    if (!holds || !btn) return;
    let by: 'pointer' | 'key' | null = null, start = 0, frame = 0, armedUntil = 0;
    let step: ReturnType<typeof setInterval> | undefined, done: ReturnType<typeof setTimeout> | undefined;
    const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paint = (p: number) => btn.style.setProperty('--hold', String(p));
    const hint = (on: boolean) => btn.toggleAttribute('data-hold-hint', on);
    // The fill keeps its paint while it drains, also after a release outside the button.
    const fillEl = btn.querySelector('.ui-btn__hold-fill');
    let drained: ReturnType<typeof setTimeout> | undefined;
    const undrain = () => {
      clearTimeout(drained);
      btn.removeAttribute('data-hold-drain');
    };
    const stop = () => {
      by = null;
      cancelAnimationFrame(frame);
      clearInterval(step);
      clearTimeout(done);
    };
    const confirm = () => {
      stop();
      // Empty the fill without its drain: the act is done, not taken back.
      paint(0);
      btn.removeAttribute('data-holding');
      hint(false);
      live.current.onConfirm?.();
    };
    const tick = () => {
      paint(Math.min(1, (performance.now() - start) / HOLD_MS));
      frame = requestAnimationFrame(tick);
    };
    const begin = (source: 'pointer' | 'key') => {
      if (by || live.current.busy || live.current.disabled) return;
      by = source;
      start = performance.now();
      hint(false);
      undrain();
      btn.setAttribute('data-holding', '');
      // Reduced motion: four still steps that still add up to the full hold.
      if (reduced()) {
        let n = 0;
        step = setInterval(() => paint(Math.min(4, ++n) / 4), STEP_MS);
      } else frame = requestAnimationFrame(tick);
      done = setTimeout(confirm, HOLD_MS);
    };
    const end = () => {
      if (!by) return;
      const short = performance.now() - start < TAP_MS;
      stop();
      btn.setAttribute('data-hold-drain', '');
      drained = setTimeout(undrain, HOLD_MS);
      btn.removeAttribute('data-holding');
      paint(0);
      if (short) hint(true);
    };
    // Busy or disabled during a hold: the hold stops and confirms nothing.
    cancelHold.current = () => {
      armedUntil = 0;
      hint(false);
      if (!by) return;
      stop();
      btn.removeAttribute('data-holding');
      paint(0);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      btn.setPointerCapture?.(e.pointerId);
      begin('pointer');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (!e.repeat) begin('key');
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      end();
    };
    // A screen reader activates with a bare click: no pointer down and no key down.
    const onClick = (e: MouseEvent) => {
      if (e.detail !== 0 || by || live.current.busy || live.current.disabled) return;
      if (performance.now() < armedUntil) {
        armedUntil = 0;
        confirm();
        return;
      }
      armedUntil = performance.now() + TWICE_MS;
      hint(true);
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    const listeners: [string, (e: never) => void][] = [
      ['pointerdown', onPointerDown], ['pointerup', end], ['pointercancel', end], ['lostpointercapture', end],
      ['keydown', onKeyDown], ['keyup', onKeyUp], ['blur', end], ['click', onClick], ['contextmenu', onContextMenu],
    ];
    for (const [type, fn] of listeners) btn.addEventListener(type, fn as EventListener);
    fillEl?.addEventListener('transitionend', undrain);
    return () => {
      stop();
      undrain();
      cancelHold.current = () => {};
      fillEl?.removeEventListener('transitionend', undrain);
      for (const [type, fn] of listeners) btn.removeEventListener(type, fn as EventListener);
      btn.removeAttribute('data-holding');
      btn.removeAttribute('data-hold-hint');
      btn.style.removeProperty('--hold');
    };
  }, [holds]);
  useEffect(() => { if (busy || disabled) cancelHold.current(); }, [busy, disabled]);
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
  const describedBy = holds ? cx(rest['aria-describedby'], holdHelpId) : rest['aria-describedby'];
  const lead = leading != null ? <span aria-hidden="true" style={{ display: 'inline-flex' }}>{leading}</span> : icon && <Icon name={icon} />;
  return (
    <Root
      {...rest}
      ref={buttonRef as React.Ref<HTMLButtonElement & HTMLAnchorElement>}
      data-btn-wired=""
      data-btn-ready={!busy && hasBeenBusy.current ? '' : undefined}
      // A hold button is never a form's default button: Enter in a field would click it.
      type={href === undefined ? (holds ? 'button' : type) : undefined}
      href={disabled || busy ? undefined : href}
      role={href !== undefined ? 'link' : rest.role}
      tabIndex={href !== undefined && disabled ? -1 : href !== undefined ? tabIndex ?? 0 : tabIndex}
      data-btn-disabled={disabled ? '' : undefined}
      className={cls}
      disabled={href === undefined ? disabled : undefined}
      aria-disabled={disabled || busy ? true : undefined}
      aria-busy={busy ? true : undefined}
      aria-describedby={describedBy}
      data-hold={holds ? '' : undefined}
      {...named}
      onAuxClickCapture={event => { if (!blockActivation(event)) onAuxClickCapture?.(event); }}
      onAuxClick={event => { if (!blockActivation(event)) onAuxClick?.(event); }}
      onClickCapture={event => { if (!blockActivation(event)) onClickCapture?.(event); }}
      onClick={event => {
        if (blockActivation(event)) return;
        // A hold button confirms only through onConfirm, and never submits its form.
        if (holds) event.preventDefault();
        else onClick?.(event);
      }}
      onKeyDownCapture={event => { if (!blockKey(event)) onKeyDownCapture?.(event); }}
      onKeyDown={event => { if (!blockKey(event)) onKeyDown?.(event); }}
      onKeyUpCapture={event => { if (!blockKey(event)) onKeyUpCapture?.(event); }}
      onKeyUp={event => { if (!blockKey(event)) onKeyUp?.(event); }}
    >
      {lead}
      {!iconOnly && renderedChildren != null && <span className="ui-btn__label-slot"><span className="ui-btn__label" ref={labelRef}>{renderedChildren}</span></span>}
      {iconRight && <Icon name={iconRight} />}
      {busy && <span className="ui-btn__dots" aria-hidden="true"><i /><i /><i /></span>}
      {holds && <>
        <span className="ui-btn__hold-fill" aria-hidden="true">
          {lead}
          {!iconOnly && renderedChildren != null && <span className="ui-btn__label-slot"><span className="ui-btn__label">{renderedChildren}</span></span>}
          {iconRight && <Icon name={iconRight} />}
        </span>
        <span className="ui-btn__hold-hint" aria-hidden="true">Hold to confirm</span>
        <span id={holdHelpId} hidden>{HOLD_HELP}</span>
      </>}
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
