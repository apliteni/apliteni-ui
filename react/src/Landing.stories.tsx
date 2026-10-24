import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TopBar, ViewSwitch, VersionSwitcher, type Version } from './TopBar';
import { Footer } from './Footer';
import { Card } from './primitives/Card';
import { Button } from './primitives/Button';
import { Badge } from './primitives/Badge';
import { Icon } from './primitives/Icon';
import { Segmented } from './Segmented';
import { ThemeToggle } from './ThemeToggle';

const meta: Meta = {
  title: 'Showcases/Landing Page',
  id: 'apps-landing-page',
  parameters: { layout: 'fullscreen' },
};
export default meta;

const VERSIONS: Version[] = [
  { value: 'phoenix.2026.002', label: 'phoenix.2026.002', badge: 'live' },
  { value: 'phoenix.2026.001', label: 'phoenix.2026.001', badge: 'archive' },
];
const VIEWS = [{ id: 'deck', label: 'Deck' }, { id: 'text', label: 'Text' }];

const features = [
  { icon: 'plug', tone: 'ui-badge--info', title: 'Agent-ready', body: 'Connect any agent over MCP with a scoped, revocable token. Read the strategy programmatically.' },
  { icon: 'shield', tone: 'ui-badge--danger', title: 'Access you control', body: 'Consent screens, per-agent tokens, one-click revoke. You always see who can read what.' },
  { icon: 'compass', tone: '', title: 'Clear direction', body: 'Product units, superconnectors, governance — the whole model in one navigable place.' },
  { icon: 'layers', tone: 'ui-badge--warn', title: 'Deck or text', body: 'The same content as an animated deck or a calm long-form. Switch anytime.' },
  { icon: 'globe', tone: 'ui-badge--success', title: 'English & Russian', body: 'The whole surface localises, so the team reads it in the language they think in.' },
  { icon: 'bolt', tone: '', title: 'Always current', body: 'Versioned cleanly — the live version is at the root, archives keep their own path.' },
] as const;

function FeatureDemo({ index }: { index: number }) {
  const [choice, setChoice] = useState(0);
  if (index === 0) return <code className="ui-code">mcp connect --scope read</code>;
  if (index === 1) return <><Badge variant="live">Read-only</Badge><Button variant="danger" size="sm">Revoke</Button></>;
  if (index === 2) return <><Badge variant="info">Units</Badge><Badge variant="info">Connectors</Badge><Badge variant="info">Governance</Badge></>;
  if (index === 3) return <Segmented label="View" size="sm" options={[{ label: 'Deck', value: 'deck' }, { label: 'Text', value: 'text' }]}
    value={choice === 0 ? 'deck' : 'text'} onChange={(value) => setChoice(value === 'deck' ? 0 : 1)} />;
  if (index === 4) return <Segmented label="Language" size="sm" options={[{ label: 'EN', value: 'en' }, { label: 'RU', value: 'ru' }]}
    value={choice === 0 ? 'en' : 'ru'} onChange={(value) => setChoice(value === 'en' ? 0 : 1)} />;
  return <><Badge variant="soon">phoenix.2026.002</Badge><Badge variant="live">Live</Badge></>;
}

function FeatureCard({ item, index }: { item: typeof features[number]; index: number }) {
  return <Card className="landing-cell">
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <span className={`ui-card__icon ${item.tone}`} aria-hidden="true"><Icon name={item.icon} /></span>
    </div>
    <h3 className="ui-card__title">{item.title}</h3>
    <p className="ui-card__sub">{item.body}</p>
    <div className="landing-demo"><FeatureDemo index={index} /></div>
  </Card>;
}

function LandingPage() {
  const [version, setVersion] = useState(VERSIONS[0].value);
  const [view, setView] = useState('deck');
  return <>
    <style>{`
      .landing-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:var(--space-4); }
      .landing-grid > :first-child, .landing-grid > :last-child { grid-column:span 2; }
      .landing-grid > :nth-child(2) { grid-row:span 2; }
      .landing-cell { display:flex; flex-direction:column; }
      .landing-demo { margin-top:auto; display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap; }
      @media (max-width:720px) {
        .landing-grid { grid-template-columns:1fr; }
        .landing-grid > :first-child, .landing-grid > :last-child { grid-column:auto; }
        .landing-grid > :nth-child(2) { grid-row:auto; }
      }
    `}</style>
    <TopBar word="Strategy" brandHref="#top"
      view={<ViewSwitch items={VIEWS} active={view} renderLink={(item, props) =>
        <a {...props} onClick={(event) => { event.preventDefault(); setView(item.id); }} />} />}
      version={<VersionSwitcher versions={VERSIONS} value={version} onChange={setVersion} />}
      theme={<ThemeToggle />} />
    <main id="top">
      <section className="ui-hero">
        <h1 className="ui-hero__title">Apliteni&apos;s UI-kit</h1>
        <p className="ui-hero__sub">The Apliteni strategy — as an animated deck, a readable long-form, and a live surface your agents can read over MCP. Always one source of truth.</p>
        <div className="ui-hero__cta">
          <Button variant="primary" size="lg" icon="layers">Open the deck</Button>
          <Button variant="secondary" size="lg" iconRight="arrowRight">Read the text version</Button>
        </div>
      </section>
      <section id="features" style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 26px 90px' }}>
        <div className="ui-section-head" style={{ marginBottom: 44 }}>
          <h2>Built for people and agents alike</h2>
          <p>Everything below is composed from the same apliteni-ui components.</p>
        </div>
        <div className="landing-grid">
          {features.map((item, index) => <FeatureCard key={item.title} item={item} index={index} />)}
        </div>
      </section>
      <section id="agents" style={{ maxWidth: 900, margin: '0 auto 100px', paddingInline: 26 }}>
        <Card variant="accent" pad="lg">
          <div className="ui-section-head" style={{ marginBottom: 0, maxWidth: 'none' }}>
            <h2>Give your agent the strategy</h2>
            <p>One command connects an agent over MCP. Scoped to read-only, revocable anytime from your account.</p>
            <div style={{ marginTop: 'var(--space-5)' }}>
              <div className="ui-hero__cta">
                <Button variant="primary" size="lg" icon="plug">Connect an agent</Button>
                <Button variant="ghost" size="lg">View the docs</Button>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </main>
    <Footer variant="full" word="Strategy" brandHref="#top"
      tagline="One strategy — an animated deck, a readable long-form, and a live surface your agents can read over MCP."
      columns={[
        { title: 'Strategy', links: [
          { label: 'Deck', href: '#deck' }, { label: 'Text version', href: '#text' }, { label: 'Agents', href: '#agents' },
        ] },
        { title: 'Developers', links: [
          { label: 'Connect over MCP', href: '#mcp' },
          { label: 'GitHub', href: 'https://github.com/apliteni/apliteni-ui', target: '_blank' },
        ] },
      ]}
      social={[
        { label: 'GitHub', href: 'https://github.com/apliteni/apliteni-ui', icon: 'github' },
        { label: 'Email', href: 'mailto:hi@apliteni.com', icon: 'mail' },
      ]}
      legal="© Apliteni Strategy" legalLinks={[{ label: 'Privacy', href: '#privacy' }, { label: 'Terms', href: '#terms' }]} />
  </>;
}

export const Default: StoryObj = { render: () => <LandingPage /> };
