// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmPicture, GuidelinePage, NoticePicture, noop } from '../_guideline';
import { Dropdown, type DropdownEntry } from '../../react/src/Dropdown';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_destructive-actions.js';

const content = await loadGuideline('destructive-actions.md', new URL('../../guidelines/destructive-actions.md', import.meta.url));

const MENU_ITEMS: DropdownEntry[] = [
  { label: 'Rename token', icon: 'edit' },
  { label: 'Duplicate', icon: 'copy' },
  '---',
  { label: 'Revoke access', icon: 'trash', danger: true },
];

// `.gl-hovering` pins the danger row into its hover appearance, because hover
// cannot be screenshotted.
const Menu = ({ mod }: { mod: 'pink' | 'accent' }) =>
  <div className={`gl-stage gl-stage--menu gl-hovering gl-hovering--${mod}`}>
    <Dropdown value="Token actions" variant="menu" ariaLabel="Token actions" items={MENU_ITEMS} open onOpenChange={noop} />
    <div className="gl-cursor">Pointer resting on “Revoke access”</div>
  </div>;

const Confirm = (props: Parameters<typeof ConfirmPicture>[0]) =>
  <div className="gl-stage gl-stage--confirm"><ConfirmPicture {...props} /></div>;

const specimens = [
  { id: 'colour', do: () => <Menu mod="pink" />, dont: () => <Menu mod="accent" /> },
  { id: 'wording',
    do: () => <Confirm title="Revoke access for Research bot?" cancelLabel="Keep access" confirmLabel="Revoke access" />,
    dont: () => <Confirm title="Are you sure?" cancelLabel="Cancel" confirmLabel="OK" /> },
  { id: 'undo',
    do: () => <Confirm title="Delete workspace “Acme”?" body="Its boards, tokens and history go with it."
      cancelLabel="Keep workspace" confirmLabel="Delete workspace" />,
    dont: () => <div className="gl-stage"><NoticePicture tone="neutral" title="Workspace “Acme” deleted"
      text="Its boards, tokens and history went with it." action="Undo" /></div> },
];

const meta: Meta = { title: 'Guidelines/Destructive actions', parameters: { layout: 'fullscreen' } };
export default meta;

export const DestructiveActions: StoryObj = {
  name: 'Destructive actions',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
