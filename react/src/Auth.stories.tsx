import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { brand, icon } from '@apliteni/apliteni-ui';
import { AuthShell } from './AuthShell';
import { TextField } from './Field';
import { Button } from './primitives/Button';
import { SuccessCheck } from './Success';
import './showcases/Auth.css';

const brandMark = <span dangerouslySetInnerHTML={{ __html: brand({ p: 'react-auth', word: 'apliteni-ui', href: '#' }) }} />;
const shell = (body: ReactNode) => <AuthShell brand={brandMark}>{body}</AuthShell>;
const googleMark = <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.4 45 30.9 45 24.5z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.2H4.3v5.7C7.9 41.1 15.3 46 24 46z"/><path fill="#FBBC05" d="M11.6 27.9c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.7H4.3C2.8 17.3 2 20.6 2 24s.8 6.7 2.3 9.6l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.3 2 7.9 6.9 4.3 14.4l7.3 5.7C13.3 14.7 18.2 10.8 24 10.8z"/></svg>;
const googleButton = <Button variant="secondary" size="lg" block leading={googleMark}>Continue with Google</Button>;

const meta: Meta<typeof AuthShell> = { title: 'React/Auth', component: AuthShell, parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof AuthShell>;

export const SignIn: Story = { render: () => shell(<>
  <h1 className="ui-auth__title">Sign in</h1>
  <p className="ui-auth__sub">Access the Apliteni design system. Use your work Google account or your email.</p>
  {googleButton}
  <div className="ui-divider">or</div>
  <form className="auth-form" onSubmit={event => event.preventDefault()}>
    <TextField label="Work email" type="email" placeholder="you@example.com" icon="mail" required />
    <TextField label="Password" type="password" placeholder="••••••••" icon="lock" required />
    <Button variant="primary" size="lg" block type="submit">Sign in</Button>
  </form>
  <div className="ui-auth__foot">Only example.com accounts can sign in.</div>
</>) };

export const SignInError: Story = { name: 'Sign in with error', render: () => shell(<>
  <h1 className="ui-auth__title">Sign in</h1>
  <p className="ui-auth__sub">Access the Apliteni design system.</p>
  <form className="auth-form" onSubmit={event => event.preventDefault()}>
    <TextField label="Work email" type="email" defaultValue="ada@example.com" icon="mail" required />
    <TextField label="Password" type="password" defaultValue="wrong" icon="lock" required error="Incorrect password. Try again." />
    <Button variant="primary" size="lg" block type="submit">Sign in</Button>
  </form>
</>) };

export const GoogleOnly: Story = { name: 'Google SSO only', render: () => shell(<>
  <h1 className="ui-auth__title">Sign in</h1>
  <p className="ui-auth__sub">Use your work Google account to sign in.</p>
  {googleButton}
  <div className="ui-auth__foot">Example.com accounts only.</div>
</>) };

const scope = (glyph: string, title: string, detail: string) => <div className="ui-scope">
  <span className="ui-scope__icon" dangerouslySetInnerHTML={{ __html: icon(glyph) }} />
  <div><div className="ui-scope__t">{title}</div><div className="ui-scope__d">{detail}</div></div>
</div>;

export const Consent: Story = { name: 'Grant access', render: () => shell(<>
  <h1 className="ui-auth__title">Research bot wants to read your account</h1>
  <p className="ui-auth__sub">Signed in as ada@example.com. This agent is asking to:</p>
  <div className="ui-scopes">
    {scope('compass', 'Read your content', 'View pages and files your account can see.')}
    {scope('key', 'Read version history', 'View past versions and changes to those pages.')}
  </div>
  <p className="auth-grant-note">Read-only. You can revoke access anytime in Access and agents.</p>
  <div className="auth-actions">
    <Button block>Deny</Button>
    <Button variant="primary" block icon="check">Allow access</Button>
  </div>
</>) };

export const Granted: Story = { render: () => shell(<>
  <div className="auth-granted">
    <div className="ui-success__check"><SuccessCheck /></div>
    <h1 className="ui-success__title">Access granted</h1>
    <div className="ui-success__sub">Research bot can now read your account.</div>
  </div>
  <div className="auth-granted-action"><Button block iconRight="arrowRight">Manage agents</Button></div>
</>) };
