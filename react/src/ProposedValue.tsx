import { useContext, useEffect, useId, useRef, useState } from 'react';
import { Dropdown, type DropdownItem } from './Dropdown';
import { Button } from './primitives/Button';
import { FieldContext } from './fieldContext';
import './ProposedValue.css';

export type ProposedValueProps = {
  /** The options. A value of `''` is the None row's own, so give each option another. */
  items: DropdownItem[];
  /** The chosen option's value. Without one the field is None. */
  value?: string | number;
  /** The value that the app proposes. It shows only while `value` is empty and an enabled option has it. */
  proposed?: string | number;
  /** A pick from the menu, and the check, give the new value. The None row gives `undefined`. */
  onChange: (value: string | number | undefined) => void;
  /** The dismiss mark drops the proposal. The field shows None until a new proposal comes. */
  onDismiss?: () => void;
  /** The paint of the check. `ghost` draws it with no outline, as the dismiss mark is drawn. */
  applyVariant?: 'secondary' | 'ghost';
  /** The words of the empty field and of its first row. */
  none?: string;
  /** Names the control outside a `Field`, for example "Category for Luz del Sur". */
  ariaLabel?: string;
  /** From `Field`: spread its control props here. */
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  disabled?: boolean;
};

const NONE = '';

/**
 * A select that can hold a proposed value. Set and empty show a ghost select. Proposed shows
 * the value in a still gradient, a check that applies it and a mark that dismisses it.
 * why: docs/components.md#proposed-value
 */
export function ProposedValue({
  items, value, proposed, onChange, onDismiss, applyVariant = 'secondary', none = 'None', ariaLabel, id, disabled,
  'aria-describedby': describedBy, 'aria-invalid': invalid,
}: ProposedValueProps) {
  const auto = useId();
  const uid = id ?? auto;
  const field = useContext(FieldContext);
  const inForm = Boolean(field && field.id === id);
  // The proposal that the dismiss mark dropped. A change of `proposed` resets it, so a
  // proposal that comes back after another one shows again.
  const [dropped, setDropped] = useState<string | number | undefined>(undefined);
  const [seen, setSeen] = useState(proposed);
  if (seen !== proposed) { setSeen(proposed); setDropped(undefined); }
  // After the check or the dismiss mark the group leaves, so the select that takes its place
  // takes the focus. Its menu stays shut.
  const refocus = useRef(false);
  const offer = value == null && proposed != null && proposed !== dropped
    ? items.find((it) => it.value === proposed && !it.disabled) : undefined;

  useEffect(() => {
    if (!refocus.current || offer) return;
    refocus.current = false;
    document.getElementById(uid)?.querySelector<HTMLElement>('[data-dropdown-trigger]')?.focus();
  });

  if (offer) {
    const word = `${uid}-word`;
    const apply = () => { refocus.current = true; onChange(offer.value); };
    const dismiss = () => { refocus.current = true; setDropped(offer.value); onDismiss?.(); };
    return (
      <span
        className="ui-proposed"
        id={uid}
        role="group"
        aria-labelledby={inForm ? `${field!.labelId} ${word}` : undefined}
        aria-label={inForm ? undefined : `${ariaLabel ?? none}, suggested`}
        aria-describedby={describedBy}
        aria-invalid={invalid}
      >
        {/* The state's word for assistive technology. The gradient shows it to the eye. */}
        <span id={word} hidden>suggested</span>
        {/* An ellipsis can cut the value. The pointer shows it in full, and the check's name holds it. */}
        <span className="ui-proposed__value" title={offer.label}>
          <span className="ui-proposed__text">{offer.label}</span>
        </span>
        <span className="ui-proposed__acts">
          <Button iconOnly icon="check" variant={applyVariant} size={inForm ? 'md' : 'sm'} disabled={disabled}
            aria-label={`Apply ${offer.label}`} title={`Apply ${offer.label}`} onClick={apply} />
          <Button iconOnly icon="x" variant="ghost" size={inForm ? 'md' : 'sm'} disabled={disabled}
            aria-label={`Dismiss ${offer.label}`} title={`Dismiss ${offer.label}`} onClick={dismiss} />
        </span>
      </span>
    );
  }

  return (
    <Dropdown
      id={uid}
      variant="select"
      ghost
      ariaLabel={inForm ? undefined : ariaLabel}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      disabled={disabled}
      items={[{ label: none, value: NONE }, ...items]}
      selectedValue={value ?? NONE}
      onSelect={(picked) => onChange(picked === NONE ? undefined : picked)}
    />
  );
}
