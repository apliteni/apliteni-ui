// The empty-state showcases in React, under the vanilla page's title and id.
import type { Meta, StoryObj } from '@storybook/react';
import { FinanceShell } from './_finance-shell';
import { EmptyState } from '../../react/src/EmptyState';
import { SearchField } from '../../react/src/SearchField';
import { Segmented } from '../../react/src/Segmented';
import { Button } from '../../react/src/primitives/Button';

const meta: Meta = { title: 'Showcases/Empty states', id: 'apps-empty-states', parameters: { layout: 'fullscreen' } };
export default meta;

const noop = () => {};

// A filtered list with an action to clear the filters. #517, #850 A
const FilteredListScreen = () => <FinanceShell active="invoices" title="Invoices" sub="Everything you have uploaded or received by email.">
    <div className="ui-toolbar" style={{ marginBottom: 16 }}>
      <SearchField ariaLabel="Search invoices by vendor" placeholder="Vendor" />
      <Segmented label="Status filter" options={['Any', 'Verified', 'Pending'].map(label => ({ label, value: label }))} value="Pending" onChange={noop} />
      <Button variant="secondary">Filter</Button>
    </div>
    <EmptyState className="ui-empty--edge" variant="no-matches" icon="" title="No invoices match the current filters." sub="Clear the filters to see all invoices."
      actions={<Button variant="primary">Clear filters</Button>} />
  </FinanceShell>;
export const FilteredList: StoryObj = { render: () => <FilteredListScreen /> };

// A first-run page with no rows yet: illustration, guidance and a clear action, in a
// tinted panel with a display-face title. #517, #850 B
const FirstRunScreen = () => <FinanceShell active="prefs" title="People" sub="Contractors and staff, for cost attribution.">
    <EmptyState className="ui-empty--panel" art="people" title="No people yet" sub="Contractors and staff you add show up here for attribution."
      actions={<Button variant="primary">+ Add person</Button>} />
  </FinanceShell>;
export const FirstRun: StoryObj = { render: () => <FirstRunScreen /> };
