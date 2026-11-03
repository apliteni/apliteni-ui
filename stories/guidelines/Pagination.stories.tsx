// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@apliteni/apliteni-ui';
import { GuidelinePage, SaidPicture } from '../_guideline';
import { Pagination as KitPagination, type PaginationProps } from '../../react/src/Pagination';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_pagination.js';

const content = await loadGuideline('pagination.md', new URL('../../guidelines/pagination.md', import.meta.url));

// One result set, seen from one position, so every specimen on the page is the
// same 4,812 rows at the kit's default page size. A reader comparing two
// pictures should be comparing the pagers.
const TOTAL = 4812;
const AT = 25;

const Stage = ({ children }: { children: ReactNode }) => <div className="gp-stage">{children}</div>;

// Every specimen is its own <nav> on one page, so each needs an id of its own
// and a name of its own: two <label for> pointing at one id is a real defect.
const Pager = ({ id, ...props }: PaginationProps & { id: string }) => <Stage>
  <KitPagination id={id} label={`${id} example`} page={AT} pageSize={DEFAULT_PAGE_SIZE} total={TOTAL} {...props} />
</Stage>;

const specimens = [
  { id: 'counted-total', do: () => <Pager id="counted-do" /> },
  { id: 'the-jump', do: () => <Pager id="jump-do" /> },
  // The moment after Next moved page 25 to page 26, with the focus still on Next.
  { id: 'announce-range',
    do: () => <SaidPicture lines={['2,501–2,600 of 4,812']}>
      <Pager id="said-do" page={AT + 1} pageSizes={PAGE_SIZES} /></SaidPicture> },
  { id: 'page-size', do: () => <Pager id="size-do" pageSizes={PAGE_SIZES} />, dont: () => <Pager id="size-dont" /> },
];

const meta: Meta = { title: 'Guidelines/Pagination', parameters: { layout: 'fullscreen' } };
export default meta;

export const Pagination: StoryObj = {
  name: 'Pagination',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
