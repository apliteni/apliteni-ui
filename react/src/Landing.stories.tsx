import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
import { Card } from './primitives/Card';
import { Button } from './primitives/Button';
import { ThemeToggle } from './ThemeToggle';
import { AccentPicker, type Accent } from './AccentPicker';

const meta: Meta = {
  title: 'Showcases/Landing Page',
  id: 'apps-landing-page',
  parameters: { layout: 'fullscreen' },
};
export default meta;

const features = [
  { icon: 'compass', title: 'Clear direction', body: 'Product units, connectors, and governance in one place.' },
  { icon: 'plug', title: 'Agent-ready', body: 'Connect an agent over MCP with a scoped, revocable grant.' },
  { icon: 'shield', title: 'Access you control', body: 'See who can read the strategy and revoke access.' },
  { icon: 'layers', title: 'Deck or text', body: 'Read the same strategy as a deck or as long-form text.' },
  { icon: 'globe', title: 'English and Russian', body: 'Read the strategy in either language.' },
  { icon: 'bolt', title: 'Always current', body: 'The current strategy and its archived versions have separate paths.' },
] as const;

function FooterSwitches() {
  const [accent, setAccent] = useState<Accent>('default');
  useEffect(() => {
    const root = document.documentElement;
    const prior = root.getAttribute('data-accent');
    root.removeAttribute('data-accent');
    return () => {
      if (prior === null) root.removeAttribute('data-accent');
      else root.setAttribute('data-accent', prior);
    };
  }, []);
  const chooseAccent = (value: Accent) => {
    setAccent(value);
    if (value === 'default') document.documentElement.removeAttribute('data-accent');
    else document.documentElement.setAttribute('data-accent', value);
  };
  return <><AccentPicker value={accent} onChange={chooseAccent} /><ThemeToggle /></>;
}

function LandingPage() {
  return <>
    <style>{`
      .landing-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:var(--space-4);
        grid-template-areas:"agent agent access" "clear deck access" "lang current current"; }
      .landing-grid > :nth-child(1) { grid-area:clear; }
      .landing-grid > :nth-child(2) { grid-area:agent; }
      .landing-grid > :nth-child(3) { grid-area:access; }
      .landing-grid > :nth-child(4) { grid-area:deck; }
      .landing-grid > :nth-child(5) { grid-area:lang; }
      .landing-grid > :nth-child(6) { grid-area:current; }
      @media (max-width:820px) {
        .landing-grid { grid-template-columns:1fr; grid-template-areas:none; }
        .landing-grid > :nth-child(n) { grid-area:auto; }
      }
    `}</style>
    <TopBar word="Strategy" brandHref="#top" />
    <main id="top">
      <section className="ui-hero">
        <h1 className="ui-hero__title">One strategy, many agents</h1>
        <p className="ui-hero__sub">The strategy as a deck, readable text, and a source your agents can read over MCP.</p>
        <div className="ui-hero__cta">
          <Button href="#features" variant="primary" size="lg" icon="layers">Explore the strategy</Button>
          <Button href="#agents" variant="secondary" size="lg" iconRight="arrowRight">Connect an agent</Button>
        </div>
      </section>
      <section id="features" style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: 'var(--space-5) var(--space-6) var(--space-10)' }}>
        <div className="ui-section-head">
          <h2>Built for people and agents</h2>
        </div>
        <div className="landing-grid">
          {features.map((item) => <Card key={item.title} level={3} icon={item.icon} title={item.title}>
            <p>{item.body}</p>
          </Card>)}
        </div>
      </section>
      <section id="agents" style={{ maxWidth: '900px', margin: '0 auto var(--space-10)', paddingInline: 'var(--space-6)' }}>
        <Card variant="accent" pad="lg">
          <div className="ui-section-head" style={{ marginBottom: 0, maxWidth: 'none' }}>
            <h2>Give your agent the strategy</h2>
            <p>Connect over MCP with a read-only grant. You can revoke it from your account.</p>
            <div style={{ marginTop: 'var(--space-5)' }}>
              <div className="ui-hero__cta">
                <Button href="/connect" variant="primary" size="lg" icon="plug">Connect an agent</Button>
                <Button href="/docs" variant="ghost" size="lg">View the docs</Button>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </main>
    <Footer variant="full" word="Strategy" brandHref="#top"
      columns={[
        { title: 'Strategy', links: [
          { label: 'Features', href: '#features' }, { label: 'Agents', href: '#agents' },
        ] },
        { title: 'Developers', links: [
          { label: 'Docs', href: '/docs' },
          { label: 'GitHub', href: 'https://github.com/apliteni/apliteni-ui', target: '_blank' },
        ] },
      ]}
      legal="© Apliteni Strategy" legalLinks={[{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }]}
      switcher={<FooterSwitches />} />
  </>;
}

export const Default: StoryObj = { render: () => <LandingPage /> };
