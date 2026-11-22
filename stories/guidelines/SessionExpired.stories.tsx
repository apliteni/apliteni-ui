// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { ConfirmPicture, GuidelinePage, NoticePicture, noop } from '../_guideline';
import { Skeleton, SkeletonTable } from '../../react/src/Loading';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';
import { Card } from '../../react/src/primitives/Card';
import { SearchField } from '../../react/src/SearchField';
import { FinanceShell } from '../apps/_finance-shell';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_session-expired.js';

const content = await loadGuideline('session-expired.md', new URL('../../guidelines/session-expired.md', import.meta.url));
const Stage = ({ children }: { children: ReactNode }) => <div className="gl-stage">{children}</div>;
const SignIn = ({ text = 'Your session ended. Sign in to keep working.' }: { text?: string }) =>
  <div className="gl-stage gl-stage--confirm"><ConfirmPicture title="Sign in again" body={text}
    confirmLabel="Continue with Google" confirmVariant="primary" /></div>;
const Payouts = ({ loading = false, search = 'PO-1170', filter = true, signedOut = false, dialog = false }: {
  loading?: boolean; search?: string; filter?: boolean; signedOut?: boolean; dialog?: boolean;
}) =>
  <Stage><FinanceShell active="payouts" title="Payouts" sub={loading || !filter ? undefined : 'Filtered to pending, this week.'}>
    <div className="ui-card-stack">
    {loading && <Skeleton lines={1} width="12rem" />}
    {signedOut && <Callout variant="warn" actions={<Button variant="secondary" size="sm" onClick={noop}>Sign in</Button>}>
      You are signed out. Sign in to keep working.</Callout>}
    <div className="ui-toolbar">{loading ? <Skeleton lines={1} /> : <SearchField ariaLabel="Search payouts" defaultValue={search} />}</div>
    <Card title="Pending payouts">{loading ? <SkeletonTable rows={3} cols={4} /> : <table className="ui-table ui-table--dense"><tbody>
      <tr><td>PO-1170</td><td>860.00 EUR</td><td>Pending</td></tr>
      <tr><td>PO-1168</td><td>1,975.50 EUR</td><td>Pending</td></tr>
    </tbody></table>}</Card>
    {dialog && <SignIn />}
  </div></FinanceShell></Stage>;

const specimens = [
  { id: 'sign-in-same-page', do: () => <Payouts loading dialog />,
    dont: () => <Stage><Card title="Sign in"><Button variant="primary">Continue with Google</Button></Card></Stage> },
  { id: 'keep-work', do: () => <Payouts search="PO-1170" />,
    dont: () => <Payouts search="" filter={false} /> },
  { id: 'say-session-ended', do: () => <SignIn />,
    dont: () => <SignIn text="Sign in required." /> },
  { id: 'skeleton-behind-dialog', do: () => <Payouts loading dialog />,
    dont: () => <SignIn /> },
  { id: 'lasting-sign-in', do: () => <Payouts loading signedOut />,
    dont: () => <Stage><NoticePicture tone="warn" title="You are signed out" /></Stage> },
];

const meta: Meta = { title: 'Guidelines/Session expired', parameters: { layout: 'fullscreen' } };
export default meta;

export const SessionExpired: StoryObj = {
  name: 'Session expired',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
