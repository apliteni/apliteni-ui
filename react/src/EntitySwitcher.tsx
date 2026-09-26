import { Dropdown } from './Dropdown';

export type Entity = {
  id: string;
  name: string;
  description: string;
  archived?: boolean;
};

export type EntitySwitcherProps = {
  entities: readonly Entity[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  defaultOpen?: boolean;
};

export function EntitySwitcher({
  entities, value, onChange, label = 'Entity', defaultOpen = false,
}: EntitySwitcherProps) {
  return (
    <Dropdown
      variant="select"
      label={`${label}:`}
      ariaLabel={label}
      align="end"
      value={entities.find((entity) => entity.id === value)?.name ?? 'Select…'}
      defaultOpen={defaultOpen}
      items={entities.map((entity) => ({
        value: entity.id,
        label: entity.name,
        description: entity.description,
        selected: entity.id === value,
        badge: entity.archived ? { text: 'Archived', tone: 'state' } : undefined,
      }))}
      onSelect={(id) => onChange(id as string)}
    />
  );
}
