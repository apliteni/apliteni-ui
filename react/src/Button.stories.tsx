import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from './primitives/Button';

const meta: Meta = { title: 'React/Button', parameters: { layout: 'fullscreen' } };
export default meta;

// Vendor artwork from the existing vanilla BrandIcon specimen.
const googleG = <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.4 45 30.9 45 24.5z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.2H4.3v5.7C7.9 41.1 15.3 46 24 46z"/><path fill="#FBBC05" d="M11.6 27.9c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.7H4.3C2.8 17.3 2 20.6 2 24s.8 6.7 2.3 9.6l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.3 2 7.9 6.9 4.3 14.4l7.3 5.7C13.3 14.7 18.2 10.8 24 10.8z"/></svg>;
// Keep the vanilla gallery spacing for direct visual comparison.
const canvas = (children: React.ReactNode) => <div style={{ padding: 'var(--space-10)', minHeight: '100vh' }}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>{children}</div>
</div>;
const specimen = (label: string, children: React.ReactNode) => <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
  <div style={{ font: '600 11px/1 var(--font-sans)' }}>{label}</div>{children}
</div>;

export const BrandIcon: StoryObj = {
  name: 'Branded (leading)',
  render: () => canvas(<>
    {specimen('Continue with Google — idle', <Button size="lg" leading={googleG}>Continue with Google</Button>)}
    {specimen('Signing in — busy:true', <Button size="lg" leading={googleG} busy>Continue with Google</Button>)}
  </>),
};

export const Links: StoryObj = {
  render: () => canvas(<>
    {specimen('Link', <Button href="#details" iconRight="arrowRight">View details</Button>)}
    {specimen('Disabled link', <Button href="#details" disabled>View details</Button>)}
    {specimen('Busy link', <Button href="#details" busy>View details</Button>)}
    {specimen('Link with artwork', <Button href="#sign-in" leading={googleG}>Continue with Google</Button>)}
  </>),
};

function BusyExample() {
  const [busy, setBusy] = useState(false);
  return canvas(<>
    <Button href="#details" leading={googleG} busy={busy} onClick={event => { event.preventDefault(); setBusy(true); }}>Continue with Google</Button>
    <Button variant="ghost" onClick={() => setBusy(false)}>Finish request</Button>
  </>);
}
export const BusyTransition: StoryObj = { render: () => <BusyExample /> };
