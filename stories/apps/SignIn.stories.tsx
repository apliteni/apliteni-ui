// The sign-in showcase in React. The title and id are the vanilla page's, so its links stay the same.
// One sign-in block serves the page and the session-ended modal over an app screen (#799).
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { brand } from '@apliteni/apliteni-ui';
import { AuthShell } from '../../react/src/AuthShell';
import { TextField } from '../../react/src/Field';
import { Modal } from '../../react/src/Modal';
import { SearchField } from '../../react/src/SearchField';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';
import { Badge } from '../../react/src/primitives/Badge';
import { Card } from '../../react/src/primitives/Card';
import { FinanceShell } from './_finance-shell';
import '../../react/src/showcases/Auth.css';

const brandMark = <span dangerouslySetInnerHTML={{ __html: brand({ p: 'signin', word: 'apliteni-ui', href: '#' }) }} />;
const shell = (body: ReactNode) => <AuthShell brand={brandMark}>{body}</AuthShell>;

// Vendor artwork for the two brand marks. GitHub uses the kit glyph.
const googleMark = <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.4 45 30.9 45 24.5z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.2H4.3v5.7C7.9 41.1 15.3 46 24 46z"/><path fill="#FBBC05" d="M11.6 27.9c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.7H4.3C2.8 17.3 2 20.6 2 24s.8 6.7 2.3 9.6l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.3 2 7.9 6.9 4.3 14.4l7.3 5.7C13.3 14.7 18.2 10.8 24 10.8z"/></svg>;
const microsoftMark = <svg width="17" height="17" viewBox="0 0 21 21" aria-hidden="true"><path fill="#F25022" d="M0 0h10v10H0z"/><path fill="#7FBA00" d="M11 0h10v10H11z"/><path fill="#00A4EF" d="M0 11h10v10H0z"/><path fill="#FFB900" d="M11 11h10v10H11z"/></svg>;

type ProviderId = 'google' | 'microsoft' | 'github';
const PROVIDERS: Record<ProviderId, { name: string; mark?: ReactNode; icon?: string }> = {
  google: { name: 'Google', mark: googleMark },
  microsoft: { name: 'Microsoft', mark: microsoftMark },
  github: { name: 'GitHub', icon: 'github' },
};

type SignInArgs = {
  /** The providers, in order. */
  providers: ProviderId[];
  /** The provider used last time: the one filled button. */
  lastUsed?: ProviderId;
  /** An email and password form below "or". */
  email: boolean;
  /** The provider that did not finish: a danger callout with a retry above the buttons. */
  failed?: ProviderId;
  /** The provider whose first answer is a failure, so a press reaches the error. */
  refuses?: ProviderId;
  passwordError?: string;
};

// A stand-in for the provider's round trip, long enough to see the busy button.
const ANSWER_MS = 1200;

