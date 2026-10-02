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
  parameters: { viewport: { options: {
    phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' },
  } } },
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

// Shortcuts against bounds: "This year" is clamped to what the bounds allow and
// "Previous year" is off, because the grid would refuse all of it cell by cell.
export const RangeBounded: StoryObj<typeof DatePicker> = {
  render: function RangeBoundedStory(args) {
    const [span, setSpan] = useState<DatePickerRange>({ start: '2026-06', end: '2026-08' });
    return (
      <DatePicker
        {...args}
        mode="range"
        label="Period:"
        range={span}
        onRangeChange={setSpan}
        presets={presets}
        min="2026-04"
        max="2026-09"
        defaultOpen
      />
    );
  },
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

// A period the host blocks inside a chosen range. It keeps neither the tint nor
// the words "in range": it cannot be picked, so it is not included. The story is
// here so the contrast gate measures the pair rather than inferring it.
export const RangeWithBlocked: StoryObj<typeof DatePicker> = {
  render: function RangeWithBlockedStory(args) {
    const [span, setSpan] = useState<DatePickerRange>({ start: '2026-04', end: '2026-08' });
    return (
      <DatePicker
        {...args}
        mode="range"
        label="Period:"
        range={span}
        onRangeChange={setSpan}
        disabledPeriods={['2026-06']}
        marks={marks}
        defaultOpen
      />
    );
  },
};

// Bounds written in the other grain. A day picker given whole months still
// honours them: September opens on the 1st, October closes on the 31st, and a
// month in `disabledPeriods` shuts every day in it.
export const DayBoundedByMonths: StoryObj<typeof DatePicker> = {
  render: args => (
    <DatePicker
      {...args}
      mode="day"
      label="Date:"
      defaultValue="2026-09-17"
      min="2026-09"
      max="2026-10"
      disabledPeriods={['2026-10']}
      defaultOpen
    />
  ),
};

// The host blocks the period its own value names — the bounds moved, or the
// month the reader chose has closed. Blocked wins the paint: the cell goes bare
// like any other blocked cell and keeps the pick as weight, rather than wearing
// the accent fill under disabled ink.
export const SelectedThenBlocked: StoryObj<typeof DatePicker> = {
  render: args => (
    <DatePicker
      {...args}
      mode="day"
      label="Date:"
      defaultValue="2026-09-17"
      disabledPeriods={['2026-09-17', '2026-09-18']}
      defaultOpen
    />
  ),
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

const dayPresets = [
  { label: 'This week', range: { start: '2026-09-14', end: '2026-09-20' } },
  { label: 'Last week', range: { start: '2026-09-07', end: '2026-09-13' } },
  { label: 'This month', range: { start: '2026-09-01', end: '2026-09-30' } },
];

// A range of days, the same two presses the month range takes: a start, then an
// end, with the days between them shown as the span.
export const DayRange: StoryObj<typeof DatePicker> = {
  render: function DayRangeStory(args) {
    const [span, setSpan] = useState<DatePickerRange>({ start: '2026-09-07', end: '2026-09-18' });
    return (
      <DatePicker
        {...args}
        mode="day-range"
        label="Dates:"
        range={span}
        onRangeChange={setSpan}
        presets={dayPresets}
        defaultOpen
      />
    );
  },
};

// A day range against bounds and blocked days: the span runs over a blocked day
// without taking it in, and a shortcut the bounds leave nothing of is off.
export const DayRangeBounded: StoryObj<typeof DatePicker> = {
  render: function DayRangeBoundedStory(args) {
    const [span, setSpan] = useState<DatePickerRange>({ start: '2026-09-07', end: '2026-09-18' });
    return (
      <DatePicker
        {...args}
        mode="day-range"
        label="Dates:"
        range={span}
        onRangeChange={setSpan}
        presets={dayPresets}
        min="2026-09-03"
        max="2026-09-25"
        disabledPeriods={['2026-09-12', '2026-09-13']}
        defaultOpen
      />
    );
  },
};

// No label and no ariaLabel: the trigger's own text is the control's only
// name, in every mode.
export const Unlabelled: StoryObj<typeof DatePicker> = {
  render: args => (
    <div style={{ display: 'grid', gap: 'var(--space-3)', justifyItems: 'start' }}>
      <DatePicker {...args} defaultValue="2026-08" />
      <DatePicker {...args} mode="day" defaultValue="2026-09-17" />
      <DatePicker {...args} mode="range" defaultRange={{ start: '2026-04', end: '2026-08' }} />
      <DatePicker {...args} mode="day-range" defaultRange={{ start: '2026-09-07', end: '2026-09-18' }} />
    </div>
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

// The phone layout: the panel is the kit's bottom drawer, so it arrives with a
// scrim, a close control and a focus trap, and the shortcuts sit above the grid.
// `sheet` is passed rather than left to the viewport so the gates that mount
// this story in JSDOM — which has no matchMedia — measure the sheet and not the
// popover.
export const Phone: StoryObj<typeof DatePicker> = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: function PhoneStory(args) {
    const [span, setSpan] = useState<DatePickerRange>({ start: '2026-04', end: '2026-08' });
    return (
      <DatePicker
        {...args}
        sheet
        mode="range"
        label="Period:"
        range={span}
        onRangeChange={setSpan}
        presets={presets}
        defaultOpen
      />
    );
  },
};

// The same sheet in day mode, where the grid is the taller of the two.
export const PhoneDay: StoryObj<typeof DatePicker> = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: args => <DatePicker {...args} sheet mode="day" label="Date:" defaultValue="2026-09-17" defaultOpen />,
};

// A day range in the sheet, with its shortcuts above the grid.
export const PhoneDayRange: StoryObj<typeof DatePicker> = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: function PhoneDayRangeStory(args) {
    const [span, setSpan] = useState<DatePickerRange>({ start: '2026-09-07', end: '2026-09-18' });
    return (
      <DatePicker {...args} sheet mode="day-range" label="Dates:" range={span}
        onRangeChange={setSpan} presets={dayPresets} defaultOpen />
    );
  },
};
