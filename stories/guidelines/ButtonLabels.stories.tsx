// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Button } from '../../react/src/primitives/Button';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_button-labels.js';

const content = await loadGuideline('button-labels.md', new URL('../../guidelines/button-labels.md', import.meta.url));

const Row = ({ children }: { children: ReactNode }) => <div className="gl-stage gl-stage--row">{children}</div>;

// No destructive action here. A Delete drawn as an ordinary secondary teaches
// the accent hover that guidelines/destructive-actions.md forbids, and this page
// is about words, not colour.
const specimens = [
  { id: 'words-first',
    do: () => <Row><Button>Export</Button><Button>Rename</Button><Button>Share</Button></Row>,
    dont: () => <Row><Button icon="download" iconOnly>Export</Button><Button icon="edit" iconOnly>Rename</Button>
      <Button icon="share" iconOnly>Share</Button></Row> },
  { id: 'glyph-repeats-the-verb',
    do: () => <Row><Button icon="download">Export CSV</Button><Button icon="copy">Duplicate</Button></Row>,
    dont: () => <Row><Button icon="table">Export CSV</Button><Button>Duplicate</Button></Row> },
  // The funnel is the question #565 came from, so it is drawn on both halves: with
  // its word here, and wordless beside a cog that gave its own up.
  { id: 'wordless-earns-it',
    do: () => <Row><Button icon="filter">Filter</Button><Button icon="moreHorizontal" iconOnly>More actions</Button></Row>,
    dont: () => <Row><Button icon="filter" iconOnly>Filter</Button><Button icon="gear" iconOnly>Settings</Button></Row> },
];

const meta: Meta = { title: 'Guidelines/Button labels', parameters: { layout: 'fullscreen' } };
export default meta;

export const ButtonLabels: StoryObj = {
  name: 'Button labels',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
