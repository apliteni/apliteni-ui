// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Button } from '../../react/src/primitives/Button';
import { Dropdown } from '../../react/src/Dropdown';
import { SearchField } from '../../react/src/SearchField';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_button-labels.js';

const content = await loadGuideline('button-labels.md', new URL('../../guidelines/button-labels.md', import.meta.url));

// A made-up contract clause for the selection rule.
const CLAUSE_HEAD = 'Orders settle within ';
const CLAUSE_PICK = 'five business days';
const CLAUSE_TAIL = ' of the request, unless the bank holds the transfer for review.';

const Row = ({ children }: { children: ReactNode }) => <div className="gl-stage gl-stage--row">{children}</div>;

// One toolbar, drawn twice. The Don't squares the buttons with the corner they had before
// #823, and draws the field as the pill it was before #836. Both are the kit's toolbar, so
// the controls on a line share their edges and only the corners differ.
const STATUS = [{ label: 'Any status', value: 'any' }, { label: 'Paid', value: 'paid' }, { label: 'Failed', value: 'failed' }];
const noop = () => {};
const Toolbar = ({ square = false }: { square?: boolean }) => <div className={`gl-stage ui-toolbar${square ? ' bl-square' : ''}`}>
  <SearchField ariaLabel="Search orders" placeholder="Reference" />
  <Dropdown ariaLabel="Status" value="Paid" selectedValue="paid" items={STATUS} onOpenChange={noop} />
  <Button icon="download">Export CSV</Button>
  <Button icon="moreHorizontal" iconOnly>More actions</Button>
</div>;

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
  // The Don't holds the selection on a span with the kit's held-selection mark,
  // and its toolbar as a box in place, since a picture cannot hold a live selection.
  { id: 'no-action-on-selection',
    do: () => <div className="gl-stage gl-clause"><p>{CLAUSE_HEAD}{CLAUSE_PICK}{CLAUSE_TAIL}</p>
      <div className="gl-stage--row"><Button>Add note</Button></div></div>,
    dont: () => <div className="gl-stage gl-clause"><Row><Button size="sm">Add note</Button><Button size="sm">Copy</Button></Row>
      <p>{CLAUSE_HEAD}<span className="ui-fbmark">{CLAUSE_PICK}</span>{CLAUSE_TAIL}</p></div> },
  { id: 'one-shape', do: () => <Toolbar />, dont: () => <Toolbar square /> },
];

const meta: Meta = { title: 'Guidelines/Button labels', parameters: { layout: 'fullscreen' } };
export default meta;

export const ButtonLabels: StoryObj = {
  name: 'Button labels',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
