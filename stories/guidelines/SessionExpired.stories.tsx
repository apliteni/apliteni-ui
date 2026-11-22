// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { ConfirmPicture, GuidelinePage, NoticePicture, noop } from '../_guideline';
import { SkeletonTable } from '../../react/src/Loading';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';
import { Card } from '../../react/src/primitives/Card';
import { SearchField } from '../../react/src/SearchField';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_session-expired.js';

const content = await loadGuideline('session-expired.md', new URL('../../guidelines/session-expired.md', import.meta.url));
const Stage = ({ children }: { children: ReactNode }) => <div className="gl-stage">{children}</div>;
const SignIn = ({ text = 'Your session ended. Sign in to keep working.' }: { text?: string }) =>
  <div className="gl-stage gl-stage--confirm"><ConfirmPicture title="Sign in again" body={text}
    confirmLabel="Continue with Google" cancelLabel="Close" confirmVariant="primary" /></div>;
const Payouts = ({ loading = false, search = 'PO-1170', signedOut = false }: { loading?: boolean; search?: string; signedOut?: boolean }) =>
  <Stage><div className="ui-card-stack">
    {signedOut && <Callout variant="warn" actions={<Button variant="secondary" size="sm" onClick={noop}>Sign in</Button>}>
      You are signed out. Sign in to keep working.</Callout>}
    <div className="ui-toolbar"><SearchField ariaLabel="Search payouts" defaultValue={search} /></div>
    <Card title="Payouts">{loading ? <SkeletonTable rows={3} cols={4} /> : <p>Pending payouts</p>}</Card>
  </div></Stage>;

const specimens = [
  { id: 'sign-in-same-page', do: () => <SignIn />,
    dont: () => <Stage><Card title="Sign in"><Button variant="primary">Continue with Google</Button></Card></Stage> },
  { id: 'keep-work', do: () => <Payouts loading search="PO-1170" />,
    dont: () => <Payouts loading search="" /> },
  { id: 'say-session-ended', do: () => <SignIn />,
    dont: () => <SignIn text="Sign in required." /> },
  { id: 'skeleton-behind-dialog', do: () => <Payouts loading />,
    dont: () => <Stage><Card title="Payouts"><p>Nothing to show.</p></Card></Stage> },
  { id: 'lasting-sign-in', do: () => <Payouts loading signedOut />,
    dont: () => <Stage><NoticePicture tone="warn" title="You are signed out" /></Stage> },
];

const meta: Meta = { title: 'Guidelines/Session expired', parameters: { layout: 'fullscreen' } };
export default meta;

export const SessionExpired: StoryObj = {
  name: 'Session expired',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
