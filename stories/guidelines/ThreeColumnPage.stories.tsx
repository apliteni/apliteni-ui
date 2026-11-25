// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage, noop } from '../_guideline';
import { Wizard } from '../../react/src/Wizard';
import { monthChecks } from '../../react/src/showcases/MonthClose';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_three-column-page.js';

const content = await loadGuideline('three-column-page.md', new URL('../../guidelines/three-column-page.md', import.meta.url));

/* A three-column page cannot be drawn at life size in a specimen cell, so the layout
 * pictures are drawn to scale, as the page guideline draws a shell: the three columns as
 * blocks, and their items as the bars a reader skims. Each block's heading names the
 * parent that it belongs to, and a selected item keeps the nav's selected plate. The ratio
 * is true and the pixels are not. The phone picture is drawn with the real parts. */
type Area = 'list' | 'steps' | 'work';
type Col = { area: Area; cap: string; on?: number };
const Block = ({ area, cap, on }: Col) => <div className={`tc-lay__col tc-lay__col--${area}`}>
  <span className="tc-lay__cap">{cap}</span>
  {Array.from({ length: area === 'list' ? 4 : 5 }, (_, i) => <span key={i} className={`tc-lay__row${i === on ? ' tc-lay__row--on' : ''}`}>
    {area === 'steps' && <i className="tc-lay__dot" />}<i className="tc-lay__ln" /></span>)}
</div>;
const Columns = ({ cols, label, split = true, phone = false }: { cols: Col[]; label: string; split?: boolean; phone?: boolean }) =>
  <div className={`gl-stage tc-lay tc-lay--${split ? 'split' : 'equal'}${phone ? ' tc-lay--phone' : ''}`} role="img" aria-label={label}>
    {cols.map(col => <Block key={col.area} {...col} />)}</div>;
// October is the first month and Unclassified rows the second check.
const october: Col[] = [{ area: 'list', cap: 'Months', on: 0 }, { area: 'steps', cap: 'October', on: 1 }, { area: 'work', cap: 'Unclassified rows' }];
const CHAIN = 'October is selected in the months, its checks fill column 2, and the rows of its open check fill column 3';
const Chain = ({ split = true }: { split?: boolean }) => <Columns cols={october} split={split} label={split ? CHAIN
  : 'The same months, checks and rows in three equal columns'} />;
const Unrelated = () => <Columns label="Months, documents and reports, with nothing selected and no column that depends on another"
  cols={[{ area: 'list', cap: 'Months' }, { area: 'steps', cap: 'Documents' }, { area: 'work', cap: 'Reports' }]} />;
const Unmarked = () => <Columns label="The months and the checks with no selected item, so the reader cannot see which month and check are open"
  cols={october.map(({ area, cap }) => ({ area, cap }))} />;
const September = () => <Columns label="September is selected, and columns 2 and 3 hold the checks of September and the rows of its first check"
  cols={[{ area: 'list', cap: 'Months', on: 1 }, { area: 'steps', cap: 'September', on: 0 }, { area: 'work', cap: 'Sources' }]} />;
const Stale = () => <Columns label="September is selected, but columns 2 and 3 still hold the checks and the rows of October"
  cols={[{ area: 'list', cap: 'Months', on: 1 }, { area: 'steps', cap: 'October', on: 1 }, { area: 'work', cap: 'Unclassified rows' }]} />;
const Crushed = () => <Columns cols={october} split={false} phone label="Three columns squeezed onto a phone" />;
const Phone = () => <div className="gl-stage tc-phone">
  <b className="tc-head">Reconciliation</b>
  <div className="ui-nav tc-links" role="group" aria-label="Page columns">
    {['Months', 'Checks', 'Rows'].map(link => <button key={link} type="button" aria-pressed={link === 'Checks'}
      className={`ui-nav__item${link === 'Checks' ? ' is-active' : ''}`}>{link}</button>)}
  </div>
  <div className="tc-area"><b className="tc-title">Month checks</b>
    <Wizard label="Month checks" steps={monthChecks('rows', noop)}
      final={{ label: 'Finish', action: 'Close month', onAction: noop, reason: 'Complete all four checks to close this month.' }} /></div>
</div>;

const specimens = [
  { id: 'three-columns', do: () => <Chain />, dont: () => <Unrelated /> },
  { id: 'selected-parent', do: () => <Chain />, dont: () => <Unmarked /> },
  { id: 'replace-children', do: () => <September />, dont: () => <Stale /> },
  { id: 'column-widths', do: () => <Chain />, dont: () => <Chain split={false} /> },
  { id: 'collapse-order', do: () => <Phone />, dont: () => <Crushed /> },
];

const meta: Meta = { title: 'Guidelines/Three-column page', parameters: { layout: 'fullscreen' } };
export default meta;

export const ThreeColumnPage: StoryObj = {
  name: 'Three-column page',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
