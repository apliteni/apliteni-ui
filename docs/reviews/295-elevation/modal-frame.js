// The kit's REACT modal, mounted into the variants prototype so the elevation
// screenshots show the real component and its real stylesheet — not a hand-made
// copy of its markup. createElement rather than JSX so this file needs no
// transform beyond the one Vite already gives the .tsx it imports.
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal } from '../../../react/src/Modal';
import { Button } from '../../../react/src/primitives/Button';

export function mount() {
  const host = document.getElementById('react-modal');
  createRoot(host).render(
    h(Modal, {
      open: true,
      title: 'Change plan',
      onClose: () => {},
      footer: [
        h(Button, { key: 'cancel', variant: 'secondary', size: 'sm' }, 'Cancel'),
        h(Button, { key: 'ok', variant: 'primary', size: 'sm' }, 'Change plan'),
      ],
    }, h('p', { style: { margin: 0, color: 'var(--text)', fontSize: 'var(--text-base)' } },
      'This workspace moves to Team at the start of the next period. Seats already in use stay.')),
  );
  // The panel's enter transition is a frame away; the screenshot waits for it.
  return new Promise((done) => setTimeout(done, 400));
}
