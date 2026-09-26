import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useId, useRef, useState } from 'react';
import { Drawer } from './Drawer';
import { KeyValueList } from './KeyValueList';
import { Button } from './primitives/Button';

type Args = { theme: 'light' | 'dark'; withExcerpt: boolean };

const meta = {
  title: 'Showcases/Feedback',
  id: 'showcases-feedback',
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'A feedback form composed from kit controls. Page context is sample data; sending is simulated. The application owns capture, positioning and delivery.' } },
  },
  args: { theme: 'light', withExcerpt: true },
  argTypes: {
    theme: { control: 'inline-radio', options: ['light', 'dark'] },
    withExcerpt: { control: 'boolean' },
  },
} satisfies Meta<Args>;
export default meta;

function FeedbackExample({ theme, withExcerpt }: Args) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('Could you show the expected delivery date here?');
  const [state, setState] = useState<'ready' | 'sending' | 'sent'>('ready');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fieldId = useId();
  const helpId = useId();
  const formId = useId();

  useEffect(() => {
    const previous = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', theme);
    return () => {
      if (previous === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', previous);
    };
  }, [theme]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function close() {
    clearTimeout(timer.current);
    setOpen(false);
    setState('ready');
  }

  return (
    <>
      <main className="container" style={{ padding: 'var(--space-6)', paddingBottom: 'var(--space-16)' }}>
        <h1>Orders</h1>
        <h2>Delivery</h2>
        <p>Order DEMO-1042 is packed and ready to ship.</p>
      </main>
      <div style={{ position: 'fixed', right: 'var(--space-4)', bottom: 'var(--space-4)' }}>
        <Button icon="chat" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Feedback
        </Button>
      </div>
      <Drawer open={open} title="Report a problem or share an idea" onClose={close}
        footer={state === 'sent' ? <Button onClick={close}>Done</Button> : <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId} busy={state === 'sending'}
            disabled={!note.trim()}>Send feedback</Button>
        </>}>
        {state === 'sent' ? <p role="status">Feedback sent. Thank you.</p> : <>
          <KeyValueList rows={[
            { label: 'Page', value: 'Orders / DEMO-1042' },
            { label: 'Section', value: 'Delivery' },
            ...(withExcerpt ? [{ label: 'Selected text', value: <q>packed and ready to ship</q> }] : []),
          ]} />
          <form id={formId} onSubmit={event => {
            event.preventDefault();
            if (!note.trim() || state !== 'ready') return;
            setState('sending');
            timer.current = setTimeout(() => setState('sent'), 800);
          }}>
            <div className="ui-field">
              <label className="ui-field__label" htmlFor={fieldId}>What went wrong, or what would help?</label>
              <textarea className="ui-textarea" id={fieldId} rows={4} value={note}
                readOnly={state === 'sending'} aria-describedby={helpId}
                onChange={event => setNote(event.target.value)} />
              <p className="ui-field__hint" id={helpId}>Only the context above and your note are included.</p>
            </div>
          </form>
        </>}
      </Drawer>
    </>
  );
}

export const Playground: StoryObj<Args> = {
  render: args => <FeedbackExample {...args} />,
};
