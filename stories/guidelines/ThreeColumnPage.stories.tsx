// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage } from '../_guideline';
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
    <i className="tc-lay__ln" /></span>)}
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
const FILES = ['Brief', 'Plan', 'Notes', 'Report'];
const Phone = () => <div className="gl-stage tc-phone">
  <b className="tc-head">Library</b>
  <div className="ui-nav tc-links" role="group" aria-label="Page columns">
    {['Folders', 'Files', 'File'].map(link => <button key={link} type="button" aria-pressed={link === 'Files'}
      className={`ui-nav__item${link === 'Files' ? ' is-active' : ''}`}>{link}</button>)}
  </div>
  <div className="tc-area"><b className="tc-title">Projects</b>
    <div className="ui-nav"><ul className="ui-nav__list">{FILES.map(name => <li key={name}><button type="button"
      aria-pressed={name === 'Plan'} className={`ui-nav__item${name === 'Plan' ? ' is-active' : ''}`}>{name}</button></li>)}</ul></div></div>
</div>;

const specimens = [
  { id: 'three-columns', do: () => <Chain />, dont: () => <Unrelated /> },
  { id: 'selected-parent', do: () => <Chain />, dont: () => <Unmarked /> },
  { id: 'replace-children', do: () => <Archive />, dont: () => <Stale /> },
  { id: 'column-widths', do: () => <Chain />, dont: () => <Chain split={false} /> },
  { id: 'collapse-order', do: () => <Phone />, dont: () => <Crushed /> },
];

const meta: Meta = { title: 'Guidelines/Three-column page', parameters: { layout: 'fullscreen' } };
export default meta;

export const ThreeColumnPage: StoryObj = {
  name: 'Three-column page',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
