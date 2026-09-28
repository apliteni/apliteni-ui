import { emptyState, button, illoNames } from '../../src/components/index.js';
import { pad, grid, specimen } from '../_gallery.js';

export default {
  title: 'Components/Empty state',
  parameters: { layout: 'fullscreen' },
};

const inCard = (html) => `<div class="ui-card">${html}</div>`;

// First-run: an illustration, a title, a line of guidance, and one action.
export const Default = {
  render: () => pad(`<div style="max-width:520px">${inCard(emptyState({
    art: 'people',
    title: 'No people yet',
    sub: 'Contractors and staff you add show up here for attribution.',
    actions: button({ label: '+ Add person', variant: 'primary' }),
  }))}</div>`),
};

// Keep the export stable for existing Storybook links.
export const MessageOnly = {
  name: 'No matches',
  render: () => pad(`<div style="max-width:520px">${inCard(emptyState({
    art: 'invoices',
    title: 'No invoices match the current filters.',
    sub: 'Clear the filters to see all invoices.',
    actions: button({ label: 'Clear filters', variant: 'primary' }),
  }))}</div>`),
};

// The full illustration set — pass any name as `art` (unknown → inbox).
export const Illustrations = {
  render: () => pad(grid(3, ...illoNames.map((name) => specimen(name, inCard(emptyState({
    art: name,
    title: ({ search: 'No results match your search', inbox: 'Your inbox is empty' })[name] || `No ${name} yet`,
    actions: button({ label: ({ people: 'Add person', invoices: 'Upload invoice', transactions: 'Add transaction', search: 'Clear search', agents: 'Add agent', inbox: 'Compose message' })[name], variant: 'primary' }),
  })))))),
};

// Legacy line-icon slot still renders (icon name instead of an illustration).
export const LegacyIcon = {
  render: () => pad(`<div style="max-width:520px">${inCard(emptyState({
    icon: 'doc',
    title: 'No documents yet',
    actions: button({ label: 'Upload document', variant: 'primary' }),
  }))}</div>`),
};
