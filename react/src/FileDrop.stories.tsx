import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FileDrop, type FileDropFile } from './FileDrop';
import { Card } from './primitives/Card';
import { EmptyState } from './EmptyState';
import { Checkbox } from './Checkbox';
import { DataTable, type Column } from './DataTable';
import { useTableFilters } from '../../stories/_table-filters';

// The card is in each render rather than in a decorator, as #568 put the other
// galleries' cards: react/src/field-ground.test.tsx calls renders, so a surface left
// in a decorator is one no gate reads — and Region's checkbox is a field.
const meta: Meta<typeof FileDrop> = {
  title: 'React/File drop', component: FileDrop, id: 'react-file-drop',
};
export default meta;

const NOTE = 'PDF or CSV, up to 10 MB';
const STATEMENT: FileDropFile = { name: 'statement-2026-08.pdf', size: '248 KB' };

// Fabricated demo rows, so the drop has the list it feeds above it.
const received = [['statement-2026-07.pdf', '241 KB'], ['statement-2026-06.pdf', '236 KB']];
const Received = () => <>
  {received.map(([name, size]) => <div key={name}
    style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', paddingBlock: 'var(--space-1)' }}>
    <span>{name}</span><span>{size}</span>
  </div>)}
</>;

export const AtRest: StoryObj = {
  render: () => <Card><FileDrop note={NOTE} accept=".pdf,.csv" /></Card>,
};

export const Dragging: StoryObj = {
  render: () => <Card><FileDrop note={NOTE} accept=".pdf,.csv" dragging /></Card>,
};

export const Uploading: StoryObj = {
  render: () => <Card>
    <FileDrop file={{ ...STATEMENT, status: 'uploading', progress: 40 }} onRemove={() => {}} />
  </Card>,
};

/** A file just handed over, before the consumer has said anything about it. */
export const Starting: StoryObj = {
  render: () => <Card><FileDrop file={STATEMENT} onRemove={() => {}} /></Card>,
};

export const Done: StoryObj = {
  render: () => <Card><FileDrop file={{ ...STATEMENT, status: 'done' }} onRemove={() => {}} /></Card>,
};

export const Failed: StoryObj = {
  render: () => <Card><FileDrop
    file={{ ...STATEMENT, status: 'error', error: 'Larger than 10 MB' }}
    onRetry={() => {}} onRemove={() => {}} /></Card>,
};

/** The live row, then the same row while the account cannot receive files. */
export const Disabled: StoryObj = {
  render: () => <Card>
    <FileDrop note={NOTE} accept=".pdf,.csv" />
    <p style={{ marginTop: 'var(--space-5)' }}>While the account cannot receive files:</p>
    <FileDrop note={NOTE} disabled />
  </Card>,
};

/** One panel owns the file, so the target covers that panel and nothing else. */
export const Region: StoryObj = {
  render: function RegionStory() {
    const [dragging, setDragging] = useState(true);
    return <Card>
      <FileDrop note={NOTE} accept=".pdf,.csv" dragging={dragging}>
        <Received />
      </FileDrop>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <Checkbox label="Show the drop target" checked={dragging}
          onChange={event => setDragging(event.target.checked)} />
      </div>
    </Card>;
  },
};

/** The picker and the states a consumer drives, without a network. */
export const Live: StoryObj = {
  render: function LiveStory() {
    const [file, setFile] = useState<FileDropFile | null>(null);
    return <Card><FileDrop note={NOTE} accept=".pdf,.csv" file={file}
      onFile={chosen => setFile({ name: chosen.name, size: `${Math.round(chosen.size / 1024)} KB`, status: 'done' })}
      onRemove={() => setFile(null)} /></Card>;
  },
};

/** The empty page: nothing is held yet, so the whole first-run block is the target. */
export const Area: StoryObj = {
  render: () => <Card><FileDrop title="Add your first invoices" note="PDF, PNG or JPEG." accept=".pdf,.png,.jpg,.jpeg" multiple /></Card>,
};

export const AreaDragging: StoryObj = {
  render: () => <Card><FileDrop title="Add your first invoices" note="PDF, PNG or JPEG." dragging /></Card>,
};

// The table page the layer lies over: fabricated statements, so the blurred rows behind the words are a table's.
type Statement = { name: string; received: string; size: string };
const statements: Statement[] = [
  { name: 'statement-2026-08.pdf', received: '2026-08-31', size: '248 KB' },
  { name: 'statement-2026-07.pdf', received: '2026-07-31', size: '241 KB' },
  { name: 'statement-2026-06.pdf', received: '2026-06-30', size: '236 KB' },
  { name: 'statement-2026-05.pdf', received: '2026-05-31', size: '239 KB' },
  { name: 'statement-2026-04.pdf', received: '2026-04-30', size: '232 KB' },
  { name: 'statement-2026-03.pdf', received: '2026-03-31', size: '244 KB' },
];
const statementColumns: Column<Statement>[] = [
  { key: 'name', label: 'Statement' },
  { key: 'received', label: 'Received' },
  { key: 'size', label: 'Size', num: true },
];

/** The layer for a page that takes a file anywhere: the empty page's area, enlarged over a table page. Its ground is slightly transparent and blurred, so the table shows through softly. It is solid where the engine cannot blur or the reader asks for less transparency. A page mounts it only while a file is over the window. */
export const PageDragging: StoryObj = {
  render: function Render() {
    const { bar, shown } = useTableFilters(statements, {
      search: 'Search statements', placeholder: 'Statement', label: 'Statement filters', text: (r) => r.name, facets: [],
    });
    return <>
    <div className="ui-card-stack">
      <Card>{bar}</Card>
      <Card><DataTable columns={statementColumns} rows={shown} selectable={false} pager={false} empty="No statements match" /></Card>
    </div>
    <div className="ui-drop ui-drop--area ui-drop--page is-dragging" aria-hidden="true">
      <EmptyState icon="upload" title="Drop files to upload" sub="PDF, PNG or JPEG." />
    </div>
  </>;
  },
};
