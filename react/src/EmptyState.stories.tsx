import type { Meta, StoryObj } from '@storybook/react';
import { illo } from '@apliteni/apliteni-ui';
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
  render: () => <EmptyState variant="not-yet-built" />,
};
export const Illustration: Story = {
  render: () => <EmptyState title="No people yet" sub="Contractors and staff you add show up here for attribution."
    art={<span dangerouslySetInnerHTML={{ __html: illo('people') }} />}
    actions={<Button variant="primary">+ Add person</Button>} />,
};
