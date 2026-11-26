import { useSyncExternalStore } from 'react';
import { themeIcon } from '@apliteni/apliteni-ui';
import './ThemeToggle.css';

const STORAGE_KEY = 'apliteni-strategy-theme';
const CHOICE_EVENT = 'apliteni-theme-choice';
export type Theme = 'dark' | 'light' | 'auto';

/** Place in a head script before styles load to apply the theme before first paint. */
export const THEME_INIT_SCRIPT = `(()=>{let t;try{t=localStorage.getItem('apliteni-strategy-theme')}catch{}document.documentElement.setAttribute('data-theme',t==='dark'||t==='light'?t:window.matchMedia?.('(prefers-color-scheme: light)').matches?'light':'dark')})()`;

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' || value === 'auto' ? value : null;
  } catch { return snapshot(); }
}
function snapshot(): Theme {
  const choice = document.documentElement.getAttribute('data-theme-choice');
  return choice === 'dark' || choice === 'light' ? choice : 'auto';
}
function subscribe(notify: () => void) {
  const root = document.documentElement;
  const media = window.matchMedia?.('(prefers-color-scheme: light)');
  const applyPreference = (choice: Theme) => {
    root.setAttribute('data-theme-choice', choice);
    root.setAttribute('data-theme', choice === 'auto' ? (media?.matches ? 'light' : 'dark') : choice);
  };
  const onSystem = () => { if (snapshot() === 'auto') applyPreference('auto'); };
  const onChoice = () => notify();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    applyPreference(storedTheme() ?? 'auto');
  };
  const observer = new MutationObserver(notify);
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-theme-choice'] });
  applyPreference(root.hasAttribute('data-theme-choice') ? snapshot() : storedTheme() ?? 'auto');
  media?.addEventListener('change', onSystem);
  window.addEventListener(CHOICE_EVENT, onChoice);
  window.addEventListener('storage', onStorage);
  return () => {
    observer.disconnect();
    media?.removeEventListener('change', onSystem);
    window.removeEventListener(CHOICE_EVENT, onChoice);
    window.removeEventListener('storage', onStorage);
  };
}

export type ThemeToggleProps = {
  /** Show the current theme beside the icon. */
  labelled?: boolean;
};

/** The saved theme, its words, a switch to the next one and a setter for any one.
 *  ThemeToggle cycles; the AppShell account menu's Theme submenu sets (#732, #736). */
export function useThemeChoice() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'auto' as const);
  const next = theme === 'dark' ? 'light' : theme === 'light' ? 'auto' : 'dark';
  const label = theme === 'auto' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark';
  const name = `Theme: ${label}. Switch to ${next}.`;
  const set = (choice: Theme) => {
    const nextTheme = choice === 'auto' ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : choice;
    document.documentElement.setAttribute('data-theme-choice', choice);
    try { localStorage.setItem(STORAGE_KEY, choice); } catch { /* Keep the choice for this page. */ }
    window.dispatchEvent(new Event(CHOICE_EVENT));
    // #900: the theme change cross-fades the whole page, its scrollbar and any open scrim
    // in 250ms (--dur-med), as ThemeToggle.css times it. The view transition carries the page
    // and the scrim, but the browser keeps the viewport scrollbar outside it, so its colour is
    // animated with the same time and easing. Under reduced motion, and where the browser has
    // no view transition, the change is one step.
    const doc = document as Document & { startViewTransition?: (apply: () => void) => unknown };
    const root = document.documentElement;
    const apply = () => root.setAttribute('data-theme', nextTheme);
    const crossfade = () => {
      const before = getComputedStyle(root).scrollbarColor;
      apply();
      const after = getComputedStyle(root).scrollbarColor;
      const style = getComputedStyle(root);
      const time = style.getPropertyValue('--dur-med').trim();
      const easing = style.getPropertyValue('--ease').trim() || 'ease';
      const ms = time.endsWith('ms') ? parseFloat(time) : parseFloat(time) * 1000;
      if (before !== 'auto' && after !== 'auto' && before !== after && typeof root.animate === 'function' && Number.isFinite(ms)) {
        root.animate({ scrollbarColor: [before, after] }, { duration: ms, easing, fill: 'both' });
      }
    };
    if (typeof doc.startViewTransition === 'function' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      doc.startViewTransition(crossfade);
    } else {
      apply();
    }
  };
  const toggle = () => set(next);
  return { theme, next, label, name, toggle, set };
}

export function ThemeToggle({ labelled = false }: ThemeToggleProps) {
  const { theme, label, name, toggle } = useThemeChoice();
  const button = <button type="button" className="toggle" aria-label={name} title={name} onClick={toggle}>
    <span className="ic" aria-hidden="true" dangerouslySetInnerHTML={{ __html: themeIcon(theme) }} />
  </button>;
  return labelled ? <span className="ui-theme-toggle">{button}<span>{label} theme</span></span> : button;
}
