import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AccountWindow, type AccountSection } from './AccountWindow';
import { CheckList, Checkbox } from './Checkbox';
import { SelectField, TextField } from './Field';
import { KeyValueList } from './KeyValueList';
import { Button } from './primitives/Button';

const meta: Meta<typeof AccountWindow> = { title: 'React/AccountWindow', component: AccountWindow };
export default meta;

const sections: AccountSection[] = [
  { id: 'profile', label: 'Profile', icon: 'user', content: <>
    <TextField label="Full name" defaultValue="Dana Example" autoComplete="name" />
    <TextField label="Email" type="email" defaultValue="dana@example.com" autoComplete="email" />
    <SelectField label="Time zone" defaultValue="Europe/Berlin">
      <option>Europe/Berlin</option>
      <option>Europe/London</option>
      <option>America/New_York</option>
    </SelectField>
    <div><Button variant="primary">Update</Button></div>
  </> },
  { id: 'security', label: 'Security', icon: 'lock', content: <>
    <TextField label="Current password" type="password" autoComplete="current-password" />
    <TextField label="New password" type="password" autoComplete="new-password" hint="At least 12 characters." />
    <div><Button variant="primary">Change password</Button></div>
  </> },
  { id: 'notifications', label: 'Notifications', icon: 'bell', content: <>
    <Checkbox label="Weekly report" hint="A summary of the week, each Monday." defaultChecked />
    <Checkbox label="Payout sent" hint="An email when a payout leaves the account." defaultChecked />
    <Checkbox label="Product news" hint="New features, once a month." />
  </> },
  { id: 'billing', label: 'Billing', icon: 'card', content: <>
    <KeyValueList rows={[
      { label: 'Plan', value: 'Team' },
      { label: 'Billing email', value: 'billing@example.com' },
      { label: 'Payment method', value: 'Card ending 4242' },
    ]} />
    <div><Button variant="secondary">Change plan</Button></div>
  </> },
];

export const Playground: StoryObj<typeof AccountWindow> = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="primary" onClick={() => setOpen(true)}>Account</Button>
        <AccountWindow open={open} onClose={() => setOpen(false)} sections={sections}
          reader={{ name: 'Dana Example', email: 'dana@example.com', personKey: 'dana' }} />
      </>
    );
  },
};

// A section taller than a phone screen: the window stops at the screen height, and only
// the section scrolls under the reader and the tabs.
const groups: [string, string[]][] = [
  ['Reports', ['Daily summary', 'Weekly report', 'Monthly report', 'Export ready']],
  ['Team', ['Invitation accepted', 'Member joined', 'Access changed', 'Team announcement']],
  ['Account', ['New sign-in', 'Password changed', 'Email changed', 'Product news']],
  ['Billing', ['Invoice ready', 'Payment failed', 'Card expiring', 'Plan changed']],
];
const longSections = sections.map(s => s.id !== 'notifications' ? s : { ...s, content: <>
  {groups.map(([legend, labels]) => <CheckList key={legend} legend={legend}>
    {labels.map((l, i) => <Checkbox key={l} label={l} defaultChecked={i === 0} />)}
  </CheckList>)}
  <div><Button variant="primary">Update notifications</Button></div>
</> });

export const LongSection: StoryObj<typeof AccountWindow> = {
  name: 'Long section',
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="primary" onClick={() => setOpen(true)}>Account</Button>
        <AccountWindow open={open} onClose={() => setOpen(false)} sections={longSections} defaultSection="notifications"
          reader={{ name: 'Dana Example', email: 'dana@example.com', personKey: 'dana' }} />
      </>
    );
  },
};
