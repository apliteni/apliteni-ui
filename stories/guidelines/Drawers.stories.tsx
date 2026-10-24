// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { DrawerPicture, GuidelinePage } from '../_guideline';
import { BackLink } from '../../react/src/BackLink';
import { Checkbox } from '../../react/src/Checkbox';
import { DrawerSection, KeyValueList, type KeyValueRow } from '../../react/src/KeyValueList';
import { Switch } from '../../react/src/Switch';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_drawer.js';

const content = await loadGuideline('drawer.md', new URL('../../guidelines/drawer.md', import.meta.url));

// One fabricated record, so a pair differs only in what its rule is about.
const PAYMENT = [['Amount', '€ 12,480.50'], ['Date', '31 Aug 2026'], ['Counterparty', 'Northwind Payments']];
const DETAIL = [...PAYMENT, ['Description', 'Card payout · batch 2291'], ['Source', 'Bank feed']];
const GROUPS = [
  { rows: PAYMENT },
  { title: 'How it is classified', rows: [['Category', '—'], ['Unit', 'Ledger']] },
  { title: 'Where it came from', rows: [['Statement', '#4102'], ['Reference', 'po_example_1047']] },
];
const rows = (pairs: string[][]): KeyValueRow[] => pairs.map(([label, value]) => ({ label, value }));

// A drawer is position: fixed, so each specimen is held inside a frame of its own.
const Frame = ({ title = 'Northwind Payments', footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) =>
  <div className="gd-frame"><DrawerPicture title={title} footer={footer}>{children}</DrawerPicture></div>;
const Group = ({ title, rows: pairs }: { title?: string; rows: string[][] }) =>
  <DrawerSection title={title}><KeyValueList rows={rows(pairs)} /></DrawerSection>;
const Ruled = ({ pairs }: { pairs: string[][] }) => <>{pairs.map(([k, v]) =>
  <div key={k} className="gd-ruled__row"><span>{k}</span><span>{v}</span></div>)}</>;

// One member's access, the work the drawer-or-page rule is about: the same roles and the
// same switch per unit, once on a page and once in a drawer.
const ROLES: [string, boolean][] = [['Viewer', true], ['Operator', true], ['Billing admin', false]];
const UNITS: [string, boolean][] = [['Ledger', true], ['Payouts', true], ['Agents', false], ['Keys', false], ['Reports', false]];
const Roles = () => <div className="gd-stack">{ROLES.map(([label, checked]) =>
  <Checkbox key={label} label={label} defaultChecked={checked} name="gd-role" />)}</div>;
const UnitSwitch = ({ label, on }: { label: string; on: boolean }) => <Switch defaultChecked={on} label={`${label} access`} />;

const PageDo = () => <div className="gd-frame gd-page"><Card>
  <div className="gd-page__head">
    <BackLink href="#" label="Members" />
    <h2 className="gd-page__title">Member access</h2>
    <p className="gd-page__intro">Roles apply to every unit, and per-unit access narrows them.</p>
  </div>
  <div className="gd-page__cols">
    <section><h3 className="gd-group__title">Roles</h3><Roles /></section>
    <section><h3 className="gd-group__title">Access per unit</h3><div className="gd-stack">{UNITS.map(([label, on]) =>
      <div key={label} className="gd-unit"><span>{label}</span><UnitSwitch label={label} on={on} /></div>)}</div></section>
  </div>
  <div className="gd-page__act"><Button variant="primary">Save access</Button></div>
</Card></div>;

const PageDont = () => <Frame title="Member access" footer={<Button variant="primary">Save access</Button>}>
  <DrawerSection title="Roles"><Roles /></DrawerSection>
  <DrawerSection title="Access per unit"><KeyValueList rows={UNITS.map(([label, on]) =>
    ({ label, value: <UnitSwitch label={label} on={on} /> }))} /></DrawerSection>
</Frame>;

const specimens = [
  { id: 'one-record' },
  { id: 'drawer-or-page', do: () => <PageDo />, dont: () => <PageDont /> },
  { id: 'no-cards', do: () => <Frame>{GROUPS.map((g, i) => <Group key={i} {...g} />)}</Frame>,
    dont: () => <Frame>{GROUPS.map((g, i) => <Card key={i}><Group {...g} /></Card>)}</Frame> },
  { id: 'three-lines' },
  { id: 'rows', do: () => <Frame><Group rows={DETAIL} /></Frame>, dont: () => <Frame><Ruled pairs={DETAIL} /></Frame> },
];

const meta: Meta = { title: 'Guidelines/Drawers', parameters: { layout: 'fullscreen' } };
export default meta;

export const Drawers: StoryObj = {
  name: 'Drawers',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
