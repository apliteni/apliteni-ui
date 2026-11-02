// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage } from '../_guideline';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';

const content = await loadGuideline('text-length.md', new URL('../../guidelines/text-length.md', import.meta.url));

// The page has no rules now, so it has no specimens.
const specimens: [] = [];

const meta: Meta = { title: 'Guidelines/Text length', parameters: { layout: 'fullscreen' } };
export default meta;

export const TextLength: StoryObj = {
  name: 'Text length',
  render: () => <GuidelinePage content={content} specimens={specimens} />,
};
