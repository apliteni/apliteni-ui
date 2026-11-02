// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, NoticePicture, Raw } from '../_guideline';
import { icon } from '@apliteni/apliteni-ui';
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
// The kit's glyph beside its Lucide source. The don't redraws the path: a closed
// ring with the check inside it, which no Lucide name records.
const REDRAWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
  + 'stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>';
const Source = ({ kit, lucide }: { kit: string; lucide: string }) => <Row>
  <div className="gl-glyph"><Raw html={kit} /><span className="gl-glyph__t">kit circleCheck</span></div>
  <div className="gl-glyph"><Raw html={icon('circleCheck')} /><span className="gl-glyph__t">{lucide}</span></div>
</Row>;

// The same status glyph at its 16px size and drawn three times larger, so the
// stem is visible. The stroke-width scales with the box, so the ratio holds.
// The width sits in the markup, where the glyph-stroke gate reads it.
const Stroke = ({ width, note }: { width: number; note: string }) => {
  const glyph = icon('circleCheck').replace('stroke-width="1.7"', `stroke-width="${width}"`);
  return <div className="gl-stage">
    <div className={width < 2.25 ? 'gl-stroke gl-stroke--thin' : 'gl-stroke'}>
      <Raw html={glyph} /><span className="gl-stroke__big"><Raw html={glyph} /></span>
    </div>
    <span className="gl-glyph__t">{note}</span>
  </div>;
};

const specimens = [
  { id: 'icon-only',
    do: () => <Row><Button icon="moreHorizontal" iconOnly>More actions</Button><Button icon="gear">Settings</Button></Row>,
    dont: () => <Row><Button icon="moreHorizontal" iconOnly>More actions</Button><Button icon="gear" iconOnly>Settings</Button></Row> },
  { id: 'meaning',
    do: () => <div className="gl-stage"><NoticePicture tone="danger" title="Upload failed" text="The file exceeded 25 MB." /></div>,
    dont: () => <div className="gl-stage"><NoticePicture tone="danger" glyph="x" title="Upload failed" text="The file exceeded 25 MB." /></div> },
  { id: 'provenance',
    do: () => <Source kit={icon('circleCheck')} lucide="Lucide circle-check-big" />,
    dont: () => <Source kit={REDRAWN} lucide="Lucide circle-check-big" /> },
  { id: 'stroke-earns-the-bar',
    do: () => <Stroke width={2.25} note="2.25 × 16 ÷ 24 = 1.5 CSS px" />,
    dont: () => <Stroke width={1.7} note="1.7 × 16 ÷ 24 = 1.13 CSS px" /> },
];

const meta: Meta = { title: 'Guidelines/Iconography', parameters: { layout: 'fullscreen' } };
export default meta;

export const Iconography: StoryObj = {
  name: 'Iconography',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
