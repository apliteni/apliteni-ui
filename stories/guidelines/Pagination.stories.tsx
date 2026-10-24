// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@apliteni/apliteni-ui';
import { GuidelinePage } from '../_guideline';
import { Pagination as KitPagination, type PaginationProps } from '../../react/src/Pagination';
import { Skeleton } from '../../react/src/Loading';
import { Button } from '../../react/src/primitives/Button';
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

// The don'ts are rows of real kit buttons, assembled by hand, which is the fault
// they are specimens of: a page built its own pager out of parts.
const Hand = ({ status, children }: { status: string; children: ReactNode }) => <Stage>
  <div className="gp-hand"><p className="gp-hand__status">{status}</p><div className="gp-hand__steps">{children}</div></div>
</Stage>;
const Ghost = (props: Parameters<typeof Button>[0]) => <Button variant="ghost" size="sm" {...props} />;

const specimens = [
  { id: 'counted-total', do: () => <Pager id="counted-do" />, dont: () => <Pager id="counted-dont" total={null} hasMore /> },
  { id: 'the-jump', do: () => <Pager id="jump-do" />, dont: () => <Pager id="jump-dont" variant="numbered" /> },
  { id: 'ends-disable', do: () => <Pager id="ends-do" page={1} />,
    dont: () => <Hand status="1–100 of 4,812"><Ghost>First</Ghost><Ghost iconRight="chevronRight">Next</Ghost><Ghost>Last</Ghost></Hand> },
  { id: 'one-page',
    do: () => <Stage><KitPagination id="single-do" label="Rows per page" page={1} pageSize={DEFAULT_PAGE_SIZE} total={12} pageSizes={PAGE_SIZES} /></Stage>,
    dont: () => <Hand status="Page 1 of 1 · 12 rows">
      <Ghost icon="chevronLeft" disabled>Prev</Ghost><Ghost iconRight="chevronRight" disabled>Next</Ghost></Hand> },
  { id: 'page-turn', do: () => <Pager id="loading-do" pageSizes={PAGE_SIZES} loading />,
    dont: () => <Stage><Skeleton lines={1} width="38%" /></Stage> },
  { id: 'announce-range' },
  { id: 'page-size', do: () => <Pager id="size-do" pageSizes={PAGE_SIZES} />, dont: () => <Pager id="size-dont" /> },
];

const meta: Meta = { title: 'Guidelines/Pagination', parameters: { layout: 'fullscreen' } };
export default meta;

export const Pagination: StoryObj = {
  name: 'Pagination',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
