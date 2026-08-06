import { financeShell } from './_financeShell.js';
import { card, emptyState, button, input } from '../../src/components/index.js';
import { tabs } from '../../src/components/tabs.js';

export default {
  title: 'Apps/Empty states',
  parameters: { layout: 'fullscreen' },
};

// The status filter switches which list is shown, so it is a tab strip with a
// panel behind each choice — not a segmented pill, which controls nothing and
// would leave the result loose on the page.
const STATUSES = [
  {
    label: 'Any',
    title: 'No invoices match the current filters.',
    sub: 'Try widening the date range or clearing a filter.',
  },
  {
    label: 'Verified',
    title: 'No verified invoices in this range.',
    sub: 'Verification runs overnight — anything uploaded today lands here tomorrow.',
  },
  {
    label: 'Pending',
    title: 'Nothing is waiting on verification.',
    sub: 'Invoices show up here between upload and the overnight check.',
  },
];

// A filtered list that returned nothing — illustration + nudge, no action.
export const FilteredList = {
  render: () => financeShell({
    active: 'invoices',
    crumb: 'Invoices',
    title: 'Invoices',
    sub: 'Everything you have uploaded or received by email.',
    body: `
      <div style="display:flex;gap:10px;margin-bottom:16px">
        ${input({ placeholder: 'Vendor', ariaLabel: 'Vendor' })}
        ${button({ label: 'Filter', variant: 'secondary' })}
      </div>
      ${tabs({
        name: 'invoice-status',
        ariaLabel: 'Invoice status',
        active: 2,
        items: STATUSES.map((s) => ({
          label: s.label,
          panel: card({ body: emptyState({ art: 'invoices', title: s.title, sub: s.sub }) }),
        })),
      })}
    `,
  }),
};

// A first-run page with no rows yet — illustration + guidance + a clear action.
export const FirstRun = {
  render: () => financeShell({
    active: 'prefs',
    crumb: 'People',
    title: 'People',
    sub: 'Contractors and staff, for cost attribution.',
    body: card({ body: emptyState({
      art: 'people',
      title: 'No people yet',
      sub: 'Contractors and staff you add show up here for attribution.',
      actions: button({ label: '+ Add person', variant: 'primary' }),
    }) }),
  }),
};
