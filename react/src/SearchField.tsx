import { forwardRef, type InputHTMLAttributes } from 'react';
import { icon } from '@apliteni/apliteni-ui';
import '../../src/styles/input.css';

export type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'aria-label'> & {
  /** The control's name. A toolbar search box shows no label, so this is the
      only name it has. */
  ariaLabel: string;
};

/**
 * The toolbar's search box: the kit's `input({ type: 'search', icon: 'search',
 * ariaLabel })`, which React had no way to render without hand-writing
 * `<input className="ui-input">`.
 *
 * No visible label, so the row keeps the height of the controls beside it, and
 * no clear button, which is the field the kit already draws — `input.css`
 * suppresses the browser's own for the reason recorded there.
 * why: docs/specification.md#react-search-field
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { ariaLabel, className, ...props }, ref,
) {
  // icon() marks the svg aria-hidden, so the span carries nothing the vanilla
  // group does not. SearchField.test.tsx compares the two attribute for attribute.
  return <div className="ui-input-group">
    <span className="ui-input-group__icon" dangerouslySetInnerHTML={{ __html: icon('search') }} />
    <input ref={ref} {...props} type="search" aria-label={ariaLabel}
      className={['ui-input', className].filter(Boolean).join(' ')} />
  </div>;
});
