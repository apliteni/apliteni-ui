// The index: every page as a link and one line, in six kit cards. Every title,
// link and line comes from _overview.js, so nothing on this page is typed twice.
// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../../react/src/primitives/Card';
import { Ground } from '../_guideline';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { TITLE, LINKS, GROUPS } from './_overview.js';

type Link = { title: string; href: string; group: string; summary: string };

// Six cards, the most a page stacks: guidelines/the-page.md#limit-card-stacks.
// The page's name and its line are one link, so the target is the whole entry.
const CSS = `<style>
  .gi { max-width: var(--container); }
  .gi h1 { font: var(--weight-bold) var(--text-2xl)/1.1 var(--font-display); letter-spacing: var(--tracking-tight); color: var(--strong); margin: 0 0 var(--space-8); }
  .gi-grid { display: grid; gap: var(--space-8);
    grid-template-columns: repeat(auto-fill, minmax(min(var(--panel-sm), 100%), 1fr)); }
  .gi-pages { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
  .gi-pages a { display: flex; flex-direction: column; min-height: var(--tap-min); }
  .gi-pages b { font: var(--weight-semibold) var(--text-md)/var(--leading-snug) var(--font-sans); }
  .gi-pages span { font: var(--weight-normal) var(--text-base)/var(--leading-snug) var(--font-sans); color: var(--text); }
</style>`;

const meta: Meta = { title: 'Guidelines/Overview', parameters: { layout: 'fullscreen' } };
export default meta;

export const Overview: StoryObj = {
  name: 'Overview',
  render: () => <Ground css={CSS}>
    <div className="gi">
      <h1>{TITLE}</h1>
      <div className="gi-grid">{(GROUPS as string[]).map(group =>
        <Card key={group} title={group} pad="sm">
          <ul className="gi-pages">{(LINKS as Link[]).filter(link => link.group === group).map(link =>
            <li key={link.href}>
              <a href={link.href} target="_top"><b>{link.title}</b><span>{link.summary}</span></a>
            </li>)}</ul>
        </Card>)}</div>
    </div>
  </Ground>,
};
