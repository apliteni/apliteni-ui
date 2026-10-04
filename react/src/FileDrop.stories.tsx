import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FileDrop, type FileDropFile } from './FileDrop';
import { Card } from './primitives/Card';
import { Checkbox } from './Checkbox';

const meta: Meta<typeof FileDrop> = {
  title: 'React/File drop', component: FileDrop, id: 'react-file-drop',
  decorators: [Story => <Card><Story /></Card>],
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
  render: () => <FileDrop note={NOTE} accept=".pdf,.csv" />,
};

export const Dragging: StoryObj = {
  render: () => <FileDrop note={NOTE} accept=".pdf,.csv" dragging />,
};

export const Uploading: StoryObj = {
  render: () => <FileDrop file={{ ...STATEMENT, status: 'uploading', progress: 40 }} onRemove={() => {}} />,
};

/** A file just handed over, before the consumer has said anything about it. */
export const Starting: StoryObj = {
  render: () => <FileDrop file={STATEMENT} onRemove={() => {}} />,
};

export const Done: StoryObj = {
  render: () => <FileDrop file={{ ...STATEMENT, status: 'done' }} onRemove={() => {}} />,
};

export const Failed: StoryObj = {
  render: () => <FileDrop
    file={{ ...STATEMENT, status: 'error', error: 'Larger than 10 MB' }}
    onRetry={() => {}} onRemove={() => {}} />,
};

/** The live row, then the same row while the account cannot receive files. */
export const Disabled: StoryObj = {
  render: () => <>
    <FileDrop note={NOTE} accept=".pdf,.csv" />
    <p style={{ marginTop: 'var(--space-5)' }}>While the account cannot receive files:</p>
    <FileDrop note={NOTE} disabled />
  </>,
};

/** One panel owns the file, so the target covers that panel and nothing else. */
export const Region: StoryObj = {
  render: function RegionStory() {
    const [dragging, setDragging] = useState(true);
    return <>
      <FileDrop note={NOTE} accept=".pdf,.csv" dragging={dragging}>
        <Received />
      </FileDrop>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <Checkbox label="Show the drop target" checked={dragging}
          onChange={event => setDragging(event.target.checked)} />
      </div>
    </>;
  },
};

/** The picker and the states a consumer drives, without a network. */
export const Live: StoryObj = {
  render: function LiveStory() {
    const [file, setFile] = useState<FileDropFile | null>(null);
    return <FileDrop note={NOTE} accept=".pdf,.csv" file={file}
      onFile={chosen => setFile({ name: chosen.name, size: `${Math.round(chosen.size / 1024)} KB`, status: 'done' })}
      onRemove={() => setFile(null)} />;
  },
};
