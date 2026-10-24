// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, NoticePicture } from '../_guideline';
import { Button } from '../../react/src/primitives/Button';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_iconography.js';

const content = await loadGuideline('iconography.md', new URL('../../guidelines/iconography.md', import.meta.url));

const Row = ({ children }: { children: ReactNode }) => <div className="gl-stage gl-stage--row">{children}</div>;

// The do/don't pair for the closed list. Both halves are ordinary secondary
// buttons, so neither half is also a specimen of a contrast fault.
// The meaning pair's don't is the danger toast as it shipped before #199: the
// same bare `x` as both the status and the close.
const specimens = [
  { id: 'icon-only',
    do: () => <Row><Button icon="moreHorizontal" iconOnly>More actions</Button><Button icon="gear">Settings</Button></Row>,
    dont: () => <Row><Button icon="moreHorizontal" iconOnly>More actions</Button><Button icon="gear" iconOnly>Settings</Button></Row> },
  { id: 'meaning',
    do: () => <div className="gl-stage"><NoticePicture tone="danger" title="Upload failed" text="The file exceeded 25 MB." /></div>,
    dont: () => <div className="gl-stage"><NoticePicture tone="danger" glyph="x" title="Upload failed" text="The file exceeded 25 MB." /></div> },
  { id: 'provenance' },
  { id: 'stroke-earns-the-bar' },
];

const meta: Meta = { title: 'Guidelines/Iconography', parameters: { layout: 'fullscreen' } };
export default meta;

export const Iconography: StoryObj = {
  name: 'Iconography',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
