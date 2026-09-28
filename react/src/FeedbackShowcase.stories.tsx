import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useId, useRef, useState } from 'react';
import { Modal } from './Modal';
import { KeyValueList } from './KeyValueList';
import { TextArea } from './Field';
import { Toast, useToast } from './Toast';
import { Button } from './primitives/Button';

type Args = { withExcerpt?: boolean; fail?: boolean };

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
      <main className="ui-container ui-stack" style={{ padding: 'var(--space-6)', paddingBottom: 'var(--space-16)' }}>
        <h1>Orders</h1>
        <p>Review the order status before arranging delivery.</p>
        <h2>Order DEMO-1042</h2>
        <p>This sample order contains a desk lamp and a notebook. Both items were checked and packed together.</p>
        <h2>Delivery</h2>
        <p>Order DEMO-1042 is packed and ready to ship.</p>
        <p>The carrier has not collected the parcel yet. A tracking link will appear here after collection.</p>
        <h2>Before it leaves</h2>
        <p>Check the items and delivery instructions. If anything is missing or unclear, use Feedback to leave a note about this section.</p>
      </main>
      <div style={{ position: 'fixed', right: 'var(--space-4)', bottom: 'calc(var(--space-16) + var(--space-12))' }}>
        <Button icon="chat" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Feedback
        </Button>
      </div>
      <Modal open={open} title="Report a problem or share an idea" onClose={close}
        footer={<>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId} busy={state === 'sending'}
            completionMessage={state === 'failed' ? '' : undefined} disabled={!note.trim()}>Send feedback</Button>
        </>}>
        {withExcerpt && <div className="ui-fbc__quote" style={{ margin: 0 }}>
          <span className="ui-fbc__qm" aria-hidden="true">“</span>
          <q>packed and ready to ship</q>
        </div>}
        <KeyValueList rows={[
          { label: 'Page', value: 'Orders / DEMO-1042' },
          { label: 'Section', value: 'Delivery' },
        ]} />
        <form id={formId} onSubmit={event => {
          event.preventDefault();
          if (!note.trim() || state === 'sending') return;
          setState('sending');
          timer.current = setTimeout(() => {
            if (fail) { setState('failed'); return; }
            close();
            setNote('');
            pushToast({ tone: 'success', title: 'Feedback sent', text: 'Thank you for your note.' });
          }, 800);
        }}>
          <TextArea label="What went wrong, or what would help?"
            hint="Only the context above and your note are included."
            placeholder="What's off, missing, or worth adding here?" rows={4} value={note}
            error={state === 'failed' ? "Couldn't send your feedback. Your note is still here. Try again." : undefined}
            readOnly={state === 'sending'} onChange={event => setNote(event.target.value)} />
        </form>
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
