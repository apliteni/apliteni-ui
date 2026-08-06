import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './primitives/Button';

const meta: Meta<typeof Modal> = { title: 'React/Modal', component: Modal };
export default meta;

export const Playground: StoryObj<typeof Modal> = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="primary" onClick={() => setOpen(true)}>Open</Button>
        <Modal open={open} title="New campaign" onClose={() => setOpen(false)}
          footer={<Button variant="primary" onClick={() => setOpen(false)}>Create</Button>}>
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="rx-modal-demo-name">Name</label>
            <input id="rx-modal-demo-name" className="ui-input" placeholder="e.g. Nutra — DE push" />
          </div>
        </Modal>
      </>
    );
  },
};
