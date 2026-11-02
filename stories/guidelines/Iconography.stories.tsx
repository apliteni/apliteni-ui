// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage, NoticePicture, Raw } from '../_guideline';
import { icon } from '@apliteni/apliteni-ui';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_iconography.js';

const content = await loadGuideline('iconography.md', new URL('../../guidelines/iconography.md', import.meta.url));

// The meaning pair's don't is the danger toast as it shipped before #199: the
// same bare `x` as both the status and the close.
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
  { id: 'meaning',
    do: () => <div className="gl-stage"><NoticePicture tone="danger" title="Upload failed" text="The file exceeded 25 MB." /></div>,
    dont: () => <div className="gl-stage"><NoticePicture tone="danger" glyph="x" title="Upload failed" text="The file exceeded 25 MB." /></div> },
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
