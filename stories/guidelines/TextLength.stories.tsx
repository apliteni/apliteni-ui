// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';
import { Card } from '../../react/src/primitives/Card';
import { StatBand } from '../../react/src/primitives/StatBand';
import { FileDrop } from '../../react/src/FileDrop';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';

const content = await loadGuideline('text-length.md', new URL('../../guidelines/text-length.md', import.meta.url));

// Each pair is one kit part with the caption's words in it, and nothing else changed.
const Stage = ({ children }: { children: ReactNode }) => <div className="gl-stage">{children}</div>;
const Save = ({ label }: { label: string }) => <Stage><div className="ui-toolbar">
  <Button variant="ghost">Cancel</Button><Button variant="primary">{label}</Button>
</div></Stage>;
const Revenue = ({ basis }: { basis: string }) => <Stage><StatBand variant="tiles" basis={basis}
  stats={[{ label: 'Revenue', value: '48,210' }, { label: 'Invoices', value: '312' }]} /></Stage>;
const Import = ({ sub }: { sub: string }) => <Stage><Card title="Import invoices" sub={sub}><FileDrop accept=".csv" /></Card></Stage>;
const Delete = ({ text, exportFirst }: { text: string; exportFirst: boolean }) => <Stage>
  <Callout variant="warn" actions={exportFirst ? <Button size="sm">Export reports</Button> : undefined}>{text}</Callout>
</Stage>;
const Export = ({ sub }: { sub: string }) => <Stage><Card title="Export payouts" sub={sub}>
  <div className="ui-toolbar"><Button icon="download">Export CSV</Button></div>
</Card></Stage>;

const specimens = [
  { id: 'short-controls', do: () => <Save label="Save invoice" />, dont: () => <Save label="Click here to save your invoice" /> },
  { id: 'useful-captions', do: () => <Revenue basis="March revenue in EUR, excluding refunds." />,
    dont: () => <Revenue basis="An overview of your revenue." /> },
  { id: 'useful-introductions', do: () => <Import sub="Upload a CSV with invoice numbers, dates and amounts." />,
    dont: () => <Import sub="Manage your invoices here." /> },
  { id: 'useful-callouts', do: () => <Delete text="Deleting this workspace deletes its reports. Export them first." exportFirst />,
    dont: () => <Delete text="Think carefully before proceeding." exportFirst={false} /> },
  { id: 'remove-filler', do: () => <Export sub="Exports include only filtered rows." />,
    dont: () => <Export sub="Export quickly and easily." /> },
];

const meta: Meta = { title: 'Guidelines/Text length', parameters: { layout: 'fullscreen' } };
export default meta;

export const TextLength: StoryObj = {
  name: 'Text length',
  render: () => <GuidelinePage content={content} specimens={specimens}
    css="<style>.gc-except { box-shadow: none; padding-left: 0; }</style>" />,
};
