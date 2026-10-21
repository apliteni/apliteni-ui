import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Dropdown, type DropdownEntry } from './Dropdown';
import { Drawer } from './Drawer';
import { Field, TextField } from './Field';
import { Modal } from './Modal';
import { Button } from './primitives/Button';

const meta: Meta = { title: 'React/Dropdown placement' };
export default meta;

// A select in a form, in each place a form sits: a Modal, a Drawer, a page, and a
// wrapper with `overflow: auto` that does not scroll inside a Modal body that does.
// The panel opens below its field, the whole of it in view with the field's label,
// and a body that cannot hold it lets the panel open over the body instead.
// stories/dropdown-reach.test.js opens this story by id, react-dropdown-placement--in-a-form,
// with each case as args.
type PlacementArgs = {
  stage: 'modal' | 'drawer' | 'page' | 'nested';
  // How many text fields come before the select and after it: a short form has one before.
  before: number;
  after: number;
  rows: number;
  // On a page: how far above the viewport's end the field ends, and whether the page scrolls.
  gap: number;
  long: boolean;
  // The Dropdown's `search`, and its `scroll` in px with 0 for none. Named apart from the
  // props, whose own controls would refuse these values in a URL.
  find: boolean;
  limit: number;
  avatar: boolean;
};
const ACCOUNTS = (n: number, withAvatar: boolean): DropdownEntry[] => Array.from({ length: n }, (_, i) => ({
  label: `Account ${i + 1}`, value: String(i + 1),
  ...(withAvatar ? { avatar: { key: `account-${i + 1}`, name: `Account ${i + 1}` } } : {}),
}));
// URL args arrive as text, so each number is read as one.
function PlacementForm({ before, after, rows, find, limit, avatar }: PlacementArgs) {
  return (
    <>
      {Array.from({ length: Number(before) }, (_, i) => <TextField key={i} label={i ? `Note ${i}` : 'Name'} />)}
      <Field label="Account">{(control) => (
        <Dropdown {...control} variant="select" items={ACCOUNTS(Number(rows), avatar)} placeholder="Choose an account"
          search={find || undefined} scroll={Number(limit) || undefined} />
      )}</Field>
      {Array.from({ length: Number(after) }, (_, i) => <TextField key={i} label={`Detail ${i + 1}`} />)}
    </>
  );
}
export const InAForm: StoryObj<PlacementArgs> = {
  args: { stage: 'modal', before: 1, after: 0, rows: 30, gap: 200, long: false, find: false, limit: 0, avatar: false },
  parameters: { layout: 'fullscreen' },
  render: (args) => {
    const [open, setOpen] = useState(true);
    const close = () => setOpen(false);
    const save = <Button variant="primary" onClick={close}>Save</Button>;
    if (args.stage === 'drawer') {
      return (
        <Drawer open={open} title="Edit campaign" onClose={close} footer={save}>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}><PlacementForm {...args} /></div>
        </Drawer>
      );
    }
    if (args.stage === 'page') {
      return (
        <div style={{ display: 'grid', alignContent: 'end', boxSizing: 'border-box', gap: 'var(--space-4)',
          minHeight: args.long ? '200dvh' : '100dvh', padding: `0 var(--space-4) ${Number(args.gap)}px` }}>
          <PlacementForm {...args} />
        </div>
      );
    }
    const form = <PlacementForm {...args} />;
    return (
      <Modal open={open} title="New campaign" onClose={close} footer={save}>
        {args.stage === 'nested' ? <div style={{ overflow: 'auto', display: 'grid', gap: 'var(--space-4)' }}>{form}</div> : form}
      </Modal>
    );
  },
};
