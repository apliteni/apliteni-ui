import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AccentPicker, type Accent } from './AccentPicker';
import { ThemeToggle } from './ThemeToggle';
import { Footer } from './Footer';

const COLUMNS = [
  { title: 'Product', links: [
    { label: 'Deck', href: '#deck' }, { label: 'Text version', href: '#text' },
    { label: 'Changelog', href: '#changelog' }, { label: 'Agents', href: '#agents' },
  ] },
  { title: 'Developers', links: [
    { label: 'MCP', href: '#mcp' }, { label: 'Storybook', href: '#storybook' },
    { label: 'GitHub', href: 'https://github.com/apliteni/apliteni-ui', target: '_blank' },
  ] },
  { title: 'Company', links: [
    { label: 'About', href: '#about' }, { label: 'Access', href: '#access' },
    { label: 'Contact', href: '#contact' },
  ] },
];

const SOCIAL = [
  { label: 'GitHub', href: 'https://github.com/apliteni/apliteni-ui', icon: 'github' as const },
  { label: 'X', href: '#', icon: 'x' as const },
  { label: 'LinkedIn', href: '#', icon: 'linkedin' as const },
  { label: 'Email', href: 'mailto:demo@example.com', icon: 'mail' as const },
];

const LEGAL_LINKS = [{ label: 'Privacy', href: '#privacy' }, { label: 'Terms', href: '#terms' }];

function Switcher({ toggle = true }: { toggle?: boolean }) {
  const [accent, setAccent] = useState<Accent>('default');
  return <><AccentPicker value={accent} onChange={setAccent} />{toggle && <ThemeToggle />}</>;
}

const meta: Meta<typeof Footer> = {
  title: 'React/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen', viewport: { options: {
    phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' },
  } } },
};
export default meta;
type Story = StoryObj<typeof Footer>;

export const Full: Story = {
  render: () => <Footer variant="full"
    tagline="One strategy — as a deck, a long-form, and a live surface your agents can read over MCP."
    columns={COLUMNS} social={SOCIAL} legal="© 2026 Apliteni" legalLinks={LEGAL_LINKS} switcher={<Switcher />} />,
};

export const Slim: Story = {
  name: 'Slim (single legal row)',
  render: () => <Footer variant="slim" legal="© 2026 Apliteni"
    legalLinks={[...LEGAL_LINKS, { label: 'Status', href: '#status' }]} switcher={<Switcher toggle={false} />} />,
};

export const App: Story = {
  name: 'App (in-product)',
  render: () => <Footer variant="app" legal="© 2026 Apliteni"
    legalLinks={[{ label: 'Docs', href: '#docs' }, { label: 'Support', href: '#support' }, { label: 'Keyboard shortcuts', href: '#keys' }]} />,
};

export const MobileStacked: Story = {
  name: 'Full — mobile stacked',
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <div style={{ width: 390, maxWidth: '100%', margin: '0 auto' }}><Footer variant="full" tagline="Columns collapse to a single stacked list on narrow screens."
    columns={COLUMNS} social={SOCIAL} legal="© 2026 Apliteni" legalLinks={LEGAL_LINKS} switcher={<Switcher toggle={false} />} /></div>,
};
