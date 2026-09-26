import { useSyncExternalStore } from 'react';
import { icon } from '@apliteni/apliteni-ui';
import './ThemeToggle.css';

const STORAGE_KEY = 'apliteni-strategy-theme';
const CHOICE_EVENT = 'apliteni-theme-choice';
type Theme = 'dark' | 'light' | 'auto';

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

export function ThemeToggle({ labelled = false }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'auto' as const);
  const next = theme === 'dark' ? 'light' : theme === 'light' ? 'auto' : 'dark';
  const label = theme === 'auto' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark';
  const name = `Theme: ${label}. Switch to ${next}.`;
  const toggle = () => {
    document.documentElement.setAttribute('data-theme-choice', next);
    document.documentElement.setAttribute('data-theme', next === 'auto' ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the choice for this page. */ }
    window.dispatchEvent(new Event(CHOICE_EVENT));
  };
  const button = <button type="button" className="toggle" aria-label={name} title={name} onClick={toggle}>
    <span className="ic" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(theme === 'auto' ? 'monitor' : theme === 'light' ? 'sun' : 'moon') }} />
  </button>;
  return labelled ? <span className="ui-theme-toggle">{button}<span>{label} theme</span></span> : button;
}
