import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Notifications, bellName } from './Notifications';

// Interaction tests cover in-memory state. The panel's place and the phone width are a browser's to measure.
const bell = () => screen.getAllByRole('button', { name: /^Notifications/ })[0];
const panel = () => screen.getByRole('menu', { name: /^Notifications/ });

describe('notifications showcase', () => {
  it('names the count in the bell sentence and drops the badge at zero', () => {
    expect(bellName(3)).toBe('Notifications, 3 unread');
    expect(bellName(0)).toBe('Notifications');
    const { unmount } = render(<Notifications />);
    expect(bell()).toHaveAccessibleName('Notifications, 3 unread');
    expect(bell().querySelector('.ui-badge')).toHaveTextContent('3');
    unmount();
    render(<Notifications initialLoad="read" />);
    expect(bell()).toHaveAccessibleName('Notifications');
    expect(bell().querySelector('.ui-badge')).toBeNull();
  });
  it('opens the panel of links, and All notifications opens the page with the detail pane', async () => {
    const user = userEvent.setup();
    render(<Notifications />);
    await user.click(bell());
    expect(bell()).toHaveAttribute('aria-expanded', 'true');
    const rows = within(panel()).getAllByRole('menuitem').filter(row => row.tagName === 'A');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveAccessibleName(/Payout run PR-204 failed, unread/);
    await user.click(within(panel()).getByRole('menuitem', { name: 'All notifications' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Payout run PR-204 failed' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Report March totals is ready' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Report March totals is ready' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Report March totals is ready' })).toHaveAttribute('aria-current', 'true');
  });
  it('opens the page at the row picked in the panel', async () => {
    const user = userEvent.setup();
    render(<Notifications layout="top" defaultOpen />);
    await user.click(within(panel()).getByRole('menuitem', { name: /Jon Avery commented/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Jon Avery commented on Spring offer' })).toBeInTheDocument();
  });
  it('marks all read from the panel', async () => {
    const user = userEvent.setup();
    render(<Notifications defaultOpen />);
    await user.click(within(panel()).getByRole('menuitem', { name: 'Mark all read' }));
    expect(bell()).toHaveAccessibleName('Notifications');
  });
  // jsdom has no layout, so this checks which element has focus, not the ring. The built Storybook probe checks the ring.
  it.each([['the mouse', 'click'], ['Enter', 'enter']])('keeps focus in the panel after Mark all read and Retry with %s', async (_how, how) => {
    const user = userEvent.setup();
    const act = async (name: string) => {
      const item = within(panel()).getByRole('menuitem', { name });
      if (how === 'click') await user.click(item);
      else { item.focus(); await user.keyboard('{Enter}'); }
    };
    const firstRow = () => within(panel()).getAllByRole('menuitem').find(row => row.tagName === 'A');
    const { unmount } = render(<Notifications defaultOpen />);
    await act('Mark all read');
    expect(bell()).toHaveAttribute('aria-expanded', 'true');
    expect(firstRow()).toHaveFocus();
    expect(firstRow()).toHaveAccessibleName(/^Payout run PR-204 failed/);
    await user.keyboard('{ArrowDown}');
    expect(within(panel()).getByRole('menuitem', { name: /Mira Kade/ })).toHaveFocus();
    unmount();
    render(<Notifications defaultOpen initialLoad="error" />);
    await act('Retry');
    expect(bell()).toHaveAttribute('aria-expanded', 'true');
    expect(firstRow()).toHaveFocus();
  });
  it.each([['the mouse', 'click'], ['Enter', 'enter']])('keeps focus on the page after Mark all read and Retry with %s', async (_how, how) => {
    const user = userEvent.setup();
    const act = async (name: string) => {
      const button = within(screen.getByRole('main')).getByRole('button', { name });
      if (how === 'click') await user.click(button);
      else { button.focus(); await user.keyboard('{Enter}'); }
    };
    const firstRow = () => within(screen.getByRole('main')).getByRole('link', { name: /^Payout run PR-204 failed/ });
    const { unmount } = render(<Notifications initialPage="notifications" />);
    // The action sits in the title row of the list's card, above the list.
    const card = screen.getByRole('heading', { level: 2, name: 'All' }).closest('.ui-card') as HTMLElement;
    expect(within(card).getByRole('button', { name: 'Mark all read' })).toBeInTheDocument();
    expect(within(card).getByRole('table')).toBeInTheDocument();
    await act('Mark all read');
    expect(bell()).toHaveAccessibleName('Notifications');
    expect(firstRow()).toHaveFocus();
    unmount();
    render(<Notifications initialPage="notifications" initialLoad="error" />);
    await act('Retry');
    expect(firstRow()).toHaveFocus();
  });
  it('shows the error with Retry in the panel and on the page, and the empty state', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Notifications defaultOpen initialLoad="error" />);
    expect(within(panel()).getByText('Notifications did not load')).toBeInTheDocument();
    await user.click(within(panel()).getByRole('menuitem', { name: 'Retry' }));
    expect(bell()).toHaveAccessibleName('Notifications, 3 unread');
    unmount();
    const page = render(<Notifications initialPage="notifications" initialLoad="error" />);
    expect(within(screen.getByRole('main')).getByRole('alert')).toHaveTextContent('Check the connection, then try again.');
    page.unmount();
    render(<Notifications initialPage="notifications" initialLoad="empty" />);
    expect(within(screen.getByRole('main')).getByText('No notifications')).toBeInTheDocument();
  });
});
