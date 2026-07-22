import { footer } from '../../src/components/footer.js';
import { accentPicker } from '../../src/components/index.js';
import { themeToggle } from '../../src/components/topbar.js';

export default {
  title: 'Components/Footer',
  parameters: { layout: 'fullscreen' },
};

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
  { label: 'GitHub', href: 'https://github.com/apliteni/apliteni-ui', icon: 'github' },
  { label: 'X', href: '#', icon: 'x' },
  { label: 'LinkedIn', href: '#', icon: 'linkedin' },
  { label: 'Email', href: 'mailto:hi@apliteni.com', icon: 'mail' },
];

const LEGAL_LINKS = [
  { label: 'Privacy', href: '#privacy' },
  { label: 'Terms', href: '#terms' },
];

export const Full = {
  render: () => footer({
    variant: 'full',
    brand: { word: 'Strategy' },
    tagline: 'One strategy — as a deck, a long-form, and a live surface your agents can read over MCP.',
    columns: COLUMNS,
    social: SOCIAL,
    legalLinks: LEGAL_LINKS,
    switcher: accentPicker() + themeToggle(),
  }),
};

export const Slim = {
  name: 'Slim (single legal row)',
  render: () => footer({
    variant: 'slim',
    legal: '© 2026 Apliteni',
    legalLinks: [...LEGAL_LINKS, { label: 'Status', href: '#status' }],
    switcher: accentPicker(),
  }),
};

export const App = {
  name: 'App (in-product)',
  render: () => footer({
    variant: 'app',
    legal: '© 2026 Apliteni',
    legalLinks: [
      { label: 'Docs', href: '#docs' }, { label: 'Support', href: '#support' },
      { label: 'Keyboard shortcuts', href: '#keys' },
    ],
  }),
};

export const MobileStacked = {
  name: 'Full — mobile stacked',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: () => `<div style="max-width:430px;margin:0 auto">${footer({
    variant: 'full',
    brand: { word: 'Strategy' },
    tagline: 'Columns collapse to a single stacked list on narrow screens.',
    columns: COLUMNS,
    social: SOCIAL,
    legalLinks: LEGAL_LINKS,
    switcher: accentPicker(),
  })}</div>`,
};
