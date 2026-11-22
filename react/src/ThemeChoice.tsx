import { useId } from 'react';
import { useThemeChoice, type Theme } from './ThemeToggle';
import './ThemeChoice.css';

export type ThemeChoiceProps = {
  /** The group's name. Give the name of the card or the row that holds it. */
  label?: string;
};

const OPTIONS: { value: Theme; name: string }[] = [
  { value: 'auto', name: 'System' },
  { value: 'light', name: 'Light' },
  { value: 'dark', name: 'Dark' },
];

// A small page in one theme: a rail, a title and a card. The theme blocks give each scene
// its theme's values, so the drawing follows the kit and not a copy of it.
const Scene = ({ theme }: { theme: 'light' | 'dark' }) => <span className={`ui-theme-choice__scene ui-theme-choice__scene--${theme}`}>
  <span className="ui-theme-choice__rail"><span /><span /><span /></span>
  <span className="ui-theme-choice__main">
    <span className="ui-theme-choice__title" />
    <span className="ui-theme-choice__card"><span /><span /></span>
  </span>
</span>;

/** The theme as three picture cards: System, Light and Dark. One radio group, so Tab
 *  stops once and the arrow keys move. A choice applies and is stored at once. */
export function ThemeChoice({ label = 'Theme' }: ThemeChoiceProps) {
  const { theme, set } = useThemeChoice();
  const name = useId();
  return <div className="ui-theme-choice" role="radiogroup" aria-label={label}>
    {OPTIONS.map(({ value, name: text }) => <label key={value} className="ui-theme-choice__option">
      <input type="radio" className="ui-theme-choice__input ui-sr" name={name} value={value}
        checked={theme === value} onChange={() => set(value)} />
      <span className="ui-theme-choice__pic" aria-hidden="true">
        {value === 'dark' ? <Scene theme="dark" /> : <Scene theme="light" />}
        {value === 'auto' && <Scene theme="dark" />}
      </span>
      <span className="ui-theme-choice__name">{text}</span>
    </label>)}
  </div>;
}
