import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Success, SuccessCheck, SuccessPanel } from './Success';
import { Button } from './primitives/Button';

const meta: Meta<typeof Success> = {
  title: 'React/Success', component: Success, parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof Success>;

// Match the existing vanilla gallery's canvas for the migration comparison.
const wrap = (content: ReactNode, width = 620) => <div style={{ padding: 40, minHeight: '100vh' }}><div style={{ maxWidth: width, margin: '0 auto' }}>{content}</div></div>;
const stack = (content: ReactNode) => <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>{content}</div>;
const specimen = (label: string, content: ReactNode) => <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
  <div style={{ font: '600 11px/1 var(--font-sans)' }}>{label}</div>{content}
</div>;

// The outcome is the title and the detail is one short line — the block carries
// no third text tier. why: docs/specification.md#success-confirmations
export const Hero: Story = {
  render: () => wrap(<Success title="Feedback sent"
    body="It goes straight to the strategy owner."
    actions={<><Button variant="primary" icon="compass">Back to strategy</Button><Button variant="ghost" icon="chat">Send another</Button></>} />),
};
export const Split: Story = {
  render: () => wrap(<Success layout="split" title="Your plan is active"
    body="A receipt is on its way to your inbox."
    actions={<><Button variant="primary" iconRight="arrowRight">Go to dashboard</Button><Button variant="ghost">View receipt</Button></>} />, 720),
};
export const Compact: Story = {
  render: () => <div style={{ padding: 40, minHeight: '100vh' }}>{stack(<>
    {specimen('Single action', <div style={{ maxWidth: 520, margin: '0 auto' }}><Success layout="compact" title="Note saved" body="Autosaved just now." actions={<Button variant="ghost" size="sm">Undo</Button>} /></div>)}
    {specimen('No action', <div style={{ maxWidth: 520, margin: '0 auto' }}><Success layout="compact" title="Copied to clipboard" /></div>)}
  </>)}</div>,
};
export const Celebrate: Story = {
  render: () => wrap(<Success confetti title="Your workspace is ready"
    body="Taking you to your new dashboard."
    actions={<Button variant="primary" icon="sparkle">Enter workspace</Button>}
    countdown={{ seconds: 5, label: 'Redirecting' }} />),
};
// The two check marks side by side. `line` is the default; `circled` is the
// smaller status mark Guidelines / Iconography asks a reported state to use.
export const CheckMark: Story = {
  render: () => <div style={{ padding: 40, minHeight: '100vh' }}>{stack(<>
    {specimen('Line — the default', <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <Success title="Your plan is active" body="A receipt is on its way to your inbox." /></div>)}
    {specimen('Circled', <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <Success check="circled" title="Your plan is active" body="A receipt is on its way to your inbox." /></div>)}
    {specimen('Circled, beside the copy', <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Success check="circled" layout="split" title="Your plan is active" body="A receipt is on its way to your inbox." /></div>)}
  </>)}</div>,
};
export const Panel: Story = {
  render: () => <div style={{ padding: 40, minHeight: '100vh' }}><div style={{ maxWidth: 460 }}><SuccessPanel title="Feedback sent" sub="Thanks — it goes straight to the strategy owner." /></div></div>,
};
export const Check: Story = {
  // The bare mark needs a wrapper for its size and colours; ui-success__check is the kit's.
  render: () => wrap(<div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--space-4)' }}>
    <div className="ui-success__check"><SuccessCheck /></div><p>Changes saved</p></div>),
};
function CancelableCountdown() {
  const [running, setRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  return wrap(<Success title="Your workspace is ready" body={finished ? 'Countdown complete. You can continue when ready.' : 'Continue now, or stay on this page.'}
    countdown={running ? { seconds: 5, label: 'Continuing' } : null}
    onCountdownEnd={() => { setRunning(false); setFinished(true); }}
    actions={<><Button variant="primary" onClick={() => { setRunning(false); setFinished(true); }}>Continue</Button>
      <Button variant="ghost" onClick={() => setRunning(false)}>Stay here</Button></>} />);
}
export const Countdown: Story = { render: () => <CancelableCountdown /> };
