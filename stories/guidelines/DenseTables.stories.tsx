// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage } from '../_guideline';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_dense-tables.js';

const content = await loadGuideline('dense-tables.md', new URL('../../guidelines/dense-tables.md', import.meta.url));

const PAYOUTS = [['1162', '1,240.00'], ['1161', '860.00'], ['1160', '2,100.00']];

// One table, twice: the pair is the width and nothing else. Dense, because the base
// recipe leaves its last header flush with the table edge while its values keep a
// right inset. Short references keep the two halves far apart at phone width.
const Payouts = ({ stretch = false }: { stretch?: boolean }) =>
  <div className={`gdt-stage ui-card ui-card--pad-sm${stretch ? '' : ' ui-card--fit'}`}>
    <table className={`ui-table ui-table--dense ui-table--hover${stretch ? ' gdt-stretch' : ''}`}>
      <caption>Payouts · EUR</caption>
      <thead><tr><th>Reference</th><th className="ui-table__num">Amount</th></tr></thead>
      <tbody>{PAYOUTS.map(([reference, amount]) =>
        <tr key={reference}><td>{reference}</td><td className="ui-table__num">{amount}</td></tr>)}</tbody>
    </table>
  </div>;

const specimens = [
  { id: 'surface' }, { id: 'density' }, { id: 'numbers' }, { id: 'delta' }, { id: 'units' },
  { id: 'content-width', do: () => <Payouts />, dont: () => <Payouts stretch /> },
  { id: 'overflow' }, { id: 'pinned-identity-sub-lines' }, { id: 'states' },
];

const meta: Meta = { title: 'Guidelines/Dense tables', parameters: { layout: 'fullscreen' } };
export default meta;

export const DenseTables: StoryObj = {
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
