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
 * pictures are drawn to scale, as the page guideline draws a shell: the list, the steps
 * and the work as blocks, and their content as the bars a reader skims. The ratio is
 * true and the pixels are not. The phone picture is drawn with the real parts. */
type Area = 'list' | 'steps' | 'work';
const CAPS: Record<Area, string> = { list: 'Months', steps: 'Checks', work: 'Rows' };
const Block = ({ area }: { area: Area }) => <div className={`tc-lay__col tc-lay__col--${area}`}>
  <span className="tc-lay__cap">{CAPS[area]}</span>
  {Array.from({ length: area === 'list' ? 4 : 5 }, (_, i) => <span key={i} className="tc-lay__row">
    {area === 'steps' && <i className="tc-lay__dot" />}<i className="tc-lay__ln" /></span>)}
</div>;
const Layout = ({ cols }: { cols: 'split' | 'equal' }) => <div className={`gl-stage tc-lay tc-lay--${cols}`} role="img"
  aria-label={cols === 'split' ? 'Months and checks share one half, and the rows take the wider half' : 'Months, checks and rows in three equal columns'}>
  <Block area="list" /><Block area="steps" /><Block area="work" /></div>;
const Drawer = () => <div className="gl-stage tc-lay tc-lay--drawer" role="img" aria-label="The checks in a drawer over the rows">
  <Block area="work" /><div className="tc-lay__drawer"><Block area="steps" /></div></div>;
const Crushed = () => <div className="gl-stage tc-lay tc-lay--equal tc-lay--phone" role="img" aria-label="Three columns squeezed onto a phone">
  <Block area="list" /><Block area="steps" /><Block area="work" /></div>;
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
  { id: 'three-columns', do: () => <Layout cols="split" />, dont: () => <Drawer /> },
  { id: 'column-widths', do: () => <Layout cols="split" />, dont: () => <Layout cols="equal" /> },
  { id: 'collapse-order', do: () => <Phone />, dont: () => <Crushed /> },
];

const meta: Meta = { title: 'Guidelines/Three-column page', parameters: { layout: 'fullscreen' } };
export default meta;

export const ThreeColumnPage: StoryObj = {
  name: 'Three-column page',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
