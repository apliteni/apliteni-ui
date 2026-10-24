// A React AppShell for the showcases that are not the finance portal: sections from
// a nav list, each lit by its own path, with inert links, as the vanilla demos draw them.
import type { ComponentProps } from 'react';
import { AppShell } from '../../react/src/AppShell';

export type DemoNavItem = { id: string; icon: string; label: string; count?: number };
type ShellProps = Omit<ComponentProps<typeof AppShell>, 'sections' | 'pathname' | 'account' | 'onSignOut'>;

export const DemoShell = ({ nav, active, ...props }: ShellProps & { nav: DemoNavItem[]; active: string }) =>
  <AppShell {...props} sections={nav.map(item => ({ href: `/${item.id}`, label: item.label, icon: item.icon, count: item.count }))}
    pathname={`/${active}`} account={{ name: 'Ada Lovelace', email: 'ada@apliteni.com' }} onSignOut={() => {}}
    renderLink={(_, linkProps) => <a {...linkProps} href="#" />} />;
