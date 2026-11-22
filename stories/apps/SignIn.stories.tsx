// The sign-in showcase in React. The title and id are the vanilla page's, so its links stay the same.
// One sign-in block serves the page and the session-ended modal over an app screen (#799).
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState, type ReactNode } from 'react';
import { brand } from '@apliteni/apliteni-ui';
import { AuthShell } from '../../react/src/AuthShell';
import { Modal } from '../../react/src/Modal';
import { SearchField } from '../../react/src/SearchField';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';
import { Badge } from '../../react/src/primitives/Badge';
import { Card } from '../../react/src/primitives/Card';
import { Skeleton, SkeletonTable } from '../../react/src/Loading';
import { FinanceShell } from './_finance-shell';
import { SignInBlock, type SignInArgs } from './_sign-in-block';
import '../../react/src/showcases/Auth.css';

const brandMark = <span dangerouslySetInnerHTML={{ __html: brand({ p: 'signin', word: 'apliteni-ui', href: '#' }) }} />;
const shell = (body: ReactNode) => <AuthShell brand={brandMark}>{body}</AuthShell>;


/** The sign-in page. A provider's answer stands in for the move to the app. */
function SignInPage({ sub, ...args }: SignInArgs & { sub: string }) {
  const [done, setDone] = useState(false);
  return shell(<>
    <h1 className="ui-auth__title">Sign in</h1>
    <p className="ui-auth__sub">{sub}</p>
    {done ? <Callout variant="success">You are signed in. The app opens next.</Callout>
      : <SignInBlock {...args} onDone={() => setDone(true)} />}
    <div className="ui-auth__foot">Only <b>apliteni.com</b> accounts can sign in.</div>
  </>);
}
const page = (sub: string, args: SignInArgs) => <SignInPage sub={sub} {...args} />;

// The app screen that the session ends on: payouts with a filter that the person set.
const PENDING: [string, string, string][] = [
  ['PO-1171', '4,200.00', '2026-11-09'],
  ['PO-1170', '860.00', '2026-11-08'],
  ['PO-1168', '1,975.50', '2026-11-06'],
];

type Session = 'active' | 'ended' | 'closed';

/**
 * Payouts while the session is active, when it ends, and after the modal closes. A change of the
 * `session` arg moves the same mounted screen, so its search text stays. A provider answer closes
 * the modal. Close keeps the screen and a way back in.
 */
function EndedScreen({ session, ...args }: SignInArgs & { session: Session }) {
  const [open, setOpen] = useState(session === 'ended');
  const [signedOut, setSignedOut] = useState(session === 'closed');
  const [search, setSearch] = useState('');
  useEffect(() => { setOpen(session === 'ended'); setSignedOut(session === 'closed'); }, [session]);
  const waitingForSignIn = open || signedOut;
  return <FinanceShell active="payouts" title="Payouts" sub={waitingForSignIn ? undefined : 'Filtered to pending, this week.'}>
    {waitingForSignIn && <Skeleton lines={1} width="12rem" />}
    {/* The callout stays under a reopened modal, so its Sign in button gets the focus back. */}
    {signedOut && <Callout variant="warn" actions={<Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Sign in</Button>}>
      You are signed out. Sign in to approve payouts. This screen stays as it is.
    </Callout>}
    {/* The ledger's filter bar stands on the page directly above it. why: guidelines/dense-tables.md */}
    <div className="ui-toolbar">
      {waitingForSignIn ? <Skeleton lines={1} /> :
        <SearchField ariaLabel="Search payouts" placeholder="Reference or payout ID" value={search}
          onChange={event => setSearch(event.currentTarget.value)} />}
    </div>
    <Card title="Pending payouts">
      {waitingForSignIn ? <SkeletonTable rows={PENDING.length} cols={4} /> :
        <table className="ui-table ui-table--dense">
        <thead><tr><th>Reference</th><th className="ui-table__num">Net (EUR)</th><th>Arrival</th><th>Status</th></tr></thead>
        <tbody>{PENDING.map(([ref, net, arrival]) => <tr key={ref}>
          <td>{ref}</td><td className="ui-table__num">{net}</td><td>{arrival}</td><td><Badge variant="pending">Pending</Badge></td>
        </tr>)}</tbody>
        </table>
      }
    </Card>
    <Modal open={open} title="Sign in again" size="sm" onClose={() => { setOpen(false); setSignedOut(true); }}>
      <div className="ui-stack sign-in-dialog">
        <p>Your session ended. Sign in to keep working.</p>
        <SignInBlock {...args} onDone={() => { setOpen(false); setSignedOut(false); }} />
      </div>
    </Modal>
  </FinanceShell>;
}

const meta: Meta<SignInArgs> = {
  title: 'Showcases/Sign In (OAuth2)', id: 'apps-sign-in-oauth2', parameters: { layout: 'fullscreen' },
  args: { google: true, email: true },
  argTypes: { passwordError: { control: 'text' } },
};
export default meta;
type Story = StoryObj<SignInArgs>;

export const Default: Story = { render: args => page('Access the Apliteni design system with your work account.', args) };

export const ProviderError: Story = { name: 'Provider error', args: { failed: true },
  render: args => page('Access the Apliteni design system with your work account.', args) };

export const Error: Story = { name: 'With error', args: { google: false, passwordError: 'Incorrect email or password.' },
  render: args => page('Access the Apliteni design system.', args) };

export const GoogleOnly: Story = { name: 'Google SSO only', args: { email: false },
  render: args => page('Sign in with your work Google account. There is no password.', args) };

// The session stories walk the seven flow states: in use, ended, provider busy, error, retry busy,
// back, and closed. Google refuses its first answer, so a press on it reaches the error.
type SessionStory = StoryObj<SignInArgs & { session: Session }>;
const session = { refuses: true, email: true };
const sessionArgTypes = { session: { control: 'inline-radio' as const, options: ['active', 'ended', 'closed'] } };

export const InUse: SessionStory = { name: 'Session in use', args: { ...session, session: 'active' }, argTypes: sessionArgTypes,
  render: args => <EndedScreen {...args} /> };

export const SessionEnded: SessionStory = { name: 'Session ended', args: { ...session, session: 'ended' }, argTypes: sessionArgTypes,
  render: args => <EndedScreen {...args} /> };

export const SessionEndedError: SessionStory = { name: 'Session ended, provider error', args: { failed: true, email: true, session: 'ended' },
  argTypes: sessionArgTypes, render: args => <EndedScreen {...args} /> };

export const SignedOut: SessionStory = { name: 'Signed out after close', args: { ...session, session: 'closed' }, argTypes: sessionArgTypes,
  render: args => <EndedScreen {...args} /> };
