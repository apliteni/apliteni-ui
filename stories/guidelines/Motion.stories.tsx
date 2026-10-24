// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage } from '../_guideline';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';

const content = await loadGuideline('motion.md', new URL('../../guidelines/motion.md', import.meta.url));
// No rule here has a specimen pair. Motion is the one thing a still picture
// cannot show, so each rule stands on its why and on the gate named in
// docs/foundations.md#motion.
const specimens = ['after-load', 'durations', 'easing', 'reduced'].map(id => ({ id }));

const meta: Meta = { title: 'Guidelines/Motion', parameters: { layout: 'fullscreen' } };
export default meta;

export const Motion: StoryObj = {
  name: 'Motion',
  render: () => <GuidelinePage content={content} specimens={specimens} />,
};
