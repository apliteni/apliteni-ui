// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage } from '../_guideline';
import { EmptyState } from '../../react/src/EmptyState';
import { Button } from '../../react/src/primitives/Button';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';

const content = await loadGuideline('empty-states.md', new URL('../../guidelines/empty-states.md', import.meta.url));

// The vanilla specimens carry no guidance line and no glyph, so the presets are cleared.
const specimens = [{
  id: 'next-action',
  do: () => <div className="gl-stage">
    <EmptyState art="inbox" title="No projects yet" sub="" actions={<Button variant="primary">Create project</Button>} />
  </div>,
  dont: () => <div className="gl-stage"><EmptyState title="Nothing here" sub="" icon="" /></div>,
}];

const meta: Meta = { title: 'Guidelines/Empty states', parameters: { layout: 'fullscreen' } };
export default meta;

export const EmptyStates: StoryObj = {
  name: 'Empty states',
  render: () => <GuidelinePage content={content} specimens={specimens} />,
};
