// DOM behavior only; Storybook captures cover the shared CSS and reduced motion.
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';

const items = [
  { value: 'overview', label: 'Overview', panel: <p>Account overview</p> },
  { value: 'activity', label: 'Activity', count: 0, panel: <p>Recent activity</p> },
  { value: 'settings', label: 'Settings', count: 12, panel: <p>Account settings</p> },
];
function Example() {
  const [value, onChange] = useState('overview');
  return <Tabs items={items} value={value} onChange={onChange} label="Account sections" />;
}

it('uses the vanilla classes and links tabs to focusable panels', () => {
  const { container } = render(<Example />);
  expect(container.firstChild).toHaveClass('ui-tabs');
  expect(screen.getByRole('tablist', { name: 'Account sections' })).toHaveClass('ui-tabs__list');
  const tabs = screen.getAllByRole('tab');
  const panels = screen.getAllByRole('tabpanel', { hidden: true });
  tabs.forEach((tab, i) => {
    expect(tab).toHaveClass('ui-tabs__tab');
    expect(tab).toHaveAttribute('aria-controls', panels[i].id);
    expect(panels[i]).toHaveAttribute('aria-labelledby', tab.id);
    expect(panels[i]).toHaveAttribute('tabindex', '0');
    expect(panels[i]).toHaveClass('ui-tabs__panel');
  });
  expect(screen.getByRole('tab', { name: 'Activity 0' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Settings 12' })).toBeInTheDocument();
  expect(screen.queryByText('Recent activity')).not.toBeInTheDocument();
  expect(screen.getByRole('tabpanel')).not.toHaveClass('is-entering');
});

it('requests changes without selecting until the host supplies the value', async () => {
  const onChange = vi.fn();
  const { rerender } = render(<Tabs items={items} value="overview" onChange={onChange} label="Account" />);
  await userEvent.click(screen.getByRole('tab', { name: 'Activity 0' }));
  expect(onChange).toHaveBeenCalledWith('activity');
  expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  rerender(<Tabs items={items} value="activity" onChange={onChange} label="Account" />);
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Recent activity');
  expect(screen.queryByText('Account overview')).not.toBeInTheDocument();
  expect(screen.getByRole('tabpanel')).toHaveClass('is-entering');
  fireEvent.animationEnd(screen.getByRole('tabpanel'));
  expect(screen.getByRole('tabpanel')).not.toHaveClass('is-entering');
});

describe('keyboard', () => {
  it('activates neighbours, wraps, and supports Home and End', async () => {
    render(<Example />);
    const user = userEvent.setup();
    await user.tab();
    const check = (name: string) => {
      const active = screen.getByRole('tab', { name });
      expect(active).toHaveFocus();
      expect(active).toHaveAttribute('aria-selected', 'true');
      expect(screen.getAllByRole('tab').filter(tab => tab.tabIndex === 0)).toEqual([active]);
    };
    check('Overview');
    await user.keyboard('{ArrowLeft}'); check('Settings 12');
    await user.keyboard('{ArrowRight}'); check('Overview');
    await user.keyboard('{ArrowRight}'); check('Activity 0');
    await user.keyboard('{End}'); check('Settings 12');
    await user.keyboard('{Home}'); check('Overview');
    await user.tab();
    expect(screen.getByRole('tabpanel')).toHaveFocus();
  });
});

it('gives multiple instances distinct ids', () => {
  const { container } = render(<><Example /><Example /></>);
  const ids = [...container.querySelectorAll('[id]')].map(el => el.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it('handles an empty list', () => {
  render(<Tabs items={[]} value="" onChange={() => {}} label="Account" />);
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
});
