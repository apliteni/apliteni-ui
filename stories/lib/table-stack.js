// A table that stacks names its own roles: `.ui-table--stack` changes `display` on the
// table and everything in it, and 560px is not a moment markup can react to. Shared by
// the vanilla gate (stories/table-stack.test.js) and the React one
// (react/src/table-stack.test.tsx), which walk their own stories.
import { JSDOM } from 'jsdom';

export const MODIFIER = 'ui-table--stack';

/** The role each part of a stacked table has to carry, by tag name. */
export const ROLES = {
  TABLE: 'table',
  THEAD: 'rowgroup',
  TBODY: 'rowgroup',
  TFOOT: 'rowgroup',
  TR: 'row',
  TH: 'columnheader',
  TD: 'cell',
};

/** Anything in a header row that the keyboard can reach. */
export const FOCUSABLE = ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]',
  '[contenteditable]'].join(', ');
const FOCUSABLE_IN_HEAD = FOCUSABLE.split(', ').map((sel) => `thead ${sel}`).join(', ');

/**
 * A focusable outside the table that says it drives THIS table, through `aria-controls`.
 *
 * "Some focusable on the page" is not the rule and does not hold it: a sidebar link, a skip
 * link or the scroll region's own tabindex satisfies that, and #532's re-review satisfied the
 * first version of this check with the exact defect it was written to catch. The tie has to be
 * a stated relationship, so it is the one ARIA has for it.
 */
export const sortControlFor = (table) => {
  const id = table.getAttribute('id');
  if (!id) return null;
  return [...table.getRootNode().querySelectorAll(FOCUSABLE)].find((el) =>
    !table.contains(el)
    && (el.getAttribute('aria-controls') ?? '').split(/\s+/).includes(id)) ?? null;
};

/* -- The rule --------------------------------------------------------------- */

/**
 * Every stacked table in one fragment, with what each one is missing.
 * Returns `{ tables, problems }` so a caller can tell "nothing wrong" from "nothing seen".
 */
export function stackedTables(html, where) {
  const doc = JSDOM.fragment(`<div>${html}</div>`);
  const problems = [];
  const tables = [...doc.querySelectorAll(`table.${MODIFIER}`)];

  for (const table of tables) {
    const say = (s) => `${where}: ${s}`;
    if (!table.tHead) {
      problems.push(say('a stacked table with no header row — the clipped header is what gives a cell its column name'));
    }
    // A clipped header cannot show a focus ring, so nothing in it may take focus.
    for (const el of table.querySelectorAll(FOCUSABLE_IN_HEAD)) {
      if (el.hasAttribute('disabled') || el.getAttribute('tabindex') === '-1') continue;
      problems.push(say(
        `<${el.tagName.toLowerCase()}> in the clipped header takes focus, and a clipped `
        + 'header can draw no ring — move the control above the table',
      ));
    }

    // An order announced in a clipped header needs a control that says it drives this table.
    if (table.querySelector('thead [aria-sort]') && !sortControlFor(table)) {
      problems.push(say(
        'the clipped header announces aria-sort, and no focusable outside the table names it '
        + `in aria-controls${table.id ? '' : ' (the table has no id to name)'} — a reader is `
        + 'told the order and given no way to set it',
      ));
    }

    // Every element of the table, including the table itself: one missing role on one row
    // is one row that stops being a row.
    for (const el of [table, ...table.querySelectorAll('thead, tbody, tfoot, tr, th, td')]) {
      const want = ROLES[el.tagName];
      if (!want) continue;
      const got = el.getAttribute('role');
      if (got !== want) {
        problems.push(say(
          `<${el.tagName.toLowerCase()}> carries role ${got === null ? '(none)' : `"${got}"`}, not "${want}"`,
        ));
      }
    }
  }
  return { tables: tables.length, problems };
}

