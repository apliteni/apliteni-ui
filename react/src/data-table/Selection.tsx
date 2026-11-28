// The selection column: one box in the header for the page, and one box in each row.

export function SelectPageCell({ names, selected, onTogglePage }: {
  names: string[]; selected: Set<string>; onTogglePage: (names: string[]) => void;
}) {
  const allOn = names.length > 0 && names.every((name) => selected.has(name));
  const someOn = !allOn && names.some((name) => selected.has(name));
  return (
    <th scope="col" className="ui-table__selection">
      {/* No visible text: aria-label is this checkbox's whole name. */}
      <input type="checkbox" checked={allOn} aria-label="Select all rows on this page"
        ref={(input) => { if (input) input.indeterminate = someOn; }}
        onChange={() => onTogglePage(names)} />
    </th>
  );
}

export function SelectRowCell({ name, selected, onToggle }: {
  name: string; selected: Set<string>; onToggle: (name: string) => void;
}) {
  return (
    <td className="ui-table__selection"><input type="checkbox" checked={selected.has(name)} aria-label={`Select ${name}`}
      onChange={() => onToggle(name)} /></td>
  );
}
