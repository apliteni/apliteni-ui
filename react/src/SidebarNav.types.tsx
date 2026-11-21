/* The type half of "group labels or sub-items, never both" (#843). The project in
 * tsconfig.types.json compiles this file, so a refusal that stops refusing leaves an
 * unused @ts-expect-error, and scripts/react-types.test.js fails on it.
 * Limits: it checks the published types, not what renders. SidebarNav.test.tsx holds
 * the warning for a caller the types do not reach. */
import { SidebarNav } from './SidebarNav';
import { AppShell } from './AppShell';

const leaf = { id: 'inv', label: 'Invoices' };
const group = { id: 'pay', label: 'Payouts', items: [{ id: 'pending', label: 'Pending' }] };
const shell = { pathname: '/', title: 'Payouts', account: { name: 'Demo User', email: 'demo@example.com' }, onSignOut() {} };

export const allowed = <>
  <SidebarNav sections={[{ label: 'Billing', items: [leaf] }, { label: 'Workspace', items: [leaf] }]} />
  <SidebarNav sections={[{ items: [leaf, group] }]} />
  <SidebarNav items={[leaf, group]} />
  <AppShell {...shell} sections={[{ href: '/pay', label: 'Payouts', icon: 'card', items: [{ href: '/pay/pending', label: 'Pending' }] }]} />
  <AppShell {...shell} groups={[{ label: 'Money', sections: [{ href: '/pay', label: 'Payouts', icon: 'card' }] }]} />
</>;

export const refused = <>
  {/* @ts-expect-error -- a labelled section takes no sub-items */}
  <SidebarNav sections={[{ label: 'Billing', items: [group] }]} />
  {/* @ts-expect-error -- labels in one section and sub-items in another */}
  <SidebarNav sections={[{ label: 'Billing', items: [leaf] }, { items: [group] }]} />
  {/* @ts-expect-error -- a grouped section takes no sub-items */}
  <AppShell {...shell} groups={[{ label: 'Money', sections: [{ href: '/pay', label: 'Payouts', icon: 'card', items: [{ href: '/pay/pending', label: 'Pending' }] }] }]} />
  {/* @ts-expect-error -- sections and groups in one shell */}
  <AppShell {...shell} sections={[]} groups={[]} />
</>;
