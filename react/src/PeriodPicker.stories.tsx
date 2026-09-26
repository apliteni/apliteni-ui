import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { PeriodPicker, type PeriodMonth } from './PeriodPicker';

const meta: Meta = { title: 'React/PeriodPicker' };
export default meta;
const months: PeriodMonth[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => ({
  value: `2026-${String(index + 1).padStart(2, '0')}`,
  label: `${month} 2026`, shortLabel: month.slice(0, 3),
  state: index < 9 ? 'closed' : index === 9 ? 'restated' : index === 10 ? 'complete-not-closed' : 'incomplete',
}));

function Example({ initial = '2026-12', closedOnly = false, narrow = false }: { initial?: string; closedOnly?: boolean; narrow?: boolean }) {
  const visible = closedOnly ? months.filter(month => month.state === 'closed') : months;
  const read = () => {
    const requested = new URLSearchParams(window.location.search).get('month');
    return visible.some(month => month.value === requested) ? requested! : initial;
  };
  const [value, setValue] = useState(read);
  useEffect(() => {
    const restore = () => setValue(read());
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [initial, closedOnly]);
  return <div style={{ maxWidth: narrow ? 320 : '100%' }}>
    <PeriodPicker months={visible} value={value} onChange={next => {
      const url = new URL(window.location.href);
      url.searchParams.set('month', next);
      window.history.pushState(null, '', url);
      setValue(next);
    }} />
  </div>;
}
export const Incomplete: StoryObj = { render: () => <Example /> };
export const Closed: StoryObj = { render: () => <Example initial="2026-01" /> };
export const Restated: StoryObj = { render: () => <Example initial="2026-10" /> };
export const CompleteNotClosed: StoryObj = { render: () => <Example initial="2026-11" /> };
export const ClosedOnly: StoryObj = { render: () => <Example initial="2026-09" closedOnly /> };
export const Keyboard: StoryObj = { render: () => <><p>Tab to a month, then use Left, Right, Home or End.</p><Example initial="2026-06" narrow /></> };
