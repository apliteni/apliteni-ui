// The consent showcase in React. The title and id are the vanilla page's, so its links stay the same.
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { brand, icon } from '@apliteni/apliteni-ui';
import { AuthShell } from '../../react/src/AuthShell';
import { Button } from '../../react/src/primitives/Button';
import { Avatar } from '../../react/src/primitives/Avatar';
import { Icon } from '../../react/src/primitives/Icon';
import { SuccessCheck } from '../../react/src/Success';
import '../../react/src/showcases/Auth.css';

const brandMark = <span dangerouslySetInnerHTML={{ __html: brand({ p: 'consent', word: 'apliteni-ui', href: '#' }) }} />;
const shell = (body: ReactNode) => <AuthShell brand={brandMark}>{body}</AuthShell>;

const meta: Meta<typeof AuthShell> = { title: 'Showcases/Consent', id: 'apps-consent', component: AuthShell, parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof AuthShell>;

const scope = (glyph: string, title: string, detail: string) => <div className="ui-scope">
  <span className="ui-scope__icon" dangerouslySetInnerHTML={{ __html: icon(glyph) }} />
  <div><div className="ui-scope__t">{title}</div><div className="ui-scope__d">{detail}</div></div>
</div>;

export const Grant: Story = { name: 'Grant access', render: () => shell(<>
  <div className="auth-actors">
    <Avatar personKey="research-bot" name="Research bot" size={32} />
    <Icon name="arrowRight" />
    <Avatar personKey="ada-example" name="Ada Example" size={32} />
  </div>
  <h1 className="ui-auth__title">Research bot wants to read your account</h1>
  <p className="ui-auth__sub">Signed in as <b>ada@apliteni.com</b>. This agent is asking to:</p>
  <div className="ui-scopes">
    {scope('compass', 'Read your content', 'View pages and files your account can see.')}
    {scope('key', 'Read version history', 'View past versions and changes to those pages.')}
  </div>
  <div className="auth-note">
    <Icon name="lock" />
    <span>Read-only — you can revoke this anytime in Access &amp; agents.</span>
  </div>
  <div className="auth-actions">
    <Button block>Deny</Button>
    <Button variant="primary" block icon="check">Allow access</Button>
  </div>
</>) };

export const Granted: Story = { render: () => shell(<>
  <div className="auth-granted">
    <div className="ui-success__check"><SuccessCheck /></div>
    <h1 className="ui-success__title">Access granted</h1>
    <div className="ui-success__sub auth-granted-sub">Research bot can now read your account.</div>
  </div>
  <div className="auth-granted-action"><Button block iconRight="arrowRight">Manage agents</Button></div>
</>) };
