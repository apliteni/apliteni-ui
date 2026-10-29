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

const page = { padding: 'var(--space-6)' } as const;
const cardGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, var(--panel-sm)), 1fr))', gap: 'var(--space-5)' } as const;

export const Variants: StoryObj = {
  render: () => <div style={page}>
    <div style={cardGrid}>
      <Card title="Default card" sub="A filled surface with a generous radius. Each theme draws a line. Light adds a faint shadow.">
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 'var(--panel-lg)' }}>
      <Card pad="sm" title="Small padding" sub="Trims the vertical padding and keeps the text edge." />
      <Card title="Default padding" sub="The padding every card has without a modifier." />
    </div>
  </div>,
};

export const LargePadding: StoryObj = {
  render: () => <div style={page}>
    <div style={{ maxWidth: 'var(--panel-lg)', margin: '0 auto' }}>
      <Card pad="lg" title="Large padding" sub="The centred landing card." />
    </div>
  </div>,
};

// `tools` puts controls at the end of the title row, as page tools sit beside a page title.
// A chart in a titled card puts its Chart and Table switch there itself.
export const TitleTools: StoryObj = {
  render: () => <div style={page}>
    <div style={{ maxWidth: 'var(--panel-lg)' }}>
      <Card
        title="Cash in and out"
        sub="Money in and money out for each month of this year."
        tools={<Button variant="ghost" size="sm" iconOnly icon="download" aria-label="Download PDF" title="Download PDF" />}
      />
    </div>
  </div>,
};

export const Interactive: StoryObj = {
  render: () => <div style={page}>
    <div style={cardGrid}>
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
    return <div style={page}><div style={{ maxWidth: 'var(--measure)' }}>
      <Card title="Appearance">
        <div className="ui-card__row ui-card__row--tight-choice">
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
