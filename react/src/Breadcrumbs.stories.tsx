import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumbs } from './Breadcrumbs';

const meta: Meta<typeof Breadcrumbs> = { title: 'React/Breadcrumbs', component: Breadcrumbs, parameters: { layout: 'fullscreen' }, render: args => <div style={{ padding: 40 }}><Breadcrumbs {...args} /></div> };
export default meta;
export const Trail: StoryObj<typeof Breadcrumbs> = {
  render: args => <div style={{ padding: 40, minHeight: '100vh' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
      <div style={{ font: '600 11px/1 var(--font-sans)' }}>The Finance / Payouts trail — the last crumb is the current page</div>
      <Breadcrumbs {...args} />
    </div>
  </div>,
  args: { items: [
    { label: 'Finance', href: '#finance' },
    { label: 'Payouts', href: '#payouts' },
    { label: 'PY-4821' },
  ] },
};
export const WithIcon: StoryObj<typeof Breadcrumbs> = {
  args: { items: [
    { label: 'Home', href: '#home', icon: 'compass' },
    { label: 'Workspace', href: '#workspace' },
    { label: 'API keys' },
  ] },
};
