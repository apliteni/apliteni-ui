import { wireElements } from './lifecycle.js';
import { esc } from './index.js';

export function numericValue({ value, unit = '', missing = 'Not available' } = {}) {
  if (value == null || value === '') return `<span class="ui-value" aria-label="${esc(missing)}">—</span>`;
  return `<span class="ui-value">${esc(value)}${unit ? `<span class="ui-value__unit">${esc(unit)}</span>` : ''}</span>`;
}

export function deltaValue({ value, tone = 'neutral', basisId, missing = 'No earlier figure' } = {}) {
  const present = value != null && value !== '';
  const judged = present && ['success', 'danger'].includes(tone) && !/^[+−-]?0(?:[.,]0+)?%?$/.test(String(value).replace(/\s/g, ''));
  return `<span class="ui-delta${judged ? ` ui-delta--${tone}` : ''}"${basisId ? ` aria-describedby="${esc(basisId)}"` : ''}>${esc(present ? value : missing)}</span>`;
}

export function rowIdentity({ symbol = '', name = '', logo, href } = {}) {
  const tag = href ? 'a' : 'span';
  return `<${tag} class="ui-identity"${href ? ` href="${esc(href)}"` : ''}>`
    + `<span class="ui-identity__logo" aria-hidden="true"><span>${esc(symbol.slice(0, 1))}</span>${logo ? `<img src="${esc(logo)}" alt="">` : ''}</span>`
    + `<span class="ui-identity__symbol">${esc(symbol)}</span><span class="ui-identity__name">${esc(name)}</span></${tag}>`;
}


// Images keep their fallback underneath; no inline handlers in server-rendered markup.
export function initRowIdentity(root = document) {
  return wireElements(root, '.ui-identity__logo img', 'row-identity', (img, life) => {
    if (img.complete && !img.naturalWidth) img.hidden = true;
    life.on(img, 'error', () => { img.hidden = true; });
    life.on(img, 'load', () => { img.hidden = false; });
  });
}
