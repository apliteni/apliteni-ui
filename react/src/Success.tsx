import { forwardRef, useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode, type SVGAttributes } from 'react';

export type SuccessCheckProps = Omit<SVGAttributes<SVGSVGElement>, 'children'>;

// The bare mark vanilla successCheck() returns; its tick is custom artwork, not a
// Lucide glyph. The width/height attributes keep the base svg fallback from sizing
// it; the containing .ui-sx or .ui-success__check box sets the real size and the
// --sx-* colours, so give it one of those wrappers when composing it alone.
/** Decorative mark. Supply the outcome in adjacent text. */
export const SuccessCheck = forwardRef<SVGSVGElement, SuccessCheckProps>(function SuccessCheck({ className, ...rest }, ref) {
  return <svg {...rest} ref={ref} className={['ui-sx__check', className].filter(Boolean).join(' ')}
    width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" focusable="false">
    <circle className="ui-sx__ring" cx="26" cy="26" r="24" />
    <circle className="ui-sx__disc" cx="26" cy="26" r="24" />
    <path className="ui-sx__tick" d="M15 27l7.5 7.5L37 18" />
  </svg>;
});

export type SuccessPanelProps = Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> & {
  title?: string;
  sub?: string;
};

export const SuccessPanel = forwardRef<HTMLDivElement, SuccessPanelProps>(function SuccessPanel({ title = 'Done', sub, className, ...rest }, ref) {
  return <div {...rest} ref={ref} className={['ui-success', className].filter(Boolean).join(' ')}>
    <div className="ui-success__check"><SuccessCheck /></div>
    <div className="ui-success__title">{title}</div>
    {sub && <div className="ui-success__sub">{sub}</div>}
  </div>;
});

export type SuccessCountdown = { seconds?: number; label?: string };
export type SuccessProps = Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> & {
  layout?: 'hero' | 'split' | 'compact';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  backdrop?: 'aurora' | 'glow' | 'flat';
  eyebrow?: string;
  title?: string;
  body?: string;
  actions?: ReactNode;
  confetti?: boolean;
  /** Set to null to cancel; changing seconds starts a new countdown. */
  countdown?: SuccessCountdown | null;
  onCountdownEnd?: () => void;
};

// [left %, delay s, rotation deg, colour key, scale] — deterministic, as in success.js.
const pieces = [
  [8, 0, -24, 'a', 1], [20, .14, 40, 'g', .8], [31, .06, 12, 'c', 1.1],
  [42, .20, -52, 'p', .9], [50, .02, 28, 'a', 1], [58, .18, -16, 'k', .75],
  [67, .09, 60, 'g', 1.05], [76, .24, -36, 'c', .85], [85, .05, 20, 'a', 1],
  [92, .16, -48, 'p', .9], [14, .30, 44, 'k', .8], [37, .34, -28, 'g', 1],
  [62, .28, 52, 'a', .9], [80, .36, -20, 'c', 1.05],
] as const;

function Countdown({ seconds, label = 'Redirecting', onDone }: Required<Pick<SuccessCountdown, 'seconds'>> & Pick<SuccessCountdown, 'label'> & { onDone?: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const callback = useRef(onDone);
  useEffect(() => { callback.current = onDone; }, [onDone]);
  useEffect(() => {
    let count = seconds;
    const timer = setInterval(() => {
      count -= 1;
      setRemaining(count);
      if (count === 0) {
        clearInterval(timer);
        callback.current?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);
  return <div className="ui-sx__count" data-sx-count="" style={{ '--sx-secs': `${seconds}s` } as CSSProperties}>
    <span className="ui-sx__count-ring" aria-hidden="true" />
    <span className="ui-sx__count-text">{label} in <b data-sx-num="">{remaining}</b>s</span>
  </div>;
}

export const Success = forwardRef<HTMLDivElement, SuccessProps>(function Success({
  layout = 'hero', level, backdrop = 'aurora', eyebrow, title = 'All done', body,
  actions, confetti = false, countdown, onCountdownEnd, className, ...rest
}, ref) {
  // Clamp the rank as vanilla does: an out-of-range level renders no heading at all,
  // leaving a page whose whole content is a Success without one.
  // why: docs/specification.md#the-page
  const rank = [1, 2, 3, 4, 5, 6].includes(Number(level)) ? Number(level) : (layout === 'compact' ? 2 : 1);
  const Heading = `h${rank}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  // Vanilla writes the row only for actions.length; an empty one still adds its 20px margin.
  const hasActions = Array.isArray(actions) ? actions.length > 0 : Boolean(actions);
  const seconds = countdown?.seconds;
  const duration = seconds != null && Number.isFinite(seconds) && seconds >= 1 ? Math.floor(seconds) : 5;
  return <div role="status" aria-live="polite" {...rest} ref={ref}
    className={['ui-sx', `ui-sx--${layout}`, `ui-sx--bd-${backdrop}`, confetti && 'ui-sx--confetti', className].filter(Boolean).join(' ')}>
    {backdrop === 'aurora' && <div className="ui-sx__aurora" aria-hidden="true">
      <span className="ui-sx__glow ui-sx__glow--a" /><span className="ui-sx__glow ui-sx__glow--b" />
    </div>}
    {backdrop === 'glow' && <span className="ui-glow ui-glow--green ui-sx__bg-glow" aria-hidden="true" />}
    {confetti && <div className="ui-sx__confetti" aria-hidden="true">{pieces.map(([x, d, r, t, s], index) =>
      <i key={index} className={`ui-sx__piece ui-sx__piece--${t}`} style={{ left: `${x}%`, '--sx-d': `${d}s`, '--sx-r': `${r}deg`, '--sx-s': s } as CSSProperties} />,
    )}</div>}
    <div className="ui-sx__inner">
      <div className="ui-sx__visual"><SuccessCheck /></div>
      <div className="ui-sx__content">
        {eyebrow && <div className="ui-sx__eyebrow">{eyebrow}</div>}
        <Heading className="ui-sx__title">{title}</Heading>
        {body && <p className="ui-sx__body">{body}</p>}
        {hasActions && <div className="ui-sx__actions">{actions}</div>}
        {countdown && <Countdown key={duration} seconds={duration} label={countdown.label} onDone={onCountdownEnd} />}
      </div>
    </div>
  </div>;
});
