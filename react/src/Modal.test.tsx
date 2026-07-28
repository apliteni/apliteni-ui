import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

it('renders nothing when closed', () => {
  const { container } = render(<Modal open={false} title="X" onClose={() => {}} />);
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});

it('closes on Escape', async () => {
  let closed = 0;
  render(<Modal open title="New campaign" onClose={() => { closed++; }}>body</Modal>);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
  expect(closed).toBe(1);
});
