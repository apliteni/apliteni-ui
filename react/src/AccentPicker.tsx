import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';
import { ACCENTS, accentSwatchStyle } from '@apliteni/apliteni-ui';

export type Accent = (typeof ACCENTS)[number];
export type AccentPickerProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'children'> & {
  value: Accent;
  onChange: (value: Accent) => void;
  options?: readonly Accent[];
};

// The accent names and every swatch's paints come from the kit's shared module,
// so this picker cannot drift from the vanilla factory or from the tokens.
//
// The buttons carry no data-accent-pick. That attribute is what
// wireTopbar(root = document) binds its own click handler to, so a half-migrated
// page — one that must call wireTopbar to wire its vanilla footer — would adopt
// this picker, apply the accent and write it to localStorage behind React, which
// then never repairs its own DOM because `value` did not change. Dropdown and
// Drawer omit their wiring hooks for the same reason, and ThemeToggle omits
// data-theme-toggle. The container keeps data-accent-group: it hooks nothing on
// its own, and removing it would make a stray vanilla chip fall back to `root`.
export const AccentPicker = forwardRef<HTMLDivElement, AccentPickerProps>(function AccentPicker({
  value, onChange, options = ACCENTS, className, 'aria-label': label = 'Accent', ...rest
}, ref) {
  return <div {...rest} ref={ref} className={['ui-accent-picker', className].filter(Boolean).join(' ')}
    data-accent-group="" role="group" aria-label={label}>
    {options.map(accent => {
      const title = accent.charAt(0).toUpperCase() + accent.slice(1);
      return <button key={accent} type="button"
        className={accent === value ? 'is-active' : undefined}
        style={accentSwatchStyle(accent) as CSSProperties}
        aria-pressed={accent === value} aria-label={`${title} accent`} title={title}
        onClick={() => onChange(accent)} />;
    })}
  </div>;
});
