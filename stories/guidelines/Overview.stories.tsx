// The index: one row per page. Every title and link comes from _overview.js,
// so nothing on this page is typed twice.
// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { Ground } from '../_guideline';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { TITLE, LINKS } from './_overview.js';

// The index stands on the same ground as the pages it links to: the reading surface.
// why: guidelines/colour-and-theming.md#keep-text-off-grey-fills
const CSS = `<style>
  .gi { max-width: var(--measure); }
  .gi h1 { font: 700 27px/1.2 var(--font-display); color: var(--strong); margin-bottom: var(--space-5); }
  .gi-list { font: 400 15px/1.7 var(--font-sans); color: var(--text); margin: 0; padding-left: var(--space-5); }
  .gi-list li + li { margin-top: var(--space-2); }
  .gi-list a { color: var(--text); }
</style>`;

const meta: Meta = { title: 'Guidelines/Overview', parameters: { layout: 'fullscreen' } };
export default meta;

export const Overview: StoryObj = {
  name: 'Overview',
  render: () => <Ground css={CSS}>
    <div className="gi">
      <h1>{TITLE}</h1>
      <ul className="gi-list">{(LINKS as { title: string; href: string }[]).map(link =>
        <li key={link.href}><a href={link.href} target="_top">{link.title}</a></li>)}</ul>
    </div>
  </Ground>,
};
