// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage, noop } from '../_guideline';
import { Dropdown, type DropdownSection } from '../../react/src/Dropdown';
import { Field } from '../../react/src/Field';
import { FilterBar } from '../../react/src/FilterBar';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_dropdown.js';

const content = await loadGuideline('dropdown.md', new URL('../../guidelines/dropdown.md', import.meta.url));

const CATEGORIES: DropdownSection[] = [
  { label: 'HR', items: [{ label: 'Staff training', value: 'training', disabled: true }, { label: 'Job adverts', value: 'adverts' }] },
  { label: 'Office', items: [{ label: 'Rent', value: 'rent' }, { label: 'Supplies', value: 'supplies' }] },
];

// `flat` gives the group label the ink and weight of an option. Staff training is disabled in both
// pictures, so each shows the label above a disabled option.
const Picker = ({ flat = false }: { flat?: boolean }) =>
  <div className={`gl-stage gl-stage--menu${flat ? ' gl-flat-group' : ''}`}>
    <Dropdown variant="select" ariaLabel="Category" sections={CATEGORIES} selectedValue="adverts" onSelect={noop}
      open onOpenChange={noop} />
  </div>;

const UNITS = [{ label: 'Engine team', value: 'engine' }, { label: 'Support team', value: 'support' }];

// The do names the unit in a field label, and in a filter chip while no unit is chosen.
// The don't writes the name into the trigger, the way the removed `label` prop drew it.
const Named = () =>
  <div className="gl-stage gl-stage--triggers">
    <Field label="Unit">{control => <Dropdown {...control} variant="select" items={UNITS} value="Engine team" selectedValue="engine" onSelect={noop} />}</Field>
    <FilterBar filters={[{ id: 'unit', label: 'Unit', items: UNITS }]} onChange={noop} onRemove={noop} onClear={noop} />
  </div>;
const Prefixed = () =>
  <div className="gl-stage gl-stage--triggers">
    <Dropdown variant="select" ariaLabel="Unit" items={UNITS} selectedValue="engine" onSelect={noop}
      triggerContent={<span className="ui-dropdown__line"><span>Unit</span><span className="ui-dropdown__value">Engine team</span></span>} />
  </div>;

const specimens = [
  { id: 'group-labels', do: () => <Picker />, dont: () => <Picker flat /> },
  { id: 'trigger-value', do: () => <Named />, dont: () => <Prefixed /> },
];

const meta: Meta = { title: 'Guidelines/Dropdown', parameters: { layout: 'fullscreen' } };
export default meta;

export const DropdownPage: StoryObj = {
  name: 'Dropdown',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
