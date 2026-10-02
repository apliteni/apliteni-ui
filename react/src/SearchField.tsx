import { forwardRef, type InputHTMLAttributes } from 'react';
import { icon } from '@apliteni/apliteni-ui';
import '../../src/styles/input.css';

export type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'aria-label'> & {
  /** The control's name. A toolbar search box shows no label, so this is the
      only name it has. */
  ariaLabel: string;
};

/**
 * The toolbar's search box: one `.ui-input-group` holding the `search` glyph and
 * a native `type="search"` control on `.ui-input`. It has no visible label, so
 * the row keeps the height of the unlabelled controls beside it, and no CSS of
 * its own, so the toolbar's row rule and the field's focus ring reach it from
 * the kit's stylesheet.
 *
 * No clear button. The browser paints its own near-black on the light field and
 * white on the dark one, beside the kit's `--muted` magnifier — two glyphs, and
 * only one answers to a token — so `input.css` suppresses it.
 * why: docs/specification.md#react-search-field
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { ariaLabel, className, ...props }, ref,
) {
  // icon() already marks the svg aria-hidden, so the slot adds no name of its
  // own and `ariaLabel` stays the control's whole name.
  return <div className="ui-input-group">
    <span className="ui-input-group__icon" dangerouslySetInnerHTML={{ __html: icon('search') }} />
    <input ref={ref} {...props} type="search" aria-label={ariaLabel}
      className={['ui-input', className].filter(Boolean).join(' ')} />
  </div>;
});
