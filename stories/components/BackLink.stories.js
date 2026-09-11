import { backLink } from '../../src/components/back.js';
import { badge, card } from '../../src/components/index.js';
import { financeShell } from '../apps/_finance-nav.js';
import { grid, pad, specimen } from '../_gallery.js';

export default {
  title: 'Components/Back link',
  parameters: { layout: 'fullscreen' },
  render: (a) => pad(backLink(a)),
  argTypes: {
    href: { control: 'text' },
    // Clear it to see the fallback: "Back", named nothing more.
    label: { control: 'text' },
  },
  args: { href: '#invoices', label: 'Invoices' },
};

export const Playground = {};

export const Gallery = {
  render: () => pad(grid(
    1,
    specimen('Named for where it goes', backLink({ href: '#invoices', label: 'Invoices' })),
    specimen('A longer destination', backLink({ href: '#access', label: 'Access and agents' })),
    specimen('No name given', backLink({ href: '#', label: '' })),
  )),
};

// A record's fields, laid out the way a detail page lays them. Every value is a
// placeholder: this repo is public, and the page is about the link above it.
const FACTS_CSS = `<style>
  .bl-facts { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-2) var(--space-6);
    margin: 0; font-size: var(--text-sm); }
  .bl-facts dt { color: var(--muted); }
  .bl-facts dd { margin: 0; color: var(--text); }
</style>`;

const facts = (rows) => `<dl class="bl-facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

// Where the link lives: a record opened from a list, in the portal's own shell.
// The Invoices row stays lit, and the link above the title says the same word.
export const InTheShell = {
  name: 'In the page shell',
  render: () => FACTS_CSS + financeShell({
    active: 'invoices',
    title: 'Invoice INV-1001',
    sub: 'A placeholder record opened from the invoice list.',
    back: { href: '#invoices', label: 'Invoices' },
    body: card({
      title: 'Details',
      body: facts([
        ['Customer', 'Example Co.'],
        ['Issued', '2026-01-15'],
        ['Status', badge('Draft')],
      ]),
    }),
  }),
};
