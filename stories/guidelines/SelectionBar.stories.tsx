// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage, NoticePicture, noop } from '../_guideline';
import { DataTable, type Column } from '../../react/src/DataTable';
import { Dropdown } from '../../react/src/Dropdown';
import { SelectionBar, type SelectionBarAction } from '../../react/src/SelectionBar';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_selection-bar.js';

const content = await loadGuideline('selection-bar.md', new URL('../../guidelines/selection-bar.md', import.meta.url));

type Doc = { name: string; status: string };
const DOCS: Doc[] = [{ name: 'Field guide', status: 'Draft' }, { name: 'Release notes', status: 'Ready' }, { name: 'Test plan', status: 'Draft' }];
const COLUMNS: Column<Doc>[] = [{ key: 'name', label: 'Document', cell: 'title' }, { key: 'status', label: 'Status' }];
const STATUS: SelectionBarAction = { id: 'status', label: 'Status', items: [{ label: 'Draft' }, { label: 'Ready' }] };
const SELECTED = new Set(['Field guide', 'Release notes']);

const Bar = ({ actions = [STATUS] }: { actions?: SelectionBarAction[] }) =>
  <SelectionBar count={2} actions={actions} noun="documents" onAction={noop} onClear={noop} />;

// The pair differs only in the bar's paint: the don't gives it the page's own colours.
const Table = ({ same = false }: { same?: boolean }) =>
  <div className={`gl-stage gl-stage--bar${same ? ' gl-same-theme' : ''}`}>
    <DataTable columns={COLUMNS} rows={DOCS} pager={false} caption={same ? 'Documents, the same theme' : 'Documents'}
      selected={SELECTED} onToggle={noop} onTogglePage={noop} />
    <Bar />
  </div>;

// The don't adds an Apply button where the do says what changed.
const Picked = () =>
  <div className="gl-stage gl-stage--bar">
    <NoticePicture title="Status: Ready" text="Updated 2 documents." />
    <Bar />
  </div>;
const Applied = () =>
  <div className="gl-stage gl-stage--bar"><Bar actions={[STATUS, { id: 'apply', label: 'Apply' }]} /></div>;

const More = ({ names }: { names: string[] }) =>
  <div className="gl-stage gl-stage--menu">
    <Dropdown variant="menu" triggerContent="More" ariaLabel={`More: ${names.join(', ')}`} open onOpenChange={noop} onSelect={noop}
      items={names.map(label => ({ label, value: label }))} />
  </div>;

const specimens = [
  { id: 'other-theme', do: () => <Table />, dont: () => <Table same /> },
  { id: 'apply-at-once', do: () => <Picked />, dont: () => <Applied /> },
  { id: 'more-by-name', do: () => <More names={['Archive', 'Owner']} />, dont: () => <More names={['Avery', 'Blair', 'Casey']} /> },
];

const meta: Meta = { title: 'Guidelines/Selection bar', parameters: { layout: 'fullscreen' } };
export default meta;

export const SelectionBarPage: StoryObj = {
  name: 'Selection bar',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
