// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { ConfirmPicture, DrawerPicture, GuidelinePage, NoticePicture, Typed, noop } from '../_guideline';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';
import { Card } from '../../react/src/primitives/Card';
import { Dropdown, type DropdownProps } from '../../react/src/Dropdown';
import { FilterBar } from '../../react/src/FilterBar';
import { Segmented } from '../../react/src/Segmented';
import { SidebarNav } from '../../react/src/SidebarNav';
import { Success, SuccessPanel } from '../../react/src/Success';
import { Tabs } from '../../react/src/Tabs';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { currencyItems } from '../_currencies.js';

const content = await loadGuideline('component-choice.md', new URL('../../guidelines/component-choice.md', import.meta.url));

const Stage = ({ mod = '', children }: { mod?: string; children: ReactNode }) =>
  <div className={`gl-stage${mod ? ` ${mod}` : ''}`}>{children}</div>;

const PairedActions = ({ cancel }: { cancel: 'ghost' | 'primary' }) => <Stage>
  <div style={{ display: 'flex', gap: 'var(--space-3)' }}><Button variant={cancel}>Cancel</Button><Button variant="primary">Save</Button></div>
</Stage>;

const FILTERS = ['Any', 'Verified', 'Pending'];
const SECTORS = ['Technology', 'Energy', 'Health care'].map(label => ({ label, value: label }));
const SAVED_VIEWS = ['All rows', 'Unclassified', 'This month'];

// Three categories, three groups. --space-6 between them against the filter
// bar's own --space-2 inside it, so the filter bar wrapping on a phone still
// reads as one group wrapping. The views take the plain strip: the underline
// appearance is for a column switch over one dataset.
const CategoryDo = () => <Stage>
  <div style={{ display: 'grid', gap: 'var(--space-6)', justifyItems: 'start' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-6)', width: '100%' }}>
      <FilterBar filters={[{ id: 'sector', label: 'Sector', value: 'Technology', items: SECTORS }]}
        onRemove={noop} onClear={noop} onChange={noop} />
      <span style={{ marginLeft: 'auto' }}><Button size="sm">Export</Button></span>
    </div>
    <Segmented options={['Overview', 'Performance'].map(label => ({ label, value: label }))} value="Overview"
      onChange={noop} label="Dataset view" />
  </div>
</Stage>;
// What #508 reported: the saved views and the control that adds a condition, one
// bar and one style, so nothing says which of them re-draws every row.
const CategoryDont = () => <Stage>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
    {[...SAVED_VIEWS, 'Filter'].map(label => <Button key={label} size="sm">{label}</Button>)}
  </div>
</Stage>;

// Both halves render open, so the stage keeps room below the trigger for the panel it drops.
const Currency = (props: Partial<DropdownProps>) => <Stage><div style={{ minHeight: 400 }}>
  <Dropdown label="currency:" ariaLabel="Currency" items={currencyItems('EUR')} selectedValue="EUR" open onOpenChange={noop} {...props} />
</div></Stage>;

// A phone band with its menu button at the right, and the menu drawer open in a
// frame of its own below the band: a drawer is position: fixed. The pair differs
// only in the side the drawer comes from.
const SECTIONS = ['Overview', 'Payouts', 'Reports'].map(label => ({ id: label, label, href: '#' }));
const MenuOrigin = ({ side }: { side: 'left' | 'right' }) => <Stage>
  <div className="gl-component-choice__frame">
    <div className="gl-component-choice__band"><Button variant="ghost" icon="menu" iconOnly aria-label="Menu" /></div>
    <div className="gl-component-choice__under">
      <DrawerPicture title="Northwind" side={side} size="sm">
        <SidebarNav aria-label={`Menu sections, ${side}`} items={SECTIONS} active="Payouts" />
      </DrawerPicture>
    </div>
  </div>
</Stage>;

const specimens = [
  { id: 'paired-actions', do: () => <PairedActions cancel="ghost" />, dont: () => <PairedActions cancel="primary" /> },
  { id: 'interrupt',
    do: () => <Stage mod="gl-stage--confirm"><ConfirmPicture title="Rotate this token?"
      body="The current token stops working the moment you do." cancelLabel="Keep token" confirmLabel="Rotate token" /></Stage>,
    dont: () => <Stage><Callout variant="info">Rotate this token? The current one stops working the moment you do.</Callout></Stage> },
  // No `action` on the don't: a warn toast carrying one paints --amber ink that
  // misses AA in light (#131), and the contrast walk reads this page.
  { id: 'transient',
    do: () => <Stage><Callout variant="warn">This token is shown once. Copy it now — you won’t see it again.</Callout></Stage>,
    dont: () => <Stage><NoticePicture tone="warn" title="This token is shown once" text="Copy it now — you won’t see it again." /></Stage> },
  { id: 'panels',
    do: () => <Stage><Segmented options={FILTERS.map(label => ({ label, value: label }))} value="Pending" onChange={noop} label="Status filter" /></Stage>,
    dont: () => <Stage><Tabs label="Status filter" value="Pending" onChange={noop}
      items={FILTERS.map(label => ({ value: label, label, panel: null }))} /></Stage> },
  { id: 'panel-origin', do: () => <MenuOrigin side="right" />, dont: () => <MenuOrigin side="left" /> },
  { id: 'one-category', do: () => <CategoryDo />, dont: () => <CategoryDont /> },
  { id: 'scale',
    do: () => <Stage><Card><SuccessPanel title="Feedback sent" sub="It goes straight to the strategy owner." /></Card></Stage>,
    dont: () => <Stage><Card><Success layout="hero" title="Feedback sent" /></Card></Stage> },
  { id: 'dropdown-search',
    do: () => <Typed query="dollar"><Currency panelClass="gl-component-choice__search-panel" search={{ placeholder: 'Search currencies' }} /></Typed>,
    dont: () => <Currency scroll /> },
];

const meta: Meta = { title: 'Guidelines/Component choice', parameters: { layout: 'fullscreen' } };
export default meta;

export const ComponentChoice: StoryObj = {
  name: 'Component choice',
  render: () => <GuidelinePage content={content} specimens={specimens}
    css={'<style>.gl-component-choice__search-panel{min-width:min(280px,calc(100vw - 80px));}'
      + '.gl-component-choice__frame{display:flex;flex-direction:column;height:320px;overflow:hidden;border-radius:var(--radius-md);'
      + 'background:var(--bg);box-shadow:inset 0 0 0 1px var(--border);}'
      + '.gl-component-choice__band{display:flex;justify-content:flex-end;padding:var(--space-2);'
      + 'border-bottom:1px solid var(--border);}'
      + '.gl-component-choice__under{position:relative;flex:1;}'
      + '.gl-component-choice__under .ui-drawer{position:absolute;}'
      + '.gl-component-choice__under .ui-drawer__panel{width:calc(100% - var(--space-12));}</style>'} />,
};
