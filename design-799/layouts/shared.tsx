// Parts that the three layouts share. Every person, figure and address is fabricated.
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { brand } from '@apliteni/apliteni-ui';
import { AppShell, AuthShell, Badge, Button, Callout, Card, DataTable, type Column } from '@apliteni/apliteni-ui/react';

export type View = 'page' | 'error' | 'modal' | 'modal-error' | 'closed';

// The address picks the view and the theme, so a capture needs no clicks: ?view=modal&theme=dark
const query = new URLSearchParams(location.search);
export const view = (query.get('view') ?? 'page') as View;
const theme = query.get('theme') === 'light' ? 'light' : 'dark';
document.documentElement.setAttribute('data-theme', theme);
// The shell's theme control reads the stored choice, so store the same theme.
try { localStorage.setItem('apliteni-strategy-theme', theme); } catch { /* file pages may block storage */ }

export const person = { name: 'Ada Lovelace', email: 'ada@example.com' };

const brandMark = <span dangerouslySetInnerHTML={{ __html: brand({ p: 'signin', word: 'Finance', href: '#' }) }} />;

// Vendor artwork for the two brand marks. GitHub uses the kit glyph.
const googleMark = <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.4 45 30.9 45 24.5z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.2H4.3v5.7C7.9 41.1 15.3 46 24 46z"/><path fill="#FBBC05" d="M11.6 27.9c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.7H4.3C2.8 17.3 2 20.6 2 24s.8 6.7 2.3 9.6l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.3 2 7.9 6.9 4.3 14.4l7.3 5.7C13.3 14.7 18.2 10.8 24 10.8z"/></svg>;
const microsoftMark = <svg width="17" height="17" viewBox="0 0 21 21" aria-hidden="true"><path fill="#F25022" d="M0 0h10v10H0z"/><path fill="#7FBA00" d="M11 0h10v10H11z"/><path fill="#00A4EF" d="M0 11h10v10H0z"/><path fill="#FFB900" d="M11 11h10v10H11z"/></svg>;

export type Provider = { id: string; name: string; mark?: ReactNode; icon?: string };
export const providers: Provider[] = [
  { id: 'google', name: 'Google', mark: googleMark },
  { id: 'microsoft', name: 'Microsoft', mark: microsoftMark },
  { id: 'github', name: 'GitHub', icon: 'github' },
];

export const providerButton = (p: Provider, variant: 'primary' | 'secondary' = 'secondary', size: 'md' | 'lg' = 'lg') =>
  <Button key={p.id} variant={variant} size={size} block leading={p.mark} icon={p.icon}>Continue with {p.name}</Button>;

export const page = (body: ReactNode) => <AuthShell brand={brandMark}>{body}</AuthShell>;

// The app screen that the session ends on: a payouts list with a filter left as the person set it.
const sections = [
  { href: '/overview', label: 'Overview', icon: 'chart' },
  { href: '/payouts', label: 'Payouts', icon: 'card' },
  { href: '/reports', label: 'Reports', icon: 'table' },
  { href: '/prefs', label: 'Preferences', icon: 'gear' },
];
const rows = [
  { name: 'Northwind Traders', day: '2026-11-09', net: '4,200.00', status: 'Pending' },
  { name: 'Globex', day: '2026-11-08', net: '860.00', status: 'Pending' },
  { name: 'Initech', day: '2026-11-06', net: '1,975.50', status: 'Pending' },
];
const columns: Column<typeof rows[number]>[] = [
  { key: 'name', label: 'Client' },
  { key: 'day', label: 'Arrival' },
  { key: 'net', label: 'Net (EUR)', num: true },
  { key: 'status', label: 'Status', render: (row) => <Badge variant="warning">{row.status}</Badge> },
];

export function AppScreen({ children, signedOut, onSignIn }: { children?: ReactNode; signedOut?: boolean; onSignIn?: () => void }) {
  return <AppShell sections={sections} pathname="/payouts" title="Payouts" word="Finance"
    lede="Filtered to pending payouts this week." account={person} onSignOut={() => {}}
    renderLink={(_, props) => <a {...props} onClick={(e) => e.preventDefault()} />}>
    {signedOut && <Callout variant="warn" actions={<Button variant="secondary" size="sm" onClick={onSignIn}>Sign in</Button>}>
      You are signed out. Sign in to approve payouts. This screen stays as it is.
    </Callout>}
    <Card title="Pending payouts">
      <DataTable columns={columns} rows={rows} selectable={false} pager={false} dense zebra hover={false} />
    </Card>
    {children}
  </AppShell>;
}

// The modal views open over the app screen. Close leaves the screen signed out with a way back in.
export function useModal(initial: boolean) {
  const [open, setOpen] = useState(initial);
  return { open, close: () => setOpen(false), reopen: () => setOpen(true) };
}

export const mount = (node: ReactNode) => createRoot(document.getElementById('root')!).render(node);
