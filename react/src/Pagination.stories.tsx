import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Pagination } from './Pagination';
import { PAGE_SIZES, DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';

const meta: Meta = { title: 'React/Pagination' };
export default meta;

const TOTAL = 4812;

/** The strip as a consumer wires it: the page and the size are the owner's state. */
function Pager(props: { variant?: 'steps' | 'numbered' | 'jump'; sizes?: number[] | null; loading?: boolean }) {
  const [page, setPage] = useState(24);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  return (
    <Pagination page={page} pageSize={size} total={TOTAL} variant={props.variant}
      pageSizes={props.sizes ?? null} loading={props.loading}
      onPageChange={setPage}
      onPageSizeChange={(next) => { setSize(next); setPage(1); }} />
  );
}

// steps is the default: the three variants are all here, and only the default is settled.
export const Steps: StoryObj = { render: () => <Pager sizes={PAGE_SIZES} /> };
export const Numbered: StoryObj = { render: () => <Pager variant="numbered" /> };
export const Jump: StoryObj = { render: () => <Pager variant="jump" sizes={PAGE_SIZES} /> };

export const UnknownTotal: StoryObj = {
  render: function Render() {
    // An API that cannot count what it has not fetched: Prev and Next, and no
    // control claiming a last page.
    const [page, setPage] = useState(3);
    return <Pagination page={page} total={null} hasMore={page < 5} onPageChange={setPage} />;
  },
};

export const Loading: StoryObj = { render: () => <Pager sizes={PAGE_SIZES} loading /> };

export const SinglePage: StoryObj = {
  render: () => (
    // One page of content keeps its row count and the size control, and nothing
    // else. Offered no size, this renders nothing at all.
    <Pagination page={1} pageSize={100} total={12} pageSizes={PAGE_SIZES}
      onPageSizeChange={() => {}} />
  ),
};
