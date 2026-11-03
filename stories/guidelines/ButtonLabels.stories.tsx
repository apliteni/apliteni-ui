// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactElement, ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Button } from '../../react/src/primitives/Button';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_button-labels.js';

const content = await loadGuideline('button-labels.md', new URL('../../guidelines/button-labels.md', import.meta.url));

// A made-up contract clause for the selection rule.
const CLAUSE_HEAD = 'Payouts settle within ';
const CLAUSE_PICK = 'five business days';
const CLAUSE_TAIL = ' of the request, unless the bank holds the transfer for review.';

// One wordless button of the closed list, with the name it reads out beside it.
const Named = ({ children }: { children: ReactElement<{ children: string }> }) =>
  <li>{children}<span aria-hidden="true">{children.props.children}</span></li>;

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
  // The Do draws the closed list itself: each wordless button with the name it
  // reads out, export as Export rows and download as Download PDF. The funnel is
  // the question #565 came from, so the Don't draws it wordless beside a cog.
  // Two owner decisions sit outside the list. #729 chose a glyph-only React
  // AppShell search trigger below 560px for one light icon row, and its sentence
  // stays the accessible name because phones have no hover title. #742 asked for
  // an icon-only Chart and Table switch.
  { id: 'wordless-earns-it',
    do: () => <div className="gl-stage"><ul className="gl-glyphs" aria-label="The closed list">
      <Named><Button icon="x" iconOnly>Close</Button></Named>
      <Named><Button icon="copy" iconOnly>Copy</Button></Named>
      <Named><Button icon="moreHorizontal" iconOnly>More actions</Button></Named>
      <Named><Button icon="chevronDown" iconOnly>Expand</Button></Named>
      <Named><Button icon="chevronUp" iconOnly>Collapse</Button></Named>
      <Named><Button icon="download" iconOnly>Export rows</Button></Named>
      <Named><Button icon="download" iconOnly>Download PDF</Button></Named>
    </ul></div>,
    dont: () => <Row><Button icon="filter" iconOnly>Filter</Button><Button icon="gear" iconOnly>Settings</Button></Row> },
  // A Do only: the Don't audit removed the selection toolbar (#768).
  { id: 'no-action-on-selection',
    do: () => <div className="gl-stage gl-clause"><p>{CLAUSE_HEAD}{CLAUSE_PICK}{CLAUSE_TAIL}</p>
      <div className="gl-stage--row"><Button>Add note</Button></div></div> },
];

const meta: Meta = { title: 'Guidelines/Button labels', parameters: { layout: 'fullscreen' } };
export default meta;

export const ButtonLabels: StoryObj = {
  name: 'Button labels',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
