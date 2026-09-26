import { useEffect, useRef, useState } from 'react';
import { Segmented } from './Segmented';
import { Button } from './primitives/Button';
import { Badge } from './primitives/Badge';

export default {
  title: 'Showcases/Period picker',
  id: 'showcases-period-picker',
  parameters: { layout: 'fullscreen' },
};

// Fictional reporting states supplied by the application, as of September 2026.
const months = [
  { value: '2026-04', short: 'Apr', name: 'April', status: 'Closed', tone: 'neutral' },
  { value: '2026-05', short: 'May', name: 'May', status: 'Closed', tone: 'neutral' },
  { value: '2026-06', short: 'Jun', name: 'June', status: 'Restated', tone: 'info' },
  { value: '2026-07', short: 'Jul', name: 'July', status: 'Closed', tone: 'neutral' },
  { value: '2026-08', short: 'Aug', name: 'August', status: 'Complete but not closed', tone: 'success' },
  { value: '2026-09', short: 'Sep', name: 'September', status: 'Incomplete', tone: 'warn' },
];
const options = months.map(month => ({ value: month.value, label: `${month.short} 2026 · ${month.status}` }));

function Example() {
  const [value, setValue] = useState(() => {
    const query = new URLSearchParams(window.location.search).get('period');
    return months.some(month => month.value === query) ? query! : '2026-09';
  });
  const root = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'dark');
  useEffect(() => {
    const previous = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = theme;
    return () => {
      if (previous) document.documentElement.dataset.theme = previous;
      else delete document.documentElement.dataset.theme;
    };
  }, [theme]);
  const index = months.findIndex(month => month.value === value);
  const selected = months[index];
  const choose = (next: string) => {
    setValue(next);
    const url = new URL(window.location.href);
    url.searchParams.set('period', next);
    window.history.replaceState(null, '', url);
  };
  useEffect(() => {
    root.current?.querySelectorAll('[aria-label="Choose a month"] .is-active').forEach(button => {
      const strip = button.parentElement?.parentElement;
      if (!strip) return;
      const box = button.getBoundingClientRect();
      const viewport = strip.getBoundingClientRect();
      if (box.left < viewport.left) strip.scrollLeft -= viewport.left - box.left;
      if (box.right > viewport.right) strip.scrollLeft += box.right - viewport.right;
    });
  }, [value]);

  return <main ref={root} style={{ padding: 'var(--space-6)' }}>
      <Segmented label="Theme" value={theme} onChange={setTheme}
        options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      <h1>Reporting period</h1>
      <p>Demo periods · April–September 2026</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Button icon="chevronLeft" iconOnly disabled={index === 0}
          aria-label={index === 0 ? 'No earlier month' : `Previous month: ${months[index - 1].name} 2026`}
          onClick={() => choose(months[index - 1].value)} />
        <div style={{ minWidth: 0, overflowX: 'auto', whiteSpace: 'nowrap', padding: 'var(--space-1)' }}>
          <Segmented label="Choose a month" options={options} value={value} onChange={choose} />
        </div>
        <Button icon="chevronRight" iconOnly disabled={index === months.length - 1}
          aria-label={index === months.length - 1 ? 'No later month' : `Next month: ${months[index + 1].name} 2026`}
          onClick={() => choose(months[index + 1].value)} />
      </div>
      <p role="status">{selected.name} 2026 <Badge variant={selected.tone}>{selected.status}</Badge></p>
  </main>;
}

export const Default = { render: () => <Example /> };
