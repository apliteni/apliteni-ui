import { forwardRef, type HTMLAttributes } from 'react';

export type PillProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'live' | 'soon';
};

export const Pill = forwardRef<HTMLSpanElement, PillProps>(function Pill({
  variant, className, ...rest
}, ref) {
  const classes = ['ui-pill', variant && `ui-pill--${variant}`, className].filter(Boolean).join(' ');
  return <span {...rest} ref={ref} className={classes} />;
});
