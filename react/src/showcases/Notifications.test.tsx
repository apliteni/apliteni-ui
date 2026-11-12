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
  it('opens the panel of links, and a row opens its record, marks it read and links back to its section', async () => {
    const user = userEvent.setup();
    render(<Notifications />);
    await user.click(bell());
    expect(bell()).toHaveAttribute('aria-expanded', 'true');
    const rows = within(panel()).getAllByRole('menuitem').filter(row => row.tagName === 'A');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveAccessibleName(/Payout run PR-204 failed, unread/);
    await user.click(rows[0]);
    expect(screen.getByRole('heading', { level: 1, name: 'Payout run PR-204' })).toBeInTheDocument();
    expect(bell()).toHaveAccessibleName('Notifications, 2 unread');
    await user.click(screen.getByRole('link', { name: 'Back to Payouts' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Payouts' })).toBeInTheDocument();
  });
  it('opens a record from a row of the page', async () => {
    const user = userEvent.setup();
    render(<Notifications layout="top" defaultOpen />);
    await user.click(within(panel()).getByRole('menuitem', { name: 'All notifications' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /^Jon Avery commented/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Spring offer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Campaigns' })).toBeInTheDocument();
  });
  it('says Mark all read in a toast, and its Undo restores the unread set', async () => {
    const user = userEvent.setup();
    render(<Notifications initialPage="record" />);
    await user.click(screen.getByRole('link', { name: 'Back to Payouts' }));
    await user.click(screen.getByRole('link', { name: 'Campaigns' }));
    await user.click(bell());
    await user.click(within(panel()).getByRole('menuitem', { name: 'Mark all read' }));
    expect(bell()).toHaveAccessibleName('Notifications');
    expect(screen.getByText('2 notifications marked read')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(bell()).toHaveAccessibleName('Notifications, 2 unread');
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
    // The action sits in the page's title row, beside the h1 and above the list.
    const row = screen.getByRole('heading', { level: 1, name: 'Notifications' }).closest('.ui-app__title-row') as HTMLElement;
    expect(within(row).getByRole('button', { name: 'Mark all read' })).toBeInTheDocument();
    await act('Mark all read');
    expect(bell()).toHaveAccessibleName('Notifications');
    expect(firstRow()).toHaveFocus();
    unmount();
    render(<Notifications initialPage="notifications" initialLoad="error" />);
    await act('Retry');
    expect(firstRow()).toHaveFocus();
  });
  it('shows the error with Retry in the panel and on the page, the empty state and the loading state', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Notifications defaultOpen initialLoad="error" />);
    expect(within(panel()).getByText('Notifications did not load')).toBeInTheDocument();
    await user.click(within(panel()).getByRole('menuitem', { name: 'Retry' }));
    expect(bell()).toHaveAccessibleName('Notifications, 3 unread');
    unmount();
    const page = render(<Notifications initialPage="notifications" initialLoad="error" />);
    expect(within(screen.getByRole('main')).getByRole('alert')).toHaveTextContent('Check the connection, then try again.');
    page.unmount();
    const empty = render(<Notifications initialPage="notifications" initialLoad="empty" />);
    expect(within(screen.getByRole('main')).getByText('No notifications')).toBeInTheDocument();
    empty.unmount();
    render(<Notifications initialPage="notifications" initialLoad="loading" />);
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(bell()).toHaveAccessibleName('Notifications');
  });
});
