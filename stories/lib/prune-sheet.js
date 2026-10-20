/* Drop the rules of a stylesheet that cannot match a given document, so a style read does not scan them.
 *
 * JSDOM's getComputedStyle tests every rule in every sheet against the element it is asked about,
 * and the kit's sheet has thousands. A story uses a few dozen of its classes. A rule whose selector
 * needs a class that no element in the document carries cannot match, so leaving it out changes no
 * computed style. Nothing else is touched: an at-rule block, a selector with no class outside
 * brackets and parentheses, and a selector that spells a backslash are all kept. The rules inside
 * @media, @supports, @container and @layer are pruned the same way; any other at-rule stays whole.
 *
 * Limit: the class set is read once, so it is only valid while no class is added to the document.
 * The contrast and accessibility walks add only `data-ui-state`, which this does not look at.
 */
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

const CLASS = /\.([\w-]+)/g;
/* At-rules whose block holds style rules, which are pruned inside; any other at-rule stays whole. */
const NESTS = /^@(media|supports|container|layer)\b/i;

/** Every class name on `root` and the elements below it. */
export function classesIn(root) {
  const out = new Set();
  const visit = (el) => {
    for (const name of (el.getAttribute('class') || '').split(/\s+/)) if (name) out.add(name);
  };
  visit(root);
  for (const el of root.querySelectorAll('*')) visit(el);
  return out;
}

/** The selector with strings, attribute selectors and parenthesised arguments taken out. */
function topLevel(selector) {
  let out = selector.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""').replace(/\[[^\]]*\]/g, '[]');
  for (let before = ''; before !== out;) {
    before = out;
    out = out.replace(/\([^()]*\)/g, '');
  }
  return out;
}

/** Could this selector match in a document whose classes are `present`? True when unsure. */
export function couldMatch(selector, present) {
  if (selector.includes('\\')) return true;
  for (const [, name] of topLevel(selector).matchAll(CLASS)) if (!present.has(name)) return false;
  return true;
}

/** `css` without the plain rules that need a class missing from `present`. */
export function pruneSheet(css, present) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) { out.push(css.slice(i)); break; }
    let depth = 1;
    let j = open + 1;
    let quote = null;
    for (; j < css.length && depth > 0; j += 1) {
      const char = css[j];
      if (char === '\\') { j += 1; continue; }
      if (quote) { if (char === quote) quote = null; continue; }
      if (char === '"' || char === "'") quote = char;
      else if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
    }
    const prelude = css.slice(i, open);
    const block = css.slice(i, j);
    const head = prelude.trim();
    if (NESTS.test(head)) {
      const inner = pruneSheet(block.slice(prelude.length + 1, -1), present);
      if (inner.trim()) out.push(`${prelude}{${inner}}`);
    } else if (head.startsWith('@') || splitSelectorList(prelude).some((selector) => couldMatch(selector, present))) {
      out.push(block);
    }
    i = j;
  }
  return out.join('');
}
