import { icon, sun, moon } from '../assets/icons.js';

// The glyph for a saved theme choice, including automatic mode. The vanilla toggle
// and the React <ThemeToggle> both draw it.
export const themeIcon = (t) => t === 'auto' ? icon('monitor') : t === 'light' ? sun : moon;
