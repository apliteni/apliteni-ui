// Footer factory — the canonical site/app footer as an HTML string, matching the
// topbar idiom so any server-render consumer adopts it with no framework.
// Composes a brand lockup, grouped link columns, a legal/copyright row, optional
// social icons and an optional theme/accent switcher slot. Three variants:
//   full — multi-column marketing footer (brand + columns + legal bar)
//   slim — a single legal/copyright row
//   app  — compact, in-product (tight padding, surface background)
import { brand as brandLockup } from '../assets/brand.js';
import { esc } from './index.js';

const cx = (...a) => a.filter(Boolean).join(' ');

// Minimal brand-glyph set for the optional social row. Feather-ish where generic,
// simplified brand marks otherwise. Kept local so the footer is self-contained
// (the shared icon set is line-only and has no brand glyphs).
const SOCIAL = {
  github: '<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/>',
  x: '<path d="M4 3h4.5l4 5.5L17.5 3H21l-6.5 8.5L21 21h-4.5l-4.3-5.9L7 21H3.5l6.8-8.9z"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10v6M8 7v.01M12 16v-3a2 2 0 0 1 4 0v3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m3 7 9 6 9-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
};

function socialLink({ label, href = '#', icon: ic = 'github' } = {}) {
  const glyph = SOCIAL[ic] || SOCIAL.github;
  const fill = ic === 'github' || ic === 'x' ? 'currentColor' : 'none';
  return `<a class="ui-footer__social" href="${href}" aria-label="${esc(label || ic)}">` +
    `<svg viewBox="0 0 24 24" fill="${fill}" aria-hidden="true">${glyph}</svg></a>`;
}

function linkList(links = []) {
  return `<ul class="ui-footer__links">${links.map(({ label, href = '#', target }) =>
    `<li><a href="${href}"${target ? ` target="${target}" rel="noreferrer"` : ''}>${esc(label)}</a></li>`).join('')}</ul>`;
}

function column({ title, links = [] } = {}) {
  return `<div class="ui-footer__col">` +
    (title ? `<h4 class="ui-footer__col-title">${esc(title)}</h4>` : '') +
    linkList(links) + `</div>`;
}

// Inline legal row (label + legal links + switcher slot). Shared by every variant.
function legalBar({ legal, legalLinks = [], switcher = '' } = {}) {
  const links = legalLinks.length
    ? `<nav class="ui-footer__legal-links" aria-label="Legal">` +
      legalLinks.map(({ label, href = '#' }) => `<a href="${href}">${esc(label)}</a>`).join('') + `</nav>`
    : '';
  const sw = switcher ? `<div class="ui-footer__switcher">${switcher}</div>` : '';
  return `<div class="ui-footer__bar">` +
    `<span class="ui-footer__legal">${esc(legal)}</span>` +
    `${links}${sw}</div>`;
}

// Full footer. Pass which pieces to include; everything but `variant` is optional.
//   brand      — lockup options object ({ word, href }) or false to hide it
//   tagline    — short line under the brand (full variant only)
//   columns    — [{ title, links: [{ label, href, target }] }]
//   social     — [{ label, href, icon }]  (icon: github|x|linkedin|mail)
//   legal      — copyright text (defaults to "© <year> Apliteni")
//   legalLinks — [{ label, href }] inline row links
//   switcher   — trusted HTML slot (e.g. accentPicker()+themeToggle()), or ''
export function footer({
  variant = 'full',
  brand = { word: 'Strategy' },
  tagline = '',
  columns = [],
  social = [],
  legal = `© ${new Date().getFullYear()} Apliteni`,
  legalLinks = [],
  switcher = '',
} = {}) {
  const cls = cx('ui-footer', `ui-footer--${variant}`);

  // slim + app: a single legal row, no brand block or columns.
  if (variant === 'slim' || variant === 'app') {
    return `<footer class="${cls}" role="contentinfo"><div class="ui-footer__in">` +
      legalBar({ legal, legalLinks, switcher }) +
      `</div></footer>`;
  }

  // full: brand block + link columns on top, legal bar below a divider.
  const socialRow = social.length
    ? `<div class="ui-footer__socials">${social.map(socialLink).join('')}</div>` : '';
  const brandBlock = brand !== false
    ? `<div class="ui-footer__brand">${brandLockup(brand)}` +
      (tagline ? `<p class="ui-footer__tagline">${esc(tagline)}</p>` : '') +
      socialRow + `</div>`
    : '';
  const nav = columns.length
    ? `<nav class="ui-footer__nav" aria-label="Footer">${columns.map(column).join('')}</nav>` : '';

  return `<footer class="${cls}" role="contentinfo"><div class="ui-footer__in">` +
    `<div class="ui-footer__top">${brandBlock}${nav}</div>` +
    legalBar({ legal, legalLinks, switcher }) +
    `</div></footer>`;
}
