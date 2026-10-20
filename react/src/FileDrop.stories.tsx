import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FileDrop, FileDropArea, PageDrop, type FileDropFile } from './FileDrop';
import { Card } from './primitives/Card';
import { Checkbox } from './Checkbox';

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
  render: () => <Card><FileDropArea title="Add your first invoices" note="PDF, PNG or JPEG." accept=".pdf,.png,.jpg,.jpeg" multiple /></Card>,
};

export const AreaDragging: StoryObj = {
  render: () => <Card><FileDropArea title="Add your first invoices" note="PDF, PNG or JPEG." dragging /></Card>,
};

/** A page that already holds files. Drag a file over it, or read the layer shown here. */
export const Page: StoryObj = {
  render: () => <>
    <Card><FileDrop note={NOTE} accept=".pdf,.csv"><Received /></FileDrop></Card>
    <PageDrop open />
  </>,
};

export const PageLive: StoryObj = {
  render: function PageLiveStory() {
    const [names, setNames] = useState<string[]>([]);
    return <>
      <Card><FileDrop note={NOTE} accept=".pdf,.csv"><Received />{names.map(name => <p key={name}>{name}</p>)}</FileDrop></Card>
      <PageDrop onFiles={files => setNames(rows => [...rows, ...files.map(file => file.name)])} />
    </>;
  },
};
