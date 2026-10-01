import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker, type DatePickerMark, type DatePickerRange } from './DatePicker';

// Demo data as of 15 September 2026, so every specimen renders the same grid
// whenever it is read.
const TODAY = '2026-09-15';

const meta: Meta<typeof DatePicker> = {
  title: 'React/Date picker', component: DatePicker, id: 'react-date-picker',
  // An open panel is absolutely positioned, so the canvas has to leave it room.
  decorators: [Story => <div style={{ minHeight: 360 }}><Story /></div>],
  args: { today: TODAY },
};
export default meta;

const marks: Record<string, DatePickerMark> = {
  '2026-06': { label: 'Restated', tone: 'warn' },
  '2026-09': { label: 'Estimate', tone: 'info' },
};

const presets = [
  { label: 'This month', range: { start: '2026-09', end: '2026-09' } },
  { label: 'Previous month', range: { start: '2026-08', end: '2026-08' } },
  { label: 'This year', range: { start: '2026-01', end: '2026-12' } },
  { label: 'Previous year', range: { start: '2025-01', end: '2025-12' } },
];

export const Month: StoryObj<typeof DatePicker> = {
  render: args => <DatePicker {...args} label="Month:" defaultValue="2026-08" />,
};

export const MonthOpen: StoryObj<typeof DatePicker> = {
  render: args => <DatePicker {...args} label="Month:" defaultValue="2026-08" defaultOpen />,
};

export const MonthWithMarks: StoryObj<typeof DatePicker> = {
  render: args => (
    <DatePicker {...args} label="Month:" defaultValue="2026-08" marks={marks} defaultOpen />
  ),
};

export const Bounded: StoryObj<typeof DatePicker> = {
  render: args => (
    <DatePicker
      {...args}
      label="Month:"
      defaultValue="2026-08"
      min="2026-03"
      max="2026-09"
      disabledPeriods={['2026-07']}
      defaultOpen
    />
  ),
};

export const Range: StoryObj<typeof DatePicker> = {
  render: function RangeStory(args) {
    const [span, setSpan] = useState<DatePickerRange>({ start: '2026-04', end: '2026-08' });
    return (
      <DatePicker
        {...args}
        mode="range"
        label="Period:"
        range={span}
        onRangeChange={setSpan}
        presets={presets}
        marks={marks}
        defaultOpen
      />
    );
  },
};

export const Day: StoryObj<typeof DatePicker> = {
  render: args => <DatePicker {...args} mode="day" label="Date:" defaultValue="2026-09-17" defaultOpen />,
};

export const DayBounded: StoryObj<typeof DatePicker> = {
  render: args => (
    <DatePicker
      {...args}
      mode="day"
      label="Date:"
      defaultValue="2026-09-17"
      min="2026-09-07"
      max="2026-09-25"
      disabledPeriods={['2026-09-19', '2026-09-20']}
      defaultOpen
    />
  ),
};

export const Empty: StoryObj<typeof DatePicker> = {
  render: args => <DatePicker {...args} ariaLabel="Reporting month" />,
};

// The pair, so the disabled trigger is read against the enabled one. The
// caption is in the story rather than a decorator, because the contrast gate
// calls render() and not the decorators around it, and a disabled control's own
// words are skipped by it.
export const Disabled: StoryObj<typeof DatePicker> = {
  render: args => (
    <div style={{ display: 'grid', gap: 'var(--space-3)', justifyItems: 'start' }}>
      <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>Enabled, then disabled.</p>
      <DatePicker {...args} label="Month:" defaultValue="2026-08" />
      <DatePicker {...args} label="Month:" defaultValue="2026-08" disabled />
    </div>
  ),
};

// Keyboard-only use, shown rather than described: the panel is open on the
// chosen month, and the keys that move the grid are listed beside it.
export const Keyboard: StoryObj<typeof DatePicker> = {
  render: args => (
    // Two columns, because the open panel floats over whatever is under it and
    // the keys have to stay readable beside the grid they describe.
    <div style={{ display: 'grid', gap: 'var(--space-6)', gridTemplateColumns: '300px minmax(0, 1fr)', alignItems: 'start' }}>
      <DatePicker {...args} label="Month:" defaultValue="2026-08" marks={marks} defaultOpen />
      <ul style={{ margin: 0, paddingInlineStart: 'var(--space-5)', fontSize: 'var(--text-sm)', display: 'grid', gap: 'var(--space-2)' }}>
        <li>Left and Right move one month; Up and Down move one row.</li>
        <li>Home and End go to the ends of the row.</li>
        <li>Page Up and Page Down change the year.</li>
        <li>Enter or Space picks; Esc closes and returns to the trigger.</li>
      </ul>
    </div>
  ),
};

// The phone layout, in a 390px column: the panel is a sheet on the bottom edge
// and the shortcuts sit above the grid.
export const Phone: StoryObj<typeof DatePicker> = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: function PhoneStory(args) {
    const [span, setSpan] = useState<DatePickerRange>({ start: '2026-04', end: '2026-08' });
    return (
      <div style={{ maxWidth: 390 }}>
        <DatePicker
          {...args}
          mode="range"
          label="Period:"
          range={span}
          onRangeChange={setSpan}
          presets={presets}
          defaultOpen
        />
      </div>
    );
  },
};
