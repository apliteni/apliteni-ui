import { formatNumericValue, formatDeltaValue } from '../logic/table-values.js';
import { esc } from './index.js';
import { safeUrl } from '../html.js';
export function numericValue(options = {}) {
  const value = formatNumericValue(options);
  return `<span class="ui-value"${value.missing !== undefined ? ` aria-label="${esc(value.missing)}"` : ''}>${esc(value.text)}${value.unit ? `<span class="ui-value__unit">${esc(value.unit)}</span>` : ''}</span>`;
}

export function deltaValue(options = {}) {
  const value = formatDeltaValue(options);
  return `<span class="${value.className}"${value.basisId ? ` aria-describedby="${esc(value.basisId)}"` : ''}>${esc(value.text)}</span>`;
}

export function rowIdentity({ symbol = '', name = '', logo, href } = {}) {
  const tag = href ? 'a' : 'span';
  return `<${tag} class="ui-identity"${href ? ` href="${esc(safeUrl(href))}"` : ''}>`
    + `<span class="ui-identity__logo" aria-hidden="true"><span>${esc(symbol.slice(0, 1))}</span>${logo ? `<img src="${esc(safeUrl(logo, ''))}" alt="">` : ''}</span>`
    + `<span class="ui-identity__symbol">${esc(symbol)}</span><span class="ui-identity__name">${esc(name)}</span></${tag}>`;
}

const initializedImages = new WeakSet();

// Images keep their fallback underneath; no inline handlers in server-rendered markup.
export function initRowIdentity(root = document) {
  root.querySelectorAll('.ui-identity__logo img').forEach(img => {
    if (img.complete && !img.naturalWidth) img.hidden = true;
    if (initializedImages.has(img)) return;
    initializedImages.add(img);
    img.addEventListener('error', () => { img.hidden = true; });
    img.addEventListener('load', () => { img.hidden = false; });
  });
}
