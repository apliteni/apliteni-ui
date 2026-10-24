// The preferences showcase in React, under the vanilla page's title and id.
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { ACCOUNT_NAV } from '@apliteni/apliteni-ui';
import { AppShell } from '../../react/src/AppShell';
import { AccentPicker } from '../../react/src/AccentPicker';
import { Segmented } from '../../react/src/Segmented';
import { Switch } from '../../react/src/Switch';
import { Card } from '../../react/src/primitives/Card';

const meta: Meta = { title: 'Showcases/Preferences', id: 'apps-preferences', parameters: { layout: 'fullscreen' } };
export default meta;

const noop = () => {};
type NavItem = { id: string; icon: string; label: string };
// Overview belongs to this demo, not to the kit's default nav: see Access.
const NAV: NavItem[] = [{ id: 'overview', icon: 'chart', label: 'Overview' }, ...(ACCOUNT_NAV as NavItem[])];
// AppShell lights the section whose path matches, so each gets one; the links stay inert.
const sections = NAV.map(item => ({ href: `/${item.id}`, label: item.label, icon: item.icon }));

// Theme and Language are settings, not navigation, so they stay a segmented strip,
// which says "pressed", and each one carries its own name.
const Seg = ({ label, options }: { label: string; options: string[] }) =>
  <Segmented label={label} options={options.map(o => ({ label: o, value: o }))} value={options[0]} onChange={noop} />;
const Row = ({ lab, hint, tight = false, children }: { lab: string; hint: string; tight?: boolean; children: ReactNode }) =>
  <div className={`ui-card__row${tight ? ' ui-card__row--tight-choice' : ''}`}><div><div className="lab">{lab}</div><div className="hint">{hint}</div></div>{children}</div>;

export const Default: StoryObj = {
  render: () => <AppShell layout="rail" sections={sections} pathname="/prefs" title="Preferences"
    renderLink={(_, props) => <a {...props} href="#" />}
    lede="How the kit looks and speaks to you. Saved to this browser."
    crumbs={[{ label: 'Account', href: '#' }, { label: 'Preferences' }]}
    account={{ name: 'Ada Lovelace', email: 'ada@apliteni.com' }} onSignOut={noop}>
    <Card title="Appearance">
      <Row lab="Theme" hint="Match the dark palette or a light workspace." tight><Seg label="Theme" options={['Dark', 'Light', 'System']} /></Row>
      <Row lab="Accent" hint="Pick a sub-theme — four ship with the kit."><AccentPicker value="default" onChange={noop} /></Row>
      <Row lab="Language" hint="Interface language for the portal."><Seg label="Language" options={['English', 'Русский']} /></Row>
      <Row lab="Reduce motion" hint="Turn off animated transitions."><Switch label="Reduce motion" /></Row>
    </Card>
    <Card title="Notifications">
      <Row lab="Weekly digest" hint="A summary when things change."><Switch defaultChecked label="Weekly digest" /></Row>
      <Row lab="Agent activity" hint="Email me when an agent first connects."><Switch defaultChecked label="Agent activity" /></Row>
      <Row lab="Product news" hint="Occasional updates about new components."><Switch label="Product news" /></Row>
    </Card>
  </AppShell>,
};
