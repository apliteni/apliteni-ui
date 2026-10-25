// The finance portal's shell in React: the React twin of financeShell() in
// _finance-nav.js, which keeps the nav, the reader and the story links, so the two
// shells cannot drift apart while both exist.
import type { CSSProperties, ReactNode } from 'react';
import { AppShell } from '../../react/src/AppShell';
// @ts-expect-error -- plain JS story module
import { DASHBOARD_STORY, FINANCE_NAV, FINANCE_READER } from './_finance-nav.js';
// @ts-expect-error -- plain JS story module
import { previewHref } from '../lib/story-link.js';

type NavItem = { id: string; icon: string; label: string; href: string; target?: string };

// AppShell lights the section whose href matches `pathname`, so each section gets
// a path of its own, and the link it draws is the portal's real story link.
const sections = (FINANCE_NAV as NavItem[]).map(item => ({ href: `/${item.id}`, label: item.label, icon: item.icon }));
const linkOf = Object.fromEntries((FINANCE_NAV as NavItem[]).map(item => [`/${item.id}`, item]));

export const FinanceShell = ({ active, crumb, title, sub, back, children }: {
  active: string; crumb?: string; title: string; sub?: string; back?: { href: string; label: string }; children: ReactNode;
}) =>
  // The portal's column is 960px, set the way the vanilla shell sets it: through the
  // shell's own --ui-app-main, which the main column reads.
  <div style={{ '--ui-app-main': '960px' } as CSSProperties}>
    <AppShell layout="rail" word="Finance" sections={sections} pathname={`/${active}`} title={title} lede={sub}
      back={back}
      crumbs={active === 'dashboard' ? [{ label: 'Finance' }] : [{ label: 'Finance', href: previewHref(DASHBOARD_STORY) }, { label: crumb || title }]}
      account={FINANCE_READER} onSignOut={() => {}}
      renderLink={(section, props) => <a {...props} href={linkOf[section.href].href} target={linkOf[section.href].target} />}>
      {children}
    </AppShell>
  </div>;
