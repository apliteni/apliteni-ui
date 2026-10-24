// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Switch } from '../../react/src/Switch';
import { Button } from '../../react/src/primitives/Button';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';

const content = await loadGuideline('microcopy.md', new URL('../../guidelines/microcopy.md', import.meta.url));

// Print each accessible name so the difference is visible without a screen reader.
const Named = ({ name, children }: { name: string; children: ReactNode }) =>
  <div className="gl-stage"><p>{`Accessible name: ${name}`}</p>{children}</div>;

const specimens = [
  { id: 'state-not-destination',
    do: () => <Named name="In-app notifications, on"><Switch defaultChecked label="In-app notifications, on" /></Named>,
    dont: () => <Named name="Turn off in-app notifications"><Switch defaultChecked label="Turn off in-app notifications" /></Named> },
  { id: 'never-nameless',
    do: () => <Named name="Dismiss"><Button icon="x" iconOnly>Dismiss</Button></Named>,
    dont: () => <Named name="none"><Button icon="x" iconOnly /></Named> },
];

const meta: Meta = { title: 'Guidelines/Microcopy and tone', parameters: { layout: 'fullscreen' } };
export default meta;

export const Microcopy: StoryObj = {
  name: 'Microcopy and tone',
  render: () => <GuidelinePage content={content} specimens={specimens} />,
};
