// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { BackLink } from '../../react/src/BackLink';
import { Breadcrumbs } from '../../react/src/Breadcrumbs';
import { SidebarNav } from '../../react/src/SidebarNav';
import { Button } from '../../react/src/primitives/Button';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_going-back.js';

const content = await loadGuideline('going-back.md', new URL('../../guidelines/going-back.md', import.meta.url));

// The specimens are the top of a page: the link, and the title under it. A <p>,
// not an <h1>: one guideline page must not carry a dozen h1s.
const Head = ({ above, title, action }: { above: ReactNode; title: string; action?: ReactNode }) =>
  <div className="gl-stage"><div className="gb-head">{above}
    <div className="gb-titlerow"><p className="gb-title">{title}</p>{action}</div></div></div>;
const Back = ({ label }: { label: string }) => <BackLink href="#" label={label} />;

// A rail folded to its icons, so a specimen can show which row is lit beside the
// page it belongs to at the width of one panel.
const RAIL = [
  { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: '#' },
  { id: 'invoices', icon: 'doc', label: 'Invoices', href: '#' },
  { id: 'payouts', icon: 'card', label: 'Payouts', href: '#' },
];
const WithRail = ({ id, active, above }: { id: string; active?: string; above: ReactNode }) =>
  <div className="gl-stage"><div className="gb-page">
    <SidebarNav items={RAIL} active={active} activeIs="section" collapsed aria-label={`${id} sidebar`} />
    <div className="gb-head">{above}<p className="gb-title">INV-1001</p></div>
  </div></div>;
const Send = () => <Button variant="primary" size="sm">Send</Button>;

const specimens = [
  { id: 'below-a-list', do: () => <Head above={<Back label="Invoices" />} title="Invoice INV-1001" />,
    dont: () => <Head above={<Back label="Dashboard" />} title="Invoices" /> },
  { id: 'name-it', do: () => <Head above={<Back label="Invoices" />} title="Invoice INV-1001" />,
    dont: () => <Head above={<Back label="Back" />} title="Invoice INV-1001" /> },
  { id: 'address-not-history' },
  { id: 'one-or-the-other', do: () => <Head above={<Back label="Invoices" />} title="Invoice INV-1001" />,
    dont: () => <Head title="Invoice INV-1001" above={<>
      <Breadcrumbs aria-label="Trail beside a back link"
        items={[{ label: 'Finance', href: '#' }, { label: 'Invoices', href: '#' }, { label: 'INV-1001' }]} />
      <Back label="Invoices" />
    </>} /> },
  { id: 'section-lit', do: () => <WithRail id="lit" active="invoices" above={<Back label="Invoices" />} />,
    dont: () => <WithRail id="unlit" above={<Back label="Invoice list" />} /> },
  { id: 'quiet', do: () => <Head above={<Back label="Invoices" />} title="Invoice INV-1001" action={<Send />} />,
    dont: () => <Head above={<Button variant="primary" size="sm" icon="arrowLeft">Back to invoices</Button>}
      title="Invoice INV-1001" action={<Send />} /> },
];

const meta: Meta = { title: 'Guidelines/Going back', parameters: { layout: 'fullscreen' } };
export default meta;

export const GoingBack: StoryObj = {
  name: 'Going back',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
