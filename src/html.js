// Shared HTML boundaries; public esc remains exported from components/index.js.
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = value => String(value == null ? '' : value).replace(/[&<>"]/g, c => ENTITIES[c]);

// Legacy topbar/brand slots accept already escaped HTML. Preserve their entities.
export const trustedAttr = value => String(value ?? '').replace(/[<>"]/g, c => ENTITIES[c]);

// why: docs/specification.md#vanilla-html-boundaries
export function safeUrl(value, fallback = '#') {
  const raw = String(value ?? '');
  const scheme = raw.replace(/[\t\n\r]/g, '').replace(/^[\u0000-\u0020]+/, '');
  return /^(?:javascript|data|vbscript):/i.test(scheme) ? fallback : raw;
}

export function trustedUrl(value) {
  // Legacy attributes are already HTML encoded, so check their decoded scheme.
  const decoded = String(value ?? '').replace(/&#(x[\da-f]+|\d+);?|&(colon|Tab|NewLine);/gi, (match, number, name) => {
    if (!number) return { colon: ':', tab: '\t', newline: '\n' }[name.toLowerCase()];
    const code = number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\ufffd';
  });
  return safeUrl(decoded) === '#' ? '#' : trustedAttr(value);
}
