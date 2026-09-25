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

// Filtered list with no matches: no action, just a nudge to loosen the filter.
export const MessageOnly = {
  render: () => pad(`<div style="max-width:520px">${inCard(emptyState({
    art: 'invoices',
    title: 'No invoices match the current filters.',
    sub: 'Try widening the date range or clearing a filter.',
  }))}</div>`),
};

// The full illustration set — pass any name as `art` (unknown → inbox).
export const Illustrations = {
  render: () => pad(grid(3, ...illoNames.map((name) => specimen(name, inCard(emptyState({
    art: name,
    title: `No ${name} yet`,
    sub: 'This is what an empty state looks like for this context.',
  })))))),
};

// Legacy line-icon slot still renders (icon name instead of an illustration).
export const LegacyIcon = {
  render: () => pad(`<div style="max-width:520px">${inCard(emptyState({
    icon: 'doc',
    title: 'Nothing here yet',
    sub: 'The line-icon slot is kept for back-compat.',
  }))}</div>`),
};
