import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Drawer } from './Drawer';
import { Button } from './primitives/Button';
import { DrawerSection } from './KeyValueList';

const meta: Meta<typeof Drawer> = { title: 'React/Drawer', component: Drawer };
export default meta;

// The shape #272 was reported on: a transaction opened from a table, against the right edge.
// The panel title, a section title and a field label show the drawer's three type levels.
export const Playground: StoryObj<typeof Drawer> = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="primary" onClick={() => setOpen(true)}>Open</Button>
        <Drawer open={open} title="Transaction" onClose={() => setOpen(false)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>Save</Button>
            </>
          )}>
          <DrawerSection title="Reconciliation">
            <div className="ui-field">
              <label className="ui-field__label" htmlFor="rx-drawer-demo-note">Note</label>
              <input id="rx-drawer-demo-note" className="ui-input" placeholder="e.g. Refund for a duplicate charge" />
            </div>
          </DrawerSection>
        </Drawer>
      </>
    );
  },
};

export const LeftSmall: StoryObj<typeof Drawer> = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="primary" onClick={() => setOpen(true)}>Open</Button>
        <Drawer open={open} side="left" size="sm" title="Filters" onClose={() => setOpen(false)}>
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="rx-drawer-demo-status">Status</label>
            <select id="rx-drawer-demo-status" className="ui-select">
              <option>Any</option>
              <option>Settled</option>
              <option>Pending</option>
            </select>
          </div>
        </Drawer>
      </>
    );
  },
};
