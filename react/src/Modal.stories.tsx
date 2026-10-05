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
          {/* The one textarea in the React catalogue: without it the touch-zoom
              gate next door covers only two of the net's three element kinds,
              and react/src/field-zoom.test.tsx pins that it stays.
              why: docs/foundations.md#a-field-is-16px-on-a-touch-screen */}
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="rx-modal-demo-notes">Notes</label>
            <textarea id="rx-modal-demo-notes" className="ui-textarea" rows={3}
              placeholder="What this campaign is for" />
          </div>
        </Modal>
      </>
    );
  },
};

// The shape #262 was reported on: the body's fields are folded inside a closed
// <details>, so the field a dialog would reach for first is one focus cannot reach.
export const CollapsedForm: StoryObj<typeof Modal> = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="primary" onClick={() => setOpen(true)}>Open</Button>
        <Modal open={open} title="Item settings" onClose={() => setOpen(false)}
          footer={<Button variant="primary" onClick={() => setOpen(false)}>Save</Button>}>
          <a className="ui-focusable" href="#full">Open full page</a>
          <details>
            <summary className="ui-focusable">Advanced options</summary>
            <div className="ui-field">
              <label className="ui-field__label" htmlFor="rx-modal-demo-channel">Channel</label>
              <select id="rx-modal-demo-channel" className="ui-select">
                <option>Email</option>
                <option>SMS</option>
              </select>
            </div>
          </details>
        </Modal>
      </>
    );
  },
};

// The shape #531 was reported on: a body of prose and nothing focusable in it. A
// browser makes an overflowing box a keyboard stop with no `tabindex` and no author
// rule, so this body IS one — and until #531 it answered with the browser's own
// outline, black in both themes. The ring is painted on the modal, because the body
// is flush with the panel's sides, the panel clips with `overflow: hidden`, and the
// body has no radius of its own. why: docs/foundations.md#the-focus-ring
export const LongNotice: StoryObj<typeof Modal> = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="primary" onClick={() => setOpen(true)}>Open</Button>
        <Modal open={open} title="Before you continue" onClose={() => setOpen(false)}
          footer={<Button variant="primary" onClick={() => setOpen(false)}>I understand</Button>}>
          {Array.from({ length: 14 }, (_, i) => (
            <p key={i} style={{ margin: 0 }}>
              Line {i + 1} of the notice: a plain sentence of prose, which is what makes
              this body a scroll container and nothing inside it a keyboard target.
            </p>
          ))}
        </Modal>
      </>
    );
  },
};
