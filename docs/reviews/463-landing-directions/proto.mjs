// Shared bootstrap for the #463 landing directions. Disposable review
// prototypes, not kit source: they borrow the site's REAL chrome rather than a
// copy of it, so a direction is judged against the topbar and footer the page
// actually ships. See the README beside this file.
import { topbar, footer, CHROME_CSS, CHROME_JS } from '../../../site/chrome.mjs';

const q = new URLSearchParams(location.search);

/* The theme and accent a capture asks for, written where the shared script
   reads them. It restores from localStorage on load, so seeding the store is
   how a shot pins a theme without the prototype owning a second code path. */
const theme = q.get('theme');
const accent = q.get('accent');
try {
  if (theme) localStorage.setItem('apliteni-ui-theme', theme);
  if (accent) localStorage.setItem('apliteni-ui-accent', accent);
} catch { /* a private window still renders the page */ }

/** The version the topbar chip shows, read from the package rather than typed
 *  here: a number written into a prototype is stale by the next release. */
async function packageVersion() {
  try {
    const res = await fetch(new URL('../../../package.json', import.meta.url));
    return `v${(await res.json()).version}`;
  } catch { return ''; }
}

/** Put the shared chrome in place, then run its behaviour over it. */
export async function mountChrome() {
  const version = await packageVersion();
  const style = document.createElement('style');
  style.textContent = CHROME_CSS;
  document.head.append(style);

  document.body.insertAdjacentHTML('afterbegin', topbar('').replaceAll('{{VERSION}}', version));
  document.body.insertAdjacentHTML('beforeend', footer());

  // CHROME_JS is a plain script body that reads the topbar out of the document,
  // so it runs after the markup lands. Function, not eval: the prototype gives
  // it its own scope instead of leaking var declarations into the module.
  new Function(CHROME_JS)();

  document.documentElement.dataset.protoReady = 'true';
}