/** The sign-in block that the page and the modal share. A press waits for a simulated answer, then calls `onDone`. */
function SignInBlock({ providers, lastUsed, email, failed, refuses, passwordError, onDone }: SignInArgs & { onDone?: () => void }) {
  const [error, setError] = useState(failed);
  const [busy, setBusy] = useState<{ id: ProviderId; retry: boolean }>();
  const refused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => setError(failed), [failed]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function answer(id: ProviderId, retry = false) {
    if (busy) return;
    setBusy({ id, retry });
    timer.current = setTimeout(() => {
      setBusy(undefined);
      if (id === refuses && !refused.current) { refused.current = true; setError(id); return; }
      setError(undefined);
      onDone?.();
    }, ANSWER_MS);
  }

  // The last-used provider is the one main action, so the form's button steps down beside it.
  // A last-used provider that this product does not offer gets no place and no fill.
  const last = lastUsed && providers.includes(lastUsed) ? lastUsed : undefined;
  const order = last ? [last, ...providers.filter(id => id !== last)] : providers;
  const other = providers.length > 1 || email;
  return <div className="ui-stack">
    {error && <Callout variant="danger" actions={<Button variant="secondary" size="sm" icon="refresh"
      busy={busy?.retry} completionMessage="" onClick={() => answer(error, true)}>Try {PROVIDERS[error].name} again</Button>}>
      {PROVIDERS[error].name} did not finish the sign-in. Nothing changed. {other ? 'Try again, or use another way to sign in.' : 'Try again.'}
    </Callout>}
    {order.map(id => <Button key={id} variant={id === last ? 'primary' : 'secondary'} size="lg" block
      busy={busy?.id === id && !busy.retry} completionMessage="" leading={PROVIDERS[id].mark} icon={PROVIDERS[id].icon}
      onClick={() => answer(id)}>Continue with {PROVIDERS[id].name}</Button>)}
    {email && <>
      {providers.length > 0 && <div className="ui-divider">or</div>}
      <form className="auth-form" onSubmit={event => { event.preventDefault(); onDone?.(); }}>
        <TextField label="Work email" type="email" autoComplete="username" placeholder="you@apliteni.com" defaultValue={passwordError ? 'ada@apliteni.com' : undefined} icon="mail" required />
        <TextField label="Password" type="password" autoComplete="current-password" placeholder="••••••••" defaultValue={passwordError ? 'wrong' : undefined} icon="lock" required error={passwordError} />
        <Button variant={last ? 'secondary' : 'primary'} size="lg" block type="submit">Sign in</Button>
      </form>
    </>}
  </div>;
}

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
  useEffect(() => { setOpen(session === 'ended'); setSignedOut(session === 'closed'); }, [session]);
  return <FinanceShell active="payouts" title="Payouts" sub="Filtered to pending, this week.">
    {/* The callout stays under a reopened modal, so its Sign in button gets the focus back. */}
    {signedOut && <Callout variant="warn" actions={<Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Sign in</Button>}>
      You are signed out. Sign in to approve payouts. This screen stays as it is.
    </Callout>}
    {/* The ledger's filter bar sits on a card directly above it. why: guidelines/dense-tables.md */}
    <Card pad="sm"><div className="ui-toolbar">
      <SearchField ariaLabel="Search payouts" placeholder="Reference or payout ID" />
    </div></Card>
    <Card title="Pending payouts">
      <table className="ui-table ui-table--dense">
        <thead><tr><th>Reference</th><th className="ui-table__num">Net (EUR)</th><th>Arrival</th><th>Status</th></tr></thead>
        <tbody>{PENDING.map(([ref, net, arrival]) => <tr key={ref}>
          <td>{ref}</td><td className="ui-table__num">{net}</td><td>{arrival}</td><td><Badge variant="pending">Pending</Badge></td>
        </tr>)}</tbody>
      </table>
    </Card>
    <Modal open={open} title="Sign in again" onClose={() => { setOpen(false); setSignedOut(true); }}>
      <div className="ui-stack">
        <p>Your session ended. Sign in to keep working. This screen and its filter stay as they are.</p>
        <SignInBlock {...args} onDone={() => { setOpen(false); setSignedOut(false); }} />
      </div>
    </Modal>
  </FinanceShell>;
}

const PROVIDER_IDS = Object.keys(PROVIDERS);
const meta: Meta<SignInArgs> = {
  title: 'Showcases/Sign In (OAuth2)', id: 'apps-sign-in-oauth2', parameters: { layout: 'fullscreen' },
  args: { providers: ['google', 'microsoft', 'github'], email: false },
  argTypes: {
    providers: { control: 'check', options: PROVIDER_IDS },
    lastUsed: { control: 'select', options: ['none', ...PROVIDER_IDS], mapping: { none: undefined } },
    failed: { control: 'select', options: ['none', ...PROVIDER_IDS], mapping: { none: undefined } },
    refuses: { control: 'select', options: ['none', ...PROVIDER_IDS], mapping: { none: undefined } },
    passwordError: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<SignInArgs>;

export const Default: Story = { render: args => page('Access the Apliteni design system with your work account.', args) };

export const ProviderError: Story = { name: 'Provider error', args: { failed: 'google' },
  render: args => page('Access the Apliteni design system with your work account.', args) };

export const LastUsed: Story = { name: 'Last used provider', args: { lastUsed: 'google', email: true },
  render: args => page('You signed in with Google last time.', args) };

export const Error: Story = { name: 'With error', args: { providers: [], email: true, passwordError: 'Incorrect email or password.' },
  render: args => page('Access the Apliteni design system.', args) };

export const GoogleOnly: Story = { name: 'Google SSO only', args: { providers: ['google'] },
  render: args => page('Sign in with your work Google account. There is no password.', args) };

// The session stories walk the seven flow states: in use, ended, provider busy, error, retry busy,
// back, and closed. Google refuses its first answer, so a press on it reaches the error.
type SessionStory = StoryObj<SignInArgs & { session: Session }>;
const session = { refuses: 'google' as const };
const sessionArgTypes = { session: { control: 'inline-radio' as const, options: ['active', 'ended', 'closed'] } };

export const InUse: SessionStory = { name: 'Session in use', args: { ...session, session: 'active' }, argTypes: sessionArgTypes,
  render: args => <EndedScreen {...args} /> };

export const SessionEnded: SessionStory = { name: 'Session ended', args: { ...session, session: 'ended' }, argTypes: sessionArgTypes,
  render: args => <EndedScreen {...args} /> };

export const SessionEndedError: SessionStory = { name: 'Session ended, provider error', args: { failed: 'google', session: 'ended' },
  argTypes: sessionArgTypes, render: args => <EndedScreen {...args} /> };

export const SignedOut: SessionStory = { name: 'Signed out after close', args: { ...session, session: 'closed' }, argTypes: sessionArgTypes,
  render: args => <EndedScreen {...args} /> };
