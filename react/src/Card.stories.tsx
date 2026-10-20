import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Card } from './primitives/Card';
import { Button } from './primitives/Button';
import { Badge } from './primitives/Badge';
import { Pill } from './primitives/Pill';
import { Segmented } from './Segmented';
import { Switch } from './Switch';

const meta: Meta = {
  title: 'React/Card',
  parameters: { layout: 'fullscreen' },
};
export default meta;

const page = { padding: 40 } as const;
const interactiveGrid = { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 22 } as const;

export const Variants: StoryObj = {
  render: () => <div style={page}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 22 }}>
      <Card title="Default card" sub="A filled surface with a generous radius. Dark draws an edge, and light casts a soft shadow.">
        <Button variant="secondary" size="sm">Action</Button>
      </Card>
      <Card variant="accent" title="Accent card" icon="sparkle" sub="Tinted with the purple accent, for the highlighted plan or upsell.">
        <Button variant="primary" size="sm">Upgrade</Button>
      </Card>
      <Card variant="live" title={<>Live surface <Badge variant="live">Live</Badge></>} sub="Green-tinted, for an active/confirmed state such as a connected agent.">
        <Pill variant="live">Connected</Pill>
      </Card>
      <Card title="With icon chip" icon="shield" sub="A leading icon chip anchors the header for feature and settings cards." />
    </div>
  </div>,
};

export const Padding: StoryObj = {
  render: () => <div style={page}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 560 }}>
      <Card pad="sm" title="Small padding" sub="Trims the vertical padding and keeps the text edge." />
      <Card title="Default padding" sub="The padding every card has without a modifier." />
    </div>
  </div>,
};

export const LargePadding: StoryObj = {
  render: () => <div style={page}>
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <Card pad="lg" title="Large padding" sub="The centred landing card." />
    </div>
  </div>,
};

export const Interactive: StoryObj = {
  render: () => <div style={page}>
    <div style={interactiveGrid}>
      <Card href="#" icon="layers" title="Deck" sub="The animated strategy deck." />
      <Card href="#" icon="compass" title="Text" sub="The readable long-form version." />
      <Card href="#" icon="plug" title="Agents" sub="Connect an agent over MCP." />
    </div>
  </div>,
};

export const SettingRows: StoryObj = {
  render: function Render() {
    const [theme, setTheme] = useState('dark');
    const [lang, setLang] = useState('en');
    const [motion, setMotion] = useState(false);
    return <div style={page}><div style={{ maxWidth: 560 }}>
      <Card title="Appearance">
        <div className="ui-card__row">
          <div><div className="lab">Theme</div><div className="hint">Match the deck's dark palette or a light workspace.</div></div>
          <Segmented label="Theme" value={theme} onChange={setTheme} options={[{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }, { label: 'System', value: 'system' }]} />
        </div>
        <div className="ui-card__row">
          <div><div className="lab">Language</div><div className="hint">Interface language for the portal.</div></div>
          <Segmented label="Language" value={lang} onChange={setLang} options={[{ label: 'EN', value: 'en' }, { label: 'RU', value: 'ru' }]} />
        </div>
        <div className="ui-card__row">
          <div><div className="lab">Reduce motion</div><div className="hint">Disable the animated deck transitions.</div></div>
          <Switch label="Reduce motion" checked={motion} onChange={event => setMotion(event.currentTarget.checked)} />
        </div>
      </Card>
    </div></div>;
  },
};
