// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage, noop } from '../_guideline';
import { BackLink } from '../../react/src/BackLink';
import { Dropdown } from '../../react/src/Dropdown';
import { Icon } from '../../react/src/primitives/Icon';
import { Segmented } from '../../react/src/Segmented';
import '../../react/src/ThreeColumnPage.css';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_three-column-page.js';

const content = await loadGuideline('three-column-page.md', new URL('../../guidelines/three-column-page.md', import.meta.url));

/* A three-column page cannot be drawn at life size in a specimen cell, so the layout
 * pictures are drawn to scale, as the page guideline draws a shell: the three columns as
 * blocks, and their items as the bars a reader skims. Each block's heading names the
 * parent that it belongs to, and a selected item keeps the page's selected paint. The ratio
 * is true and the pixels are not. The phone picture is drawn with the real parts. */
type Area = 'parents' | 'children' | 'child';
type Col = { area: Area; cap: string; on?: number };
const Block = ({ area, cap, on }: Col) => <div className={`tc-lay__col tc-lay__col--${area}`}>
  <span className="tc-lay__cap">{cap}</span>
  {Array.from({ length: area === 'parents' ? 4 : 5 }, (_, i) => <span key={i} className={`tc-lay__row${i === on ? ' tc-lay__row--on' : ''}`}>
    <i className="tc-lay__ln" />{area === 'parents' && <Icon name="chevronRight" />}</span>)}
</div>;
const Columns = ({ cols, label, split = true, phone = false }: { cols: Col[]; label: string; split?: boolean; phone?: boolean }) =>
  <div className={`gl-stage tc-lay tc-lay--${split ? 'split' : 'equal'}${phone ? ' tc-lay--phone' : ''}`} role="img" aria-label={label}>
    {cols.map(col => <Block key={col.area} {...col} />)}</div>;
// Projects is the first folder and Plan its second file.
const projects: Col[] = [{ area: 'parents', cap: 'Folders', on: 0 }, { area: 'children', cap: 'Projects', on: 1 }, { area: 'child', cap: 'Plan' }];
const CHAIN = 'Projects is selected in the folders, its files fill column 2, and the open file fills column 3';
const Chain = ({ split = true }: { split?: boolean }) => <Columns cols={projects} split={split} label={split ? CHAIN
  : 'The same folders, files and open file in three equal columns'} />;
const Unrelated = () => <Columns label="Folders, tags and recent items, with nothing selected and no column that depends on another"
  cols={[{ area: 'parents', cap: 'Folders' }, { area: 'children', cap: 'Tags' }, { area: 'child', cap: 'Recent' }]} />;
const Unmarked = () => <Columns label="The folders and the files with no selected item, so the reader cannot see which folder and file are open"
  cols={projects.map(({ area, cap }) => ({ area, cap }))} />;
const Archive = () => <Columns label="Archive is selected, and columns 2 and 3 hold the files of Archive and its first file"
  cols={[{ area: 'parents', cap: 'Folders', on: 1 }, { area: 'children', cap: 'Archive', on: 0 }, { area: 'child', cap: 'Notes' }]} />;
const Stale = () => <Columns label="Archive is selected, but columns 2 and 3 still hold the files of Projects and its open file"
  cols={[{ area: 'parents', cap: 'Folders', on: 1 }, { area: 'children', cap: 'Projects', on: 1 }, { area: 'child', cap: 'Plan' }]} />;
const Crushed = () => <Columns cols={projects} split={false} phone label="Three columns squeezed onto a phone" />;
const FILES = [['Brief', '22 Nov'], ['Plan', '24 Nov'], ['Notes', '23 Nov'], ['Report', '17 Nov']];
/** A column's list with the page's own parts: a glyph, a name and a date in each row. */
const Files = () => <nav className="ui-nav ui-columns__list" aria-label="Files in Projects"><ul className="ui-nav__list">
  {FILES.map(([name, day]) => <li key={name}><button type="button" aria-pressed={name === 'Plan'}
    className={`ui-nav__item${name === 'Plan' ? ' is-active' : ''}`}><span className="ui-nav__ic"><Icon name="doc" /></span>
    <span className="ui-nav__label">{name}</span>{' '}<span className="ui-columns__end">{day}</span></button></li>)}
</ul></nav>;
const Phone = () => <div className="gl-stage tc-phone">
  <div className="ui-columns__up"><BackLink href="#" label="Folders" onClick={(e: { preventDefault: () => void }) => e.preventDefault()} /></div>
  <header className="ui-columns__head"><h3 className="ui-card__title">Projects</h3><span className="ui-columns__count">4</span></header>
  <Files />
</div>;
const Header = ({ menu }: { menu: boolean }) => <div className="gl-stage tc-phone">
  <header className="ui-columns__head">
    {menu ? <Dropdown variant="menu" align="start" triggerContent="Projects" triggerClass="ui-columns__menu" onSelect={noop}
      items={[{ label: 'Name', value: 'name' }, { label: 'Date', value: 'date', selected: true }]} />
      : <h3 className="ui-card__title">Projects</h3>}
    <span className="ui-columns__count">4</span>
  </header>
  {!menu && <div className="ui-toolbar tc-bar">
    <Segmented label="Sort by" size="sm" value="date" onChange={noop} options={[{ value: 'name', label: 'Name' }, { value: 'date', label: 'Date' }]} />
    <Segmented label="View" size="sm" value="list" onChange={noop} options={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]} />
  </div>}
  <Files />
</div>;

const specimens = [
  { id: 'three-columns', do: () => <Chain />, dont: () => <Unrelated /> },
  { id: 'selected-parent', do: () => <Chain />, dont: () => <Unmarked /> },
  { id: 'replace-children', do: () => <Archive />, dont: () => <Stale /> },
  { id: 'column-widths', do: () => <Chain />, dont: () => <Chain split={false} /> },
  { id: 'collapse-order', do: () => <Phone />, dont: () => <Crushed /> },
  { id: 'column-header', do: () => <Header menu />, dont: () => <Header menu={false} /> },
];

const meta: Meta = { title: 'Guidelines/Three-column page', parameters: { layout: 'fullscreen' } };
export default meta;

export const ThreeColumnPage: StoryObj = {
  name: 'Three-column page',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
