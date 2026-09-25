import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = { title: 'React/EmptyState', component: EmptyState };
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const FirstRun: Story = {
  render: () => <EmptyState primaryAction={{ label: 'Create item', href: '#create' }} />,
};
export const NoMatches: Story = {
  render: () => <EmptyState variant="no-matches" primaryAction={{ label: 'Clear filters', onClick: () => {} }} secondaryAction={{ label: 'Search help', href: '#help' }} />,
};
export const NotFound: Story = {
  render: () => (
    <div className="ui-app">
      <aside className="ui-app__rail">
        <nav className="ui-nav ui-nav--side" aria-label="Main">
          <a className="ui-nav__item" href="/">Home</a>
        </nav>
      </aside>
      <main className="ui-app__main">
        <EmptyState variant="not-found" primaryAction={{ label: 'Go home', href: '/' }} />
      </main>
    </div>
  ),
};
export const NotYetBuilt: Story = {
  render: () => <EmptyState variant="not-yet-built" />,
};
export const Illustration: Story = {
  render: () => <EmptyState title="No folders yet" sub="Folders you create appear here." illustration={
    <svg className="ui-illo" width="96" height="72" viewBox="0 0 96 72">
      <path className="ui-illo__fill" d="M12 18h28l8 8h36v34H12z" />
      <path className="ui-illo__stroke" d="M12 18h28l8 8h36v34H12z" />
    </svg>
  } />,
};
