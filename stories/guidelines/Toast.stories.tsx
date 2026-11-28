// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage, NoticePicture, noop } from '../_guideline';
import { SelectionBar } from '../../react/src/SelectionBar';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_toast.js';

const content = await loadGuideline('toast.md', new URL('../../guidelines/toast.md', import.meta.url));

// Fabricated files. The pair differs only in where the notice stands: above the bar, or on it.
const Archived = () => <NoticePicture tone="success" title="2 files archived" action="Undo" left={0.6} />;
const Bar = () => <SelectionBar count={2} actions={[{ id: 'archive', label: 'Archive' }]} noun="files" onAction={noop} onClear={noop} />;

const Notice = (props: Parameters<typeof NoticePicture>[0]) => <div className="gl-stage"><NoticePicture {...props} /></div>;

const specimens = [
  { id: 'above-bottom-bar',
    do: () => <div className="gl-stage gt-stage"><Archived /><Bar /></div>,
    dont: () => <div className="gl-stage gt-stage gt-stage--over"><Bar /><Archived /></div> },
  { id: 'ring-time-left',
    do: () => <Notice tone="success" title="Seed list archived" action="Undo" left={0.6} />,
    dont: () => <Notice tone="success" title="Seed list archived" text="Undo in 8 seconds" action="Undo" /> },
];

const meta: Meta = { title: 'Guidelines/Toast', parameters: { layout: 'fullscreen' } };
export default meta;

export const ToastPage: StoryObj = {
  name: 'Toast',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
