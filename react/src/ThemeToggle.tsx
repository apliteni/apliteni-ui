import { useSyncExternalStore } from 'react';
import { icon } from '@apliteni/apliteni-ui';
import './ThemeToggle.css';

const STORAGE_KEY = 'apliteni-strategy-theme';
const CHOICE_EVENT = 'apliteni-theme-choice';
type Theme = 'dark' | 'light';
let unsavedChoice: Theme | null = null;

/** Place in a head script before styles load to apply the theme before first paint. */
export const THEME_INIT_SCRIPT = `(()=>{let t;try{t=localStorage.getItem('apliteni-strategy-theme')}catch{}document.documentElement.setAttribute('data-theme',t==='dark'||t==='light'?t:window.matchMedia?.('(prefers-color-scheme: light)').matches?'light':'dark')})()`;

function storedTheme(): Theme | null {
  if (unsavedChoice) return unsavedChoice;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch { return null; }
}
function snapshot(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}
function subscribe(notify: () => void) {
  const root = document.documentElement;
  const media = window.matchMedia?.('(prefers-color-scheme: light)');
  let explicit = storedTheme() !== null;
  const applyPreference = () => root.setAttribute('data-theme', storedTheme() ?? (media?.matches ? 'light' : 'dark'));
  const onSystem = () => { if (!explicit) applyPreference(); };
  const onChoice = () => { explicit = true; notify(); };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    unsavedChoice = null;
    explicit = storedTheme() !== null;
    applyPreference();
  };
  const observer = new MutationObserver(notify);
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  applyPreference();
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
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'dark' as const);
  const name = theme === 'light' ? 'Theme: Light. Switch to dark.' : 'Theme: Dark. Switch to light.';
  const toggle = () => {
    const next = snapshot() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    unsavedChoice = next;
    try { localStorage.setItem(STORAGE_KEY, next); unsavedChoice = null; } catch { /* Keep the choice for this page. */ }
    window.dispatchEvent(new Event(CHOICE_EVENT));
  };
  const button = <button type="button" className="toggle" aria-label={name} title={name} onClick={toggle}>
    <span className="ic" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(theme === 'light' ? 'sun' : 'moon') }} />
  </button>;
  return labelled ? <span className="ui-theme-toggle">{button}<span>{theme === 'light' ? 'Light' : 'Dark'} theme</span></span> : button;
}
