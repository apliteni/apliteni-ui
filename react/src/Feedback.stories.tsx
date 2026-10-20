import type { Meta, StoryObj } from '@storybook/react';
import { useRef } from 'react';
import { Feedback, type FeedbackProps } from './Feedback';

const meta: Meta<typeof Feedback> = {
  title: 'React/Feedback',
  id: 'react-feedback',
  component: Feedback,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof Feedback>;

const later = (result: { ok: boolean; error?: string }) => () =>
  new Promise<{ ok: boolean; error?: string }>(res => setTimeout(() => res(result), 700));

function Page({ onSend }: Pick<FeedbackProps, 'onSend'>) {
  const ref = useRef<HTMLElement>(null);
  return <>
    <main ref={ref} style={{ maxWidth: 660, margin: '0 auto', padding: '44px 24px 140px' }}>
      <h1 style={{ marginBottom: 'var(--space-2)' }}>Select any passage to leave feedback</h1>
      <p>Highlight a sentence below. A Give feedback pill appears above the selection. Click it to open the form with your quoted passage, write a note, and send.</p>
      <h2 id="how-it-works" style={{ marginTop: 'var(--space-8)', marginBottom: 'var(--space-2)' }}>How it works</h2>
      <p>The kit owns the selection pill and the form. Your app owns the backend. You pass an onSend function that files the note wherever you like, such as an issue, a database row or a webhook.</p>
      <h2 id="what-you-get" style={{ marginTop: 'var(--space-8)', marginBottom: 'var(--space-2)' }}>What lands in your handler</h2>
      <p>Each submission gives you the note, the exact excerpt the reader selected, and the nearest heading it sat under. Select this sentence to see the heading show up as the form's chip.</p>
    </main>
    <Feedback container={ref} onSend={onSend} />
  </>;
}

export const Default: Story = { render: () => <Page onSend={later({ ok: true })} /> };
export const ServerError: Story = {
  render: () => <Page onSend={later({ ok: false, error: 'Demo: the backend rejected this. Try again.' })} />,
};
