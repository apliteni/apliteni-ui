import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppShell } from './AppShell';
import { Button } from './primitives/Button';
import { KeyValueList } from './KeyValueList';
import { SplitLayout, type SplitLayoutPreviewState, type SplitLayoutZoom } from './SplitLayout';

type Args = { state: SplitLayoutPreviewState; zoom: SplitLayoutZoom; long: boolean; resizable: boolean };

const meta: Meta<Args> = {
  title: 'React/Split layout', id: 'react-split-layout',
  parameters: { layout: 'fullscreen' },
  args: { state: 'ready', zoom: 'fit', long: false, resizable: false },
  argTypes: {
    state: { control: 'inline-radio', options: ['ready', 'loading', 'unavailable'] },
    zoom: { control: 'inline-radio', options: ['fit', 50, 100, 150, 200] },
  },
};
export default meta;

const fields = [
  { label: 'Prepared by', value: 'Cedar Studio' },
  { label: 'Reference', value: 'DEMO-2207' },
  { label: 'Signed', value: '2 October 2026' },
  { label: 'Ends', value: '31 March 2027' },
];
// The long case: more facts than one screen holds, so the first pane scrolls on its own.
const more = Array.from({ length: 14 }, (_, i) => ({ label: `Clause ${i + 1}`, value: 'Accepted' }));

function Page({ state: from, zoom: start, long, resizable }: Args) {
  const [state, setState] = useState(from);
  const [zoom, setZoom] = useState(start);
  // The controls set the story again after it mounts, so the page takes their new values.
  useEffect(() => setState(from), [from]);
  useEffect(() => setZoom(start), [start]);
  return <AppShell word="Workspace" width="full"
    sections={[{ href: '#documents', label: 'Documents', icon: 'doc' }, { href: '#settings', label: 'Settings', icon: 'gear' }]}
    pathname="#documents" account={{ name: 'Demo Reviewer', email: 'demo@example.com' }} onSignOut={() => {}}>
    <SplitLayout
      resizable={resizable}
      primaryLabel="Agreement details"
      primary={<>
        <h1>Check the service agreement</h1>
        <p className="ui-app__sub">Compare the details with the signed copy.</p>
        <KeyValueList rows={long ? [...fields, ...more] : fields} />
      </>}
      preview={{
        title: 'Signed copy', state, onRetry: () => setState('ready'), children: <>
          <h3>Service agreement</h3>
          <p>Cedar Studio prepares the brand refresh for the Workspace.</p>
          <p>Reference DEMO-2207, signed 2 October 2026, ends 31 March 2027.</p>
          <p>The work covers interface design, usability testing and developer handoff.</p>
        </>,
      }}
      zoom={zoom}
      onZoomChange={setZoom}
      actions={<>
        <Button variant="primary">Mark as checked</Button>
        <Button>Request changes</Button>
      </>}
    />
  </AppShell>;
}

// The 60% content pane and its actions, and the 40% preview on the document ground.
export const Default: StoryObj<Args> = { render: (args) => <Page {...args} /> };
export const Loading: StoryObj<Args> = { args: { state: 'loading' }, render: (args) => <Page {...args} /> };
// Try again brings the sheet back.
export const Unavailable: StoryObj<Args> = { args: { state: 'unavailable' }, render: (args) => <Page {...args} /> };
// Above Fit, the sheet scrolls inside the preview and the tools stay in place.
export const Zoomed: StoryObj<Args> = { args: { zoom: 200 }, render: (args) => <Page {...args} /> };
// Above 860px, the reader drags the line between the panes.
export const Resizable: StoryObj<Args> = { args: { resizable: true }, render: (args) => <Page {...args} /> };
export const LongContent: StoryObj<Args> = { args: { long: true }, render: (args) => <Page {...args} /> };
