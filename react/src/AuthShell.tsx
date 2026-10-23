import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import './AuthShell.css';

export type AuthShellProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  brand: ReactNode;
  children: ReactNode;
};

/** Centers one auth task on the kit's auth card. */
export const AuthShell = forwardRef<HTMLDivElement, AuthShellProps>(function AuthShell({ brand, children, className, ...rest }, ref) {
  return <div {...rest} ref={ref} className={['ui-auth', className].filter(Boolean).join(' ')}>
    <div className="ui-auth__card">
      <div className="ui-auth__brand">{brand}</div>
      {children}
    </div>
  </div>;
});
