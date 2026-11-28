/* The type half of "a trigger shows only its value" (#899). The project in
 * tsconfig.types.json compiles this file, so a `label` prop that comes back leaves an
 * unused @ts-expect-error, and scripts/react-types.test.js fails on it.
 * Limits: it checks the published types, not what renders. */
import { Dropdown } from './Dropdown';

const items = [{ label: 'One', value: '1' }];

export const allowed = <>
  <Dropdown ariaLabel="Owner" items={items} />
  <Dropdown sections={[{ label: 'Team', items }]} />
</>;

export const refused = <>
  {/* @ts-expect-error -- a trigger has no name prefix: use a Field label or ariaLabel */}
  <Dropdown label="Owner" items={items} />
</>;
