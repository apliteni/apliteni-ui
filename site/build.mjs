// Build the static landing site: emit the kit stylesheet from the package's own
// inline export, and copy the landing HTML into public/. Storybook static is
// copied in by the Dockerfile (or `npm run build-storybook` locally).
import { cssText } from '../src/inline.js';
import { changelogMain } from './changelog.mjs';
import { topbar, footer, CHROME_CSS, CHROME_JS } from './chrome.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const here = new URL('.', import.meta.url);
const pub = new URL('public/', here);
mkdirSync(new URL('assets/', pub), { recursive: true });
mkdirSync(new URL('changelog/', pub), { recursive: true });

const version = JSON.parse(readFileSync(new URL('../package.json', here), 'utf8')).version;
// Content hash busts the browser cache whenever the CSS actually changes — the
// HTML is served no-cache, so a hashed stylesheet URL guarantees no stale kit.css
// lingers after a deploy (a 1h cache once made a shipped fix look unshipped).
const cssHash = createHash('sha1').update(cssText).digest('hex').slice(0, 10);
const ver = (s) => s.replaceAll('{{VERSION}}', `v${version}`).replaceAll('{{CSSHASH}}', cssHash);

// Inject the one shared chrome (topbar/footer/CSS/JS) into each page. Runs before
// ver() so the {{VERSION}} inside the injected topbar still gets resolved.
const chrome = (s, active) => s
  .replace('{{TOPBAR}}', topbar(active))
  .replace('{{FOOTER}}', footer())
  .replace('{{CHROME_CSS}}', CHROME_CSS)
  .replace('{{CHROME_JS}}', CHROME_JS);

const html = ver(chrome(readFileSync(new URL('index.html', here), 'utf8'), ''));
const changelog = ver(chrome(readFileSync(new URL('changelog.html', here), 'utf8'), 'changelog')
  .replace('{{MAIN}}', () => changelogMain()));

// Brand mark — the "sub-theme prism": one rounded tile, the four ready-made
// accents (Nebula / Phoenix / Ocean / Emerald). Emitted as a file so the pages
// reference /favicon.svg rather than a fragile inline data URI.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
  `<defs><clipPath id="c"><rect width="32" height="32" rx="8"/></clipPath></defs>` +
  `<g clip-path="url(#c)">` +
  `<rect width="16" height="16" fill="#9b5dff"/><rect x="16" width="16" height="16" fill="#ff6a3d"/>` +
  `<rect y="16" width="16" height="16" fill="#3b9dff"/><rect x="16" y="16" width="16" height="16" fill="#16c98a"/>` +
  `</g></svg>`;

writeFileSync(new URL('assets/kit.css', pub), cssText);
writeFileSync(new URL('favicon.svg', pub), faviconSvg);
writeFileSync(new URL('index.html', pub), html);
writeFileSync(new URL('changelog/index.html', pub), changelog);

console.log(`site: wrote index.html + changelog/ + kit.css (v${version}, css#${cssHash})`);
