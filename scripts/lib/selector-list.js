/* One splitter for CSS selector lists, shared by every gate that reads one.
 *
 * A selector list is separated by commas at the top level only. `String.split(',')`
 * does not know that, so `:where(.a, .b) :focus-visible` arrives as
 * `:where(.a` and `.b) :focus-visible` — two fragments that match nothing, and a
 * gate comparing them against a list of real selectors passes or fails for the
 * wrong reason. #521.
 */

/**
 * Split a CSS selector list on its top-level commas.
 *
 * Commas inside `()` — `:where()`, `:is()`, `:not()`, `:has()`, `:nth-child()` —
 * inside `[]`, and inside a quoted string stay with their selector. Parts come
 * back trimmed, and an empty part is dropped.
 *
 * The prelude must already be free of comments. A comma inside `/* … *\/` is
 * treated as a separator, and a comment left in a part would travel on into
 * whatever the caller does with it — `querySelectorAll` throws on one. Every
 * caller blanks comments before reading rules out of a sheet; `stateBases` in
 * stories/lib/contrast.js is the one that reads a story's raw <style> text and
 * so blanks them itself.
 *
 * @param {string} selector one rule's prelude, comments already blanked
 * @returns {string[]} the selectors it lists
 */
export function splitSelectorList(selector) {
  const parts = [];
  let part = '';
  let depth = 0;
  let quote = null;
  for (let i = 0; i < selector.length; i += 1) {
    const char = selector[i];
    if (char === '\\') {
      part += char + (selector[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (quote) {
      part += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      part += char;
      continue;
    }
    if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    else if (char === ',' && depth <= 0) {
      parts.push(part);
      part = '';
      continue;
    }
    part += char;
  }
  parts.push(part);
  return parts.map((one) => one.trim()).filter(Boolean);
}
