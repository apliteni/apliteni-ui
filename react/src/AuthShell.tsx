import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import './AuthShell.css';

export type AuthShellProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  brand: ReactNode;
  children: ReactNode;
  /** Split layout: the brand stands on the branded ground beside the task, which sits
   *  on the plain page with no card box. On a small screen the brand half becomes a
   *  band at the top. #850 */
  split?: boolean;
  /** A slogan under the brand in the split layout's brand half. */
  tagline?: ReactNode;
  /** The brand stands on the branded ground above the card, not inside it. #850 */
  brandAbove?: boolean;
};

/** Centers one auth task on the kit's auth card, or splits the brand and the task. */
export const AuthShell = forwardRef<HTMLDivElement, AuthShellProps>(function AuthShell({ brand, children, split, tagline, brandAbove, className, ...rest }, ref) {
  const cls = ['ui-auth', split && 'ui-auth--split', brandAbove && 'ui-auth--brand-above', className].filter(Boolean).join(' ');
  if (!split && brandAbove) {
    return <div {...rest} ref={ref} className={cls}>
      <div className="ui-auth__brand">{brand}</div>
      <div className="ui-auth__card">{children}</div>
    </div>;
  }
  if (!split) {
    return <div {...rest} ref={ref} className={cls}>
      <div className="ui-auth__card">
        <div className="ui-auth__brand">{brand}</div>
        {children}
      </div>
    </div>;
  }
  return <div {...rest} ref={ref} className={cls}>
    <aside className="ui-auth__brand-pane">
      <div className="ui-auth__brand">{brand}</div>
      {tagline && <p className="ui-auth__tagline">{tagline}</p>}
    </aside>
    <div className="ui-auth__pane">{children}</div>
  </div>;
});
