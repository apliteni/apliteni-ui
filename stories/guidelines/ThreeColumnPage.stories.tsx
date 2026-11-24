// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { DrawerPicture, GuidelinePage, noop } from '../_guideline';
import { Wizard } from '../../react/src/Wizard';
import { SearchField } from '../../react/src/SearchField';
import { monthChecks } from '../../react/src/showcases/MonthClose';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_three-column-page.js';

const content = await loadGuideline('three-column-page.md', new URL('../../guidelines/three-column-page.md', import.meta.url));

/* The page drawn small, from the parts the three-column page holds: the month list,
 * the checks and the rows. The media queries of the real page read the window, not a
 * specimen cell, so a picture sets its columns itself. */
const Months = () => <div className="tc-area"><b className="tc-title">2026</b><div className="ui-nav"><ul className="ui-nav__list">
  {['October', 'September', 'August'].map((month, i) => <li key={month}>
    <button type="button" className={`ui-nav__item${i ? '' : ' is-active'}`} aria-pressed={!i}>{month}</button></li>)}
</ul></div></div>;
const Checks = () => <div className="tc-area"><b className="tc-title">Month checks</b>
  <Wizard label="Month checks" steps={monthChecks('rows', noop)}
    final={{ label: 'Finish', action: 'Close month', onAction: noop, reason: 'Complete all four checks to close this month.' }} /></div>;
const Rows = () => <div className="tc-area"><b className="tc-title">Unclassified rows</b>
  <SearchField ariaLabel="Search rows" size="sm" />
  <table className="ui-table ui-table--compact"><thead><tr><th scope="col">Date</th><th scope="col">Payee</th><th scope="col" className="ui-table__num">Amount</th></tr></thead>
    <tbody>{[['03 Oct', 'Aster Paper', '184.20'], ['04 Oct', 'Birch Studio', '620.00'], ['05 Oct', 'Cedar Tools', '92.50']].map(([day, payee, amount]) =>
      <tr key={payee}><td>{day}</td><td>{payee}</td><td className="ui-table__num">€{amount}</td></tr>)}</tbody></table></div>;
const Page = ({ cols }: { cols: 'split' | 'equal' }) => <div className={`gl-stage tc-page tc-page--${cols}`}><Months /><Checks /><Rows /></div>;
const Phone = () => <div className="gl-stage tc-phone">
  <b className="tc-head">Reconciliation</b>
  <div className="ui-nav tc-links" role="group" aria-label="Page columns">
    {['Months', 'Checks', 'Rows'].map(link => <button key={link} type="button" aria-pressed={link === 'Checks'}
      className={`ui-nav__item${link === 'Checks' ? ' is-active' : ''}`}>{link}</button>)}
  </div><Checks /></div>;

const specimens = [
  { id: 'three-columns', do: () => <Page cols="split" />,
    dont: () => <div className="gl-stage tc-frame"><Rows />
      <DrawerPicture title="Month checks" size="sm"><Checks /></DrawerPicture></div> },
  { id: 'column-widths', do: () => <Page cols="split" />, dont: () => <Page cols="equal" /> },
  { id: 'collapse-order', do: () => <Phone />, dont: () => <div className="tc-phone-frame"><Page cols="equal" /></div> },
];

const meta: Meta = { title: 'Guidelines/Three-column page', parameters: { layout: 'fullscreen' } };
export default meta;

export const ThreeColumnPage: StoryObj = {
  name: 'Three-column page',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
