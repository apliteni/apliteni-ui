import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';
import { Button } from './primitives/Button';

const meta: Meta<typeof EmptyState> = {
  title: 'React/EmptyState', component: EmptyState, parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const FirstRun: Story = {
  render: () => <EmptyState actions={<Button variant="primary">Create item</Button>} />,
};
export const NoMatches: Story = {
  render: () => <EmptyState variant="no-matches" actions={<>
    <Button variant="primary">Clear filters</Button>
    <Button variant="ghost">Search help</Button>
  </>} />,
};
export const NotFound: Story = {
  render: () => <EmptyState variant="not-found" actions={<a className="ui-btn ui-btn--ghost" href="/">Go home</a>} />,
};
export const NotYetBuilt: Story = {
  render: () => <EmptyState variant="not-yet-built" actions={<Button variant="primary">Go home</Button>} />,
};
export const Illustration: Story = {
  render: () => <EmptyState title="No people yet" sub="Contractors and staff you add show up here for attribution."
    art="people"
    actions={<Button variant="primary">+ Add person</Button>} />,
};

const canvas = (content: React.ReactNode) => <div style={{ padding: 40, minHeight: '100vh' }}><div style={{ maxWidth: 520 }}><div className="ui-card">{content}</div></div></div>;

export const Default: Story = {
  render: () => canvas(<EmptyState art="people" title="No people yet" sub="Contractors and staff you add show up here for attribution." actions={<Button variant="primary">+ Add person</Button>} />),
};
export const MessageOnly: Story = {
  name: 'No matches',
  render: () => canvas(<EmptyState art="invoices" title="No invoices match the current filters." sub="Clear the filters to see all invoices." actions={<Button variant="primary">Clear filters</Button>} />),
};
export const WithAction: Story = { ...Default };
export const WithIllustration: Story = {
  render: () => canvas(<EmptyState art="people" title="No people yet" sub="Contractors and staff you add show up here for attribution." actions={<Button variant="primary">+ Add person</Button>} />),
};
