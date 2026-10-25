// The numbered strip's rules, held against the React <Pagination> itself. They were
// written for the vanilla pagination() (#429 moves them here): 1 and the last page are
// always there, the current page brings a neighbour each side, and a run that is cut
// leaves one gap, unless the run is a single page, which is drawn instead.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Pagination } from './Pagination';

afterEach(cleanup);

/** The slots the strip shows for (page, pageCount), `…` for a gap. */
function numbered(page: number, pageCount: number): (number | '…')[] {
  const { container, unmount } = render(<Pagination variant="numbered" page={page} pageSize={10} total={pageCount * 10} />);
  const slots = [...container.querySelectorAll('.ui-pager__page, .ui-pager__gap')]
    .map((el) => (el.classList.contains('ui-pager__gap') ? '…' as const : Number(el.textContent)));
  unmount();
  return slots;
}

// Written out by hand from the rules rather than generated. Two pages is where the
// table starts: one page draws no strip at all.
const TRUNCATION: [number, number, (number | '…')[]][] = [
  [1, 2, [1, 2]],
  [1, 4, [1, 2, 3, 4]],
  [1, 5, [1, 2, '…', 5]],
  [3, 5, [1, 2, 3, 4, 5]],
  [3, 9, [1, 2, 3, 4, '…', 9]],
  [4, 9, [1, 2, 3, 4, 5, '…', 9]],
  [5, 9, [1, '…', 4, 5, 6, '…', 9]],
  [6, 9, [1, '…', 5, 6, 7, 8, 9]],
  [7, 9, [1, '…', 6, 7, 8, 9]],
  [9, 9, [1, '…', 8, 9]],
  [2, 100, [1, 2, 3, '…', 100]],
  [50, 100, [1, '…', 49, 50, 51, '…', 100]],
  [99, 100, [1, '…', 98, 99, 100]],
  [100, 100, [1, '…', 99, 100]],
];

describe('the numbered strip', () => {
  it.each(TRUNCATION)('page %i of %i', (page, pageCount, expected) => {
    expect(numbered(page, pageCount)).toEqual(expected);
  });

  it('draws no more than seven slots, anywhere', () => {
    for (let pageCount = 2; pageCount <= 40; pageCount += 1) {
      for (let page = 1; page <= pageCount; page += 1) {
        const got = numbered(page, pageCount);
        expect(got.length, `page ${page} of ${pageCount}: ${got.join(' ')}`).toBeLessThanOrEqual(7);
      }
    }
  });

  it('never draws two gaps together, nor a gap hiding one page', () => {
    for (let pageCount = 2; pageCount <= 40; pageCount += 1) {
      for (let page = 1; page <= pageCount; page += 1) {
        const got = numbered(page, pageCount);
        const where = `page ${page} of ${pageCount}: ${got.join(' ')}`;
        expect(got[0], `${where}: the first page is always a slot`).toBe(1);
        expect(got[got.length - 1], `${where}: the last page is always a slot`).toBe(pageCount);
        expect(got, `${where}: the current page is always a slot`).toContain(page);
        got.forEach((slot, i) => {
          if (slot !== '…') return;
          const [before, after] = [got[i - 1], got[i + 1]];
          expect(after, `${where}: two gaps side by side`).not.toBe('…');
          expect(typeof before === 'number' && typeof after === 'number' && after - before > 2,
            `${where}: a gap standing in for one page; draw the page`).toBe(true);
        });
      }
    }
  });

  it('marks the current page once, and draws no First or Last', () => {
    const { container } = render(<Pagination variant="numbered" page={5} pageSize={10} total={90} />);
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(container.querySelector('.ui-pager__page.is-current')?.textContent).toBe('5');
    const labels = [...container.querySelectorAll('.ui-pager__step')].map((el) => el.getAttribute('aria-label') ?? el.textContent);
    expect(labels.filter((l) => l === 'First' || l === 'Last')).toEqual([]);
  });
});
