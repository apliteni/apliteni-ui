// The Profile page (#845): who the reader is, as sign-in gave it, and the way out.
// It opens from the account menu as one page inside the app shell.
import type { Meta, StoryObj } from '@storybook/react';
import { AccountPage, VIEWPORTS, fourWays } from './_account-pages';
import { Sheet } from '../_guideline';
import { Avatar } from '../../react/src/primitives/Avatar';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
import person from '../assets/demo-person.png';

const meta: Meta = { title: 'Showcases/Profile', id: 'apps-profile', parameters: { layout: 'fullscreen', ...VIEWPORTS } };
export default meta;

// The photo, the name and the address come from sign-in, so nothing here is a field.
// The role is a badge at the row's end: a fact about the reader that no one edits here.
// 32px is the kit's largest avatar, the size the account window draws the reader at.
const CSS = `<style>
  .pf-who { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
  .pf-out { margin-top: var(--space-4); }
</style>`;

const render = () => <AccountPage title="Profile">
  <Sheet css={CSS} />
  <Card>
    <div className="ui-card__row">
      <div className="pf-who">
        <Avatar personKey="ada@apliteni.com" name="Ada Lovelace" src={person} size={32} />
        <div><div className="lab">Ada Lovelace</div><div className="hint">ada@apliteni.com</div></div>
      </div>
      <Badge>Admin</Badge>
    </div>
    <div className="pf-out"><Button icon="logout">Sign out</Button></div>
  </Card>
</AccountPage>;

const ways = fourWays(render);
export const Default: StoryObj = ways.Default;
export const Light: StoryObj = ways.Light;
export const Phone: StoryObj = ways.Phone;
export const PhoneLight: StoryObj = ways.PhoneLight;
