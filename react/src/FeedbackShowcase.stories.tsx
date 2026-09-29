import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useId, useRef, useState } from 'react';
import { Modal } from './Modal';
import { TextArea } from './Field';
import { Toast, useToast } from './Toast';
import { Button } from './primitives/Button';
import { Callout } from './primitives/Callout';
import { Card } from './primitives/Card';
import './FeedbackShowcase.css';

type Args = { withExcerpt?: boolean; fail?: boolean };

// The composer quotes one sentence of the page, so that sentence is written once.
const QUOTED = 'A tracking link appears here once the carrier scans the parcel.';

// Where the trigger sits. `--rx-toast-stack` is how far the toast stack reaches,
// published by the kit; one gap above it clears two notices as readily as one,
// where the fixed offset this replaces was tuned to the height of exactly one.
// It stays inline because the gap is the page's choice, and because a var() the
// token file does not declare must not enter a react/src stylesheet. The pill
// fades out while its dialog is open: two filled accent pills in one view is the
// competition `the-page: one-primary` warns about.
const trigger = {
  position: 'fixed', right: 'var(--space-4)',
  bottom: 'calc(var(--rx-toast-stack, 0px) + var(--space-4))',
  transition: 'bottom var(--dur-med) var(--ease), opacity var(--dur-med) var(--ease)',
} as const;

const meta = {
  title: 'Showcases/Feedback',
  id: 'showcases-feedback',
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'A feedback form composed from kit controls. Page context is sample data; sending is simulated. The application owns capture, positioning and delivery.' } },
  },
} satisfies Meta<Args>;
export default meta;

function FeedbackExample({ withExcerpt = true, fail = false }: Args) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'ready' | 'sending' | 'failed'>('ready');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pushToast = useToast();
  const formId = useId();

  useEffect(() => () => clearTimeout(timer.current), []);

  function close() {
    clearTimeout(timer.current);
    setOpen(false);
    setState('ready');
  }

  return (
    <>
      <main className="ui-app__main fbs-page">
        <Card>
          <h1>Order DEMO-1042</h1>
          <p className="fbs-lede">Packed on 27 September. The carrier has not collected it yet.</p>
          <section>
            <h2>Contents</h2>
            <p>A desk lamp and a notebook, in one box.</p>
          </section>
          <section>
            <h2>Delivery</h2>
            <p>The parcel will leave on the next weekday collection at 16:00.</p>
            <p>{QUOTED}</p>
          </section>
          <section>
            <h2>Payment</h2>
            <p>Paid in full on 26 September. The invoice was sent with the order confirmation.</p>
          </section>
        </Card>
      </main>
      <div style={{ ...trigger, opacity: open ? 0 : 1 }}>
        <Button variant="primary" icon="chat" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Feedback
        </Button>
      </div>
      <Modal open={open} title="Leave a note" onClose={close}
        footer={<>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId} busy={state === 'sending'}
            completionMessage={state === 'failed' ? '' : undefined} disabled={!note.trim()}>Send feedback</Button>
        </>}>
        <div className="fbs-chip">Delivery, on order DEMO-1042</div>
        {withExcerpt && <blockquote className="fbs-quote">{QUOTED}</blockquote>}
        <form id={formId} onSubmit={event => {
          event.preventDefault();
          if (!note.trim() || state === 'sending') return;
          setState('sending');
          timer.current = setTimeout(() => {
            if (fail) { setState('failed'); return; }
            close();
            setNote('');
            pushToast({ tone: 'success', title: 'Feedback sent' });
          }, 800);
        }}>
          <TextArea label="What went wrong, or what would help?"
            hint="Only this section and your note will be sent."
            placeholder="e.g. There is no way to change the delivery address from here." rows={4} value={note}
            readOnly={state === 'sending'} onChange={event => setNote(event.target.value)} />
        </form>
        {state === 'failed' && <div role="alert"><Callout icon="circleX">Could not send. Your note is still here; try again.</Callout></div>}
      </Modal>
    </>
  );
}

export const WithExcerpt: StoryObj = {
  render: () => <Toast><FeedbackExample /></Toast>,
};
export const WithoutExcerpt: StoryObj = {
  render: () => <Toast><FeedbackExample withExcerpt={false} /></Toast>,
};
export const Failed: StoryObj = {
  render: () => <Toast><FeedbackExample fail /></Toast>,
};
