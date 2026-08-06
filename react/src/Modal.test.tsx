import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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

it('focuses the first field in the body on open, not the header Close button', async () => {
  render(
    <Modal open title="New campaign" onClose={() => {}}>
      <input aria-label="Name" />
    </Modal>,
  );
  await waitFor(() => {
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });
});

// A dialog that lets Tab wander into the page behind it is a dialog only in looks.
it('traps Tab inside the panel, wrapping both ways', async () => {
  render(
    <Modal open title="New campaign" onClose={() => {}}
      footer={<button type="button">Create</button>}>
      <input aria-label="Name" />
    </Modal>,
  );
  const close = screen.getByRole('button', { name: 'Close' });
  const create = screen.getByRole('button', { name: 'Create' });
  create.focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(close);
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(create);
});

it('hides the page behind it and gives focus back to the opener on close', async () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Open</button>
        <Modal open={open} title="New campaign" onClose={() => setOpen(false)}>
          <input aria-label="Name" />
        </Modal>
      </>
    );
  }
  const { container } = render(<Harness />);
  const opener = screen.getByRole('button', { name: 'Open' });
  opener.focus();
  await userEvent.click(opener);
  await waitFor(() => expect(container).toHaveAttribute('inert'));

  await userEvent.keyboard('{Escape}');
  await waitFor(() => {
    expect(container).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(opener);
  });
});
