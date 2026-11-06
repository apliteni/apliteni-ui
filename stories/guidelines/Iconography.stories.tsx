// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, NoticePicture } from '../_guideline';
import { Button } from '../../react/src/primitives/Button';
import { Snippet } from '../../react/src/Snippet';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_iconography.js';

const content = await loadGuideline('iconography.md', new URL('../../guidelines/iconography.md', import.meta.url));

const Row = ({ children }: { children: ReactNode }) => <div className="gl-stage gl-stage--row">{children}</div>;

// The provenance and stroke don'ts are code: a redrawn path would ship a glyph the
// set does not own, and a thinner stroke rendered here fails the stroke floor.
const Code = ({ label, code }: { label: string; code: string }) => <Snippet label={label} code={code} copy={false} />;
const Success = () => <NoticePicture tone="success" title="Invoice sent" close={false} />;
const RECORD_DO = '// Lucide circle-check-big, renamed for what it depicts\ncircleCheck: \'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>\'';
const RECORD_DONT = 'circleCheck: \'<path d="M21 12a9 9 0 1 1-6-8.5"/><path d="M21 5l-9 9-3-3"/>\'';

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
  { id: 'provenance',
    do: () => <div className="gl-stage"><Success /><Code label="Glyph set" code={RECORD_DO} /></div>,
    dont: () => <Code label="Glyph set" code={RECORD_DONT} /> },
  { id: 'stroke-earns-the-bar',
    do: () => <div className="gl-stage"><Success /><Code label="Visible width" code={'16px × 2.25 ÷ 24 = 1.5 CSS px\nheld to 3:1'} /></div>,
    dont: () => <Code label="Visible width" code={'16px × 1.5 ÷ 24 = 1 CSS px\nstill held to 3:1'} /> },
];

const meta: Meta = { title: 'Guidelines/Iconography', parameters: { layout: 'fullscreen' } };
export default meta;

export const Iconography: StoryObj = {
  name: 'Iconography',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
