// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage, noop } from '../_guideline';
import { Dropdown, type DropdownSection } from '../../react/src/Dropdown';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_dropdown.js';

const content = await loadGuideline('dropdown.md', new URL('../../guidelines/dropdown.md', import.meta.url));

const CATEGORIES: DropdownSection[] = [
  { label: 'HR', items: [{ label: 'Staff training', value: 'training' }, { label: 'Job adverts', value: 'adverts' }] },
  { label: 'Office', items: [{ label: 'Rent', value: 'rent' }, { label: 'Supplies', value: 'supplies' }] },
];

// `flat` gives the group label the ink and weight of an option, the look before #886.
const Picker = ({ flat = false }: { flat?: boolean }) =>
  <div className={`gl-stage gl-stage--menu${flat ? ' gl-flat-group' : ''}`}>
    <Dropdown variant="select" ariaLabel="Category" sections={CATEGORIES} selectedValue="adverts" onSelect={noop}
      open onOpenChange={noop} />
  </div>;

const specimens = [
  { id: 'group-labels', do: () => <Picker />, dont: () => <Picker flat /> },
];

const meta: Meta = { title: 'Guidelines/Dropdown', parameters: { layout: 'fullscreen' } };
export default meta;

export const DropdownPage: StoryObj = {
  name: 'Dropdown',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
