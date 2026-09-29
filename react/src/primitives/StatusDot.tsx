import { forwardRef, type HTMLAttributes } from 'react';

export type StatusDotProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  live?: boolean;
};

export const StatusDot = forwardRef<HTMLSpanElement, StatusDotProps>(function StatusDot({
  live = false, className, ...rest
}, ref) {
  const labelled = Boolean(rest['aria-label']?.trim() || rest['aria-labelledby']?.trim());
  const classes = ['ui-dot', live && 'is-live', className].filter(Boolean).join(' ');
  return <span role={labelled ? 'img' : undefined} aria-hidden={labelled ? undefined : true}
    {...rest} ref={ref} className={classes} />;
});
