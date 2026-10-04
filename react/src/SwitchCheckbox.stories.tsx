import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';
import { Switch } from './Switch';
import { Card } from './primitives/Card';

const meta: Meta = {
  title: 'React/Switch & Checkbox',
  parameters: { layout: 'fullscreen' },
  decorators: [Story => <div style={{ padding: 'var(--space-10)', minHeight: '100vh' }}><Story /></div>],
};
export default meta;

// Gallery spacing follows the existing vanilla specimen; controls use shared CSS.
// The two live switches keep one name each: a name that moves with the state leaves
// a screen-reader user unable to tell a toggle from a move to another control.
//
// Each specimen is a card, as the vanilla gallery's has been since #556: a disabled
// box paints --disabled-surface, which IS the card, so on the page ground there was
// nothing left to find it by. The card carries the specimen's heading, so the
// hand-styled one is gone. react/src/field-ground.test.tsx holds them here.
const stack = { display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 } as const;
const choices = { ...stack, gap: 14 } as const;

function SwitchExamples() {
  const [first, setFirst] = useState(false);
  const [second, setSecond] = useState(true);
  const [email, setEmail] = useState(true);
  const [motion, setMotion] = useState(false);
  return <div style={stack}>
    <Card title="States">
      <div style={{ display: 'flex', gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
        <Switch label="First example" checked={first} onChange={event => setFirst(event.currentTarget.checked)} />
        <Switch label="Second example" checked={second} onChange={event => setSecond(event.currentTarget.checked)} />
        <Switch label="Off, disabled" disabled />
        <Switch label="On, disabled" defaultChecked disabled />
      </div>
    </Card>
    {/* Already a card before #568: a row list IS the card, so it keeps its own. */}
    <div className="ui-card" style={{ maxWidth: 460 }}>
      <div className="ui-card__row">
        <div><div className="lab">Email notifications</div><div className="hint">Weekly strategy digest.</div></div>
        <Switch label="Email notifications" checked={email} onChange={event => setEmail(event.currentTarget.checked)} />
      </div>
      <div className="ui-card__row">
        <div><div className="lab">Reduce motion</div><div className="hint">Turn off deck animations.</div></div>
        <Switch label="Reduce motion" checked={motion} onChange={event => setMotion(event.currentTarget.checked)} />
      </div>
    </div>
  </div>;
}

function CheckboxExamples() {
  const [scope, setScope] = useState('read');
  return <div style={stack}>
    <Card title="Checkbox">
      <div style={choices}>
        <Checkbox label="Read the strategy deck" defaultChecked />
        <Checkbox label="Connect an agent over MCP" />
        <Checkbox label="Grant read-only scope" defaultChecked />
      </div>
    </Card>
    {/* The card's own title carries the group's name, so the radios keep the
        labelled group they had — the heading moved onto the card, not away. */}
    <Card title={<span id="scope-heading">Radio group</span>}>
      <div style={choices} role="group" aria-labelledby="scope-heading">{[
        ['read', 'Read only'], ['comment', 'Read & comment'], ['full', 'Full access'],
      ].map(([value, label]) => <Checkbox key={value} label={label} type="radio" name="scope" value={value}
        checked={scope === value} onChange={event => setScope(event.currentTarget.value)} />)}</div>
    </Card>
  </div>;
}

export const Switches: StoryObj = { render: () => <SwitchExamples /> };
export const Checkboxes: StoryObj = { render: () => <CheckboxExamples /> };
export const Disabled: StoryObj = { render: () => <Card title="Unavailable"><div style={stack}>
  <Checkbox label="Read only, unavailable" disabled />
  <Checkbox label="Read only, selected and unavailable" defaultChecked disabled />
  <Checkbox label="Read access, unavailable" type="radio" name="disabled-scope" disabled />
  <Checkbox label="Full access, selected and unavailable" type="radio" name="disabled-scope" defaultChecked disabled />
</div></Card> };
