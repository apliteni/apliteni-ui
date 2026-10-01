/* Rule: a table that stacks names its own roles.
 *
 * `.ui-table--stack` changes `display` on the table and everything in it, and every engine
 * drops a table element's implicit role when its display changes. The kit cannot write a
 * role from a stylesheet, and 560px is not a moment markup can react to, so a stacked
 * table carries its roles at every width — or it reads as runs of text, which is the half
 * of #499 no CSS gate can see.
 *
 * why: docs/specification.md#dense-financial-tables
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const MODIFIER = 'ui-table--stack';

/** The role each part of a stacked table has to carry, by tag name. */
const ROLES = {
  TABLE: 'table',
  THEAD: 'rowgroup',
  TBODY: 'rowgroup',
  TFOOT: 'rowgroup',
  TR: 'row',
  TH: 'columnheader',
  TD: 'cell',
};

/** Anything in a header row that the keyboard can reach. */
const FOCUSABLE_IN_HEAD = ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]',
  '[contenteditable]'].map((sel) => `thead ${sel}`).join(', ');

/* -- The subjects, swept ---------------------------------------------------- */

/** Every `*.stories.js` under stories/, at whatever depth it was put. */
function storyFiles(dir = here) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...storyFiles(full));
    else if (name.endsWith('.stories.js')) out.push(full);
  }
  return out;
}

const subjects = storyFiles().filter((f) => readFileSync(f, 'utf8').includes(MODIFIER));

/** Storybook's HTML renderer returns a string or a node; anything else is coverage lost. */
function serialize(out, where) {
  if (typeof out === 'string') return out;
  assert.ok(out && typeof out === 'object', `${where} rendered ${typeof out}, which this gate cannot read`);
  if (typeof out.outerHTML === 'string') return out.outerHTML;
  if (out.nodeType === 11) return [...out.childNodes].map((n) => n.outerHTML ?? n.textContent).join('');
  assert.fail(`${where} rendered a node this gate cannot read`);
}

/* The other thing a stylesheet cannot hold: a clipped header is read, not operated. A
 * control left in one is a focus stop with nothing drawn on screen — no ring, nowhere for
 * the eye to go — so a stacked table's header cells hold text and a sort control belongs
 * on the row above the table.
 *
 * Limit: this reads markup. It proves the roles are there, not that a screen reader
 * announces the table; the #499 captures and stories/a11y.test.js cover the rest.
 */

/* -- The rule --------------------------------------------------------------- */

/**
 * Every stacked table in one fragment, with what each one is missing.
 * Returns `{ tables, problems }` so a caller can tell "nothing wrong" from "nothing seen".
 */
function stackedTables(html, where) {
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

test('the sweep finds the stories that stack', () => {
  assert.ok(
    subjects.length > 0,
    `no story under stories/ mentions ${MODIFIER}, so this gate is checking nothing. The `
    + 'modifier ships with the kit; a story that shows it is how anyone sees it work.',
  );
});

test('every stacked table in a story names its own roles', async () => {
  const problems = [];
  let rendered = 0;
  let found = 0;

  for (const file of subjects) {
    const mod = await import(file);
    const rel = path.relative(here, file);
    const def = mod.default ?? {};
    let stories = 0;

    for (const [name, story] of Object.entries(mod)) {
      const render = typeof story === 'function' ? story : story?.render ?? def.render;
      if (name === 'default' || typeof render !== 'function') continue;
      stories += 1;
      const where = `${rel} → ${name}`;
      let html;
      try {
        html = serialize(render({ ...def.args, ...story.args }, { args: { ...def.args, ...story.args } }), where);
      } catch (err) {
        // A story that will not render is not covered. Say so rather than skipping it.
        problems.push(`${where}: render threw: ${err && err.message}`);
        continue;
      }
      rendered += 1;
      const result = stackedTables(html, where);
      found += result.tables;
      problems.push(...result.problems);
    }

    assert.ok(stories > 0, `no stories found in stories/${rel} — did the export shape change?`);
  }

  assert.deepStrictEqual(problems, [], `\n  ${problems.join('\n  ')}\n`);
  assert.ok(rendered > 0, 'no story rendered, so no markup was read');
  assert.ok(
    found >= subjects.length,
    `${subjects.length} story files mention ${MODIFIER} but only ${found} stacked tables were `
    + 'found in what they rendered: the modifier is named somewhere a reader never sees it.',
  );
});

/* -- The gate's own gate ---------------------------------------------------- */

const WHOLE = `<table class="ui-table ui-table--stack" role="table">
  <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Who</th>
    <th scope="col" role="columnheader">Change</th></tr></thead>
  <tbody role="rowgroup"><tr role="row"><td role="cell">t.quill</td>
    <td role="cell" class="ui-table__long">raised the cap</td></tr></tbody>
</table>`;

test('the gate rejects a stacked table that leans on the implicit roles', () => {
  assert.deepEqual(stackedTables(WHOLE, 'fixture'), { tables: 1, problems: [] });

  const survived = [];
  for (const [what, mutate] of [
    ['no role on the table', (h) => h.replace('ui-table--stack" role="table"', 'ui-table--stack"')],
    ['no role on the row groups', (h) => h.replaceAll(' role="rowgroup"', '')],
    ['no role on the rows', (h) => h.replaceAll(' role="row"', '')],
    ['no role on the headers', (h) => h.replaceAll(' role="columnheader"', '')],
    ['no role on the cells', (h) => h.replaceAll(' role="cell"', '')],
    ['a grid cell in place of a table cell', (h) => h.replaceAll('role="cell"', 'role="gridcell"')],
    ['no header row to clip', (h) => h.replace(/<thead[\s\S]*?<\/thead>/, '')],
    ['a sort control left in the clipped header',
      (h) => h.replace('>Change</th>', '><button type="button">Change</button></th>')],
  ]) {
    const mutated = mutate(WHOLE);
    assert.notEqual(mutated, WHOLE, `the mutation "${what}" changes nothing, so it proves nothing`);
    if (stackedTables(mutated, 'fixture').problems.length === 0) survived.push(what);
  }
  assert.deepStrictEqual(survived, [], 'a stacked table missing its roles passed this gate');
});

test('the gate reads a table that does not stack as none of its business', () => {
  assert.deepEqual(
    stackedTables('<table class="ui-table ui-table--dense"><tbody><tr><td>1</td></tr></tbody></table>', 'fixture'),
    { tables: 0, problems: [] },
  );
});
