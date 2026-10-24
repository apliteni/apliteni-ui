// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage, Raw } from '../_guideline';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { RULES, SPEC_CSS, TITLE } from './_file-drop.js';

// The drop rows are drawn as markup in _file-drop.js, from the kit's classes and
// glyphs alone: each state is a picture of the row, which no live picker holds
// still. So the specimens are those pictures, and only the page around them is React.
type HtmlRule = { id: string; doHtml?: () => string; dontHtml?: () => string };
const specimens = (RULES as HtmlRule[]).map(({ id, doHtml, dontHtml }) => ({
  id,
  do: doHtml && (() => <Raw block html={doHtml()} />),
  dont: dontHtml && (() => <Raw block html={dontHtml()} />),
}));

const meta: Meta = { title: 'Guidelines/File drop', parameters: { layout: 'fullscreen' } };
export default meta;

export const FileDrop: StoryObj = {
  name: 'File drop',
  render: () => <GuidelinePage content={{ title: TITLE, rules: RULES }} specimens={specimens} css={SPEC_CSS} />,
};
