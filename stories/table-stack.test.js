/* Rule: a table that stacks names its own roles.
 *
 * `.ui-table--stack` changes `display` on the table and everything in it. A stylesheet
 * cannot write a role and 560px is not a moment markup can react to, so a stacked table
 * carries its roles at every width — the half of #499 no CSS gate can see.
 *
 * How much is at stake is engine-specific and less than a changed `display` is usually said
 * to cost: measured in Chromium at 390px, stripping every role still leaves table, row, cell
 * and columnheader, and only the body's rowgroup goes. WebKit and Gecko were not measured,
 * so all five are required rather than the one Chromium is known to drop.
 *
 * why: docs/components.md#dense-financial-tables
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
const FOCUSABLE = ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]',
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
const sortControlFor = (table) => {
  const id = table.getAttribute('id');
  if (!id) return null;
  return [...table.getRootNode().querySelectorAll(FOCUSABLE)].find((el) =>
    !table.contains(el)
    && (el.getAttribute('aria-controls') ?? '').split(/\s+/).includes(id)) ?? null;
};

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
 * control left in one is a focus stop with nothing drawn on screen, so a stacked table's
 * header cells hold text and a sort control belongs on the row above the table.
 *
 * `aria-sort` has to stay in step with that. An order announced with its control deleted
 * tells a screen-reader user the table is sorted and leaves no way to change it — the
 * defect #532's review found in the screener showcase this PR has since withdrawn.
 */

/* No table in the kit sorts while stacked today, so that half of the sweep passes
 * vacuously and the fixtures at the bottom are what hold it.
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

const WHOLE = `<table class="ui-table ui-table--stack" id="fixture-log" role="table">
  <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Who</th>
    <th scope="col" role="columnheader">Change</th></tr></thead>
  <tbody role="rowgroup"><tr role="row"><td role="cell">t.quill</td>
    <td role="cell" class="ui-table__long">raised the cap</td></tr></tbody>
</table>`;

/** Focusables that have nothing to do with the table, as every real page has. */
const BYSTANDERS = '<a href="#main">Skip to content</a><a href="#home">Home</a>'
  + '<div tabindex="0" role="region" aria-label="Rows"></div><button type="button">Filter</button>';

/** The order announced in the clipped header, with no control that claims the table. */
const ANNOUNCED = WHOLE.replace('role="columnheader">Who', 'role="columnheader" aria-sort="ascending">Who');

test('the gate rejects a stacked table that leans on the implicit roles', () => {
  assert.deepEqual(stackedTables(WHOLE, 'fixture'), { tables: 1, problems: [] });

  const survived = [];
  for (const [what, mutate] of [
    ['no role on the table', (h) => h.replace(' id="fixture-log" role="table"', ' id="fixture-log"')],
    ['no role on the row groups', (h) => h.replaceAll(' role="rowgroup"', '')],
    ['no role on the rows', (h) => h.replaceAll(' role="row"', '')],
    ['no role on the headers', (h) => h.replaceAll(' role="columnheader"', '')],
    ['no role on the cells', (h) => h.replaceAll(' role="cell"', '')],
    ['a grid cell in place of a table cell', (h) => h.replaceAll('role="cell"', 'role="gridcell"')],
    ['no header row to clip', (h) => h.replace(/<thead[\s\S]*?<\/thead>/, '')],
    ['a sort control left in the clipped header',
      (h) => h.replace('>Change</th>', '><button type="button">Change</button></th>')],
    ['an order announced with the control for it deleted',
      () => ANNOUNCED],
    // #532's re-review reconstructed round 1's defect on the shipped screener markup and the
    // first version of this check reported no problem, because the page had 17 focusables and
    // the check asked only whether one existed. Every mutation below keeps bystanders on the
    // page, so "something is focusable" can never be what makes the gate pass.
    ['an order announced beside focusables that cannot sort it',
      () => `${BYSTANDERS}${ANNOUNCED}`],
    ['a control that claims a different table',
      () => `<button type="button" aria-controls="some-other-table">Sort</button>${BYSTANDERS}${ANNOUNCED}`],
    ['a control that claims the table but cannot be reached',
      () => `<span aria-controls="fixture-log">Sort</span>${BYSTANDERS}${ANNOUNCED}`],
    ['the table left with no id for a control to name',
      () => `<button type="button" aria-controls="fixture-log">Sort</button>${ANNOUNCED.replace(' id="fixture-log"', '')}`],
  ]) {
    const mutated = mutate(WHOLE);
    assert.notEqual(mutated, WHOLE, `the mutation "${what}" changes nothing, so it proves nothing`);
    if (stackedTables(mutated, 'fixture').problems.length === 0) survived.push(what);
  }
  assert.deepStrictEqual(survived, [], 'a stacked table missing its roles passed this gate');
});

// The shape the specification prescribes: the order is announced in the clipped header and
// the control that changes it sits above the table, where it can draw a focus ring.
test('the gate accepts an announced order whose control sits above the table', () => {
  assert.equal(stackedTables(ANNOUNCED, 'fixture').problems.length, 1, 'with no control, rejected');
  assert.deepEqual(
    stackedTables(
      `<button type="button" aria-controls="fixture-log">Sort by who</button>${BYSTANDERS}${ANNOUNCED}`,
      'fixture',
    ),
    { tables: 1, problems: [] },
    'a control that names the table is what the specification asks for, bystanders or not',
  );
  // `aria-controls` takes a list, and a toolbar control often drives more than one thing.
  assert.deepEqual(
    stackedTables(
      `<button type="button" aria-controls="chart-1 fixture-log">Sort</button>${ANNOUNCED}`,
      'fixture',
    ),
    { tables: 1, problems: [] },
  );
});

test('the gate reads a table that does not stack as none of its business', () => {
  assert.deepEqual(
    stackedTables('<table class="ui-table ui-table--dense"><tbody><tr><td>1</td></tr></tbody></table>', 'fixture'),
    { tables: 0, problems: [] },
  );
});
