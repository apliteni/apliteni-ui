import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Notifications } from './Notifications';

/* Every bell the page draws: the rail head, the phone band and the menu's head. jsdom applies
 * no CSS, so this reads the markup, not which bell shows at a width. */
const bells = () => [...document.querySelectorAll<HTMLAnchorElement>('a.notifications__bell')];

describe('Notifications showcase', () => {
  it('names the bell with its unread count and draws the count beside it', () => {
    render(<Notifications scene="list" />);
    expect(bells().length).toBeGreaterThan(0);
    for (const bell of bells()) {
      expect(bell).toHaveAccessibleName('Notifications, 6 unread');
      expect(bell).toHaveAttribute('aria-current', 'page');
      expect(bell.querySelector('.ui-nav__badge')).toHaveTextContent('6');
    }
  });

  it('marks no section current on the Notifications page, only the bell', () => {
    render(<Notifications scene="list" />);
    expect(document.querySelectorAll('[aria-current]:not(.notifications__bell)')).toHaveLength(0);
  });

  it('draws no count at zero and keeps the count’s room, so the bell does not move', () => {
    render(<Notifications scene="zero" />);
    for (const bell of bells()) {
      expect(bell).toHaveAccessibleName('Notifications');
      expect(bell).not.toHaveAttribute('aria-current');
      expect(bell.querySelector('.ui-nav__badge')).toBeNull();
      expect(bell).toHaveClass('notifications__bell--zero');
    }
  });

  it('lists each notification with its glyph, a title link and its full time', () => {
    render(<Notifications scene="list" />);
    const rows = within(screen.getByRole('table', { name: 'Notifications' })).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    const first = within(rows[0]);
    expect(first.getByRole('link', { name: 'Invoice INV-2041 is paid' })).toHaveAttribute('href', '#invoices/2041');
    expect(rows[0].querySelector('.notifications__note svg')).not.toBeNull();
    expect(rows[0].querySelector('time')).toHaveAttribute('dateTime', '2026-11-10T13:06');
  });

  it('shows the empty state with no table when nothing is there', () => {
    render(<Notifications scene="empty" />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Nothing needs you yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Overview' })).toHaveAttribute('href', '/overview');
  });

  it('loads the list again when Retry is pressed after a failed load', async () => {
    const user = userEvent.setup();
    render(<Notifications scene="error" />);
    expect(screen.getByText(/Notifications did not load/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByText(/Notifications did not load/)).toBeNull();
    expect(screen.getByRole('table', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('stands the phone band bell before Menu, and only in a shell with sections', () => {
    const { unmount } = render(<Notifications scene="overview" />);
    const slot = document.querySelector('.notifications__bar-bell');
    expect(slot?.nextElementSibling).toHaveClass('ui-app__menu');
    expect(slot?.querySelector('a.notifications__bell')).not.toBeNull();
    unmount();
    expect(document.querySelector('.notifications__bar-bell')).toBeNull();
    render(<Notifications scene="band" />);
    expect(document.querySelector('.notifications__bar-bell')).toBeNull();
  });
});
