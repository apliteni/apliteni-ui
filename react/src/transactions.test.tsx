/* Rule: the Transactions showcase sorts Amount by its value, not by its printed text.
 * sortTableRows compares with < and >, so a column of formatted strings sorts by the
 * first character. The rows keep a number and the column formats it. #865 */
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import * as Transactions from '../../stories/apps/Transactions.stories.tsx';

const mount = (story: unknown) => {
  const Story = () => (story as { render: () => ReactElement }).render();
  const box = document.body.appendChild(document.createElement('div'));
  act(() => createRoot(box).render(<Story />));
  return box;
};

const euros = (text: string) => Number(text.replace('−', '-').replace(/[€,+]/g, ''));

describe('the Transactions amounts', () => {
  it('sort by value in both directions', () => {
    const box = mount(Transactions.Default);
    const header = [...box.querySelectorAll('th')].find((th) => th.textContent === 'Amount')!;
    const column = [...header.parentElement!.children].indexOf(header);
    const amounts = () => [...box.querySelectorAll('tbody tr')].map((tr) => euros(tr.children[column].textContent!));
    act(() => header.querySelector('button')!.click());
    expect(header.getAttribute('aria-sort')).toBe('descending');
    const down = amounts();
    expect(down.length, 'the table shows no rows').toBe(12);
    expect(down, 'descending Amount is not in value order').toEqual([...down].sort((a, b) => b - a));
    act(() => header.querySelector('button')!.click());
    expect(header.getAttribute('aria-sort')).toBe('ascending');
    expect(amounts(), 'ascending Amount is not in value order').toEqual([...down].reverse());
  });
});
