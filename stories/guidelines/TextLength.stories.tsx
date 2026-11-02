// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { BackLink } from '../../react/src/BackLink';
import { Chart } from '../../react/src/Chart';
import { FileDrop } from '../../react/src/FileDrop';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';
import { Card } from '../../react/src/primitives/Card';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_text-length.js';

const content = await loadGuideline('text-length.md', new URL('../../guidelines/text-length.md', import.meta.url));

// Each pair differs only in the words its rule is about.
const Stage = ({ children }: { children: ReactNode }) => <div className="gl-stage">{children}</div>;

const Save = ({ label }: { label: string }) => <Stage><Card title="Invoice 2291"><div className="gt-acts">
  <Button variant="primary">{label}</Button><Button variant="ghost">Cancel</Button>
</div></Card></Stage>;

const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(label => ({ label, short: label.replace('Week ', 'W') }));
const Revenue = ({ caption }: { caption: string }) => <Stage><Card title="Revenue"><div className="gt-stack">
  <Chart variant="line" look="labels" title="Revenue by week, thousands" periods={WEEKS} format={n => `${n.toFixed(1)}k`}
    series={[{ id: 'revenue', name: 'Revenue', tone: 'accent', values: [11.2, 12.6, 11.9, 13.4] }]} />
  <p className="gt-text">{caption}</p>
</div></Card></Stage>;

const Import = ({ intro }: { intro: string }) => <Stage><div className="gt-stack">
  <div className="gt-head">
    <BackLink href="#" label="Invoices" />
    <h2 className="gt-title">Import invoices</h2>
    <p className="gt-text">{intro}</p>
  </div>
  <FileDrop label="Choose file" note="CSV, up to 10 MB" accept=".csv" />
</div></Stage>;

const Delete = ({ text }: { text: string }) => <Stage><div className="gt-stack">
  <Callout variant="warn">{text}</Callout>
  <div className="gt-acts"><Button variant="danger">Delete workspace</Button></div>
</div></Stage>;

const Export = ({ note }: { note: string }) => <Stage><Card title="Payouts"><div className="gt-stack">
  <p className="gt-text">{note}</p>
  <div className="gt-acts"><Button variant="secondary" icon="download">Export CSV</Button></div>
</div></Card></Stage>;

const specimens = [
  { id: 'short-controls', do: () => <Save label="Save invoice" />, dont: () => <Save label="Click here to save your invoice" /> },
  { id: 'useful-captions', do: () => <Revenue caption="March revenue in EUR, excluding refunds." />,
    dont: () => <Revenue caption="An overview of your revenue." /> },
  { id: 'useful-introductions', do: () => <Import intro="Upload a CSV with invoice numbers, dates and amounts." />,
    dont: () => <Import intro="Manage your invoices here." /> },
  { id: 'useful-callouts', do: () => <Delete text="Deleting this workspace deletes its reports. Export them first." />,
    dont: () => <Delete text="Think carefully before proceeding." /> },
  { id: 'remove-filler', do: () => <Export note="Exports include only filtered rows." />,
    dont: () => <Export note="Export quickly and easily." /> },
];

const meta: Meta = { title: 'Guidelines/Text length', parameters: { layout: 'fullscreen' } };
export default meta;

export const TextLength: StoryObj = {
  name: 'Text length',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
