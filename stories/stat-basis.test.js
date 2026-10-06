// Rule: every change a stat band shows says what it is measured against, in
// text a reader can reach — beside the change, in the band's caption that the
// change points at, or beside the period control that selects the window, where
// a caption would only say the control's own state again. A hover `title` is not
// that: it is the rejected shape in #267, which makes this an accessibility
// gate, and the Accessibility minimums page names it as one. What a change may
// point at is a closed list; `allowedBases` is it.
//
// Second: the caption is read BEFORE the figures it explains, the way a table's
// caption is. The default layout is tiles, and a caption under a row of
// separate cards is one a reader takes for a note on the last card.
//
// Third: a figure adds what it has to add in one row. Two rows drop the changes
// beside it a line lower — 26.2px, measured on #512.
//
// Every story is walked, so a band added anywhere is a subject without being
// listed. why: docs/components.md#stat-bands
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { installDomGlobals, storyFiles } from './lib/contrast.js';
import { statBand } from '../src/components/stat.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});
const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true, virtualConsole: quiet });
installDomGlobals(dom.window);
const doc = dom.window.document;

/**
 * The statements under `root` a change is allowed to point at, by element id.
 * Two shapes: the band's own caption, and a basis stated beside a period control
 * that selects the window — the band then draws no caption, because one under a
 * control reading "1Y" says the control's state again. Anything else with an id
 * does not count: pointing a change at the page title would have passed before.
 *
 * The second shape is three conditions, and #505's review found the check holding
 * only one of them: every id-bearing DESCENDANT of a pressed strip's parent passed,
 * so a "Table / Chart" view switch beside `<h1 id="title">` lent the page title to
 * a change, and a statement nested anywhere in the row did the same. The closed
 * list the Stat bands page promises is these three:
 *
 *   - the strip has a pressed option, because an unpressed one selects nothing;
 *   - the statement carries `data-period-basis`, so it is the one the author
 *     DESIGNATED, not whatever else in the row happens to have an id;
 *   - and it is a direct child of the strip's own row, which is what "beside the
 *     control" means.
 *
 * WHAT THIS CANNOT MEASURE: that the strip really selects a period. Nothing in the
 * markup says a window rather than a view, which is exactly why the designation is
 * an attribute on the STATEMENT — the author's claim about the control beside it,
 * made in one place a reader of the source can find — and not a guess from a label
 * or a `data-seg` name. Reject the claim and the band owes a caption again.
 */
export const allowedBases = (root) => {
  const found = new Map();
  for (const caption of root.querySelectorAll('.ui-stats__basis[id]')) {
    found.set(caption.id, "the band's caption");
  }
  for (const control of root.querySelectorAll('.ui-seg')) {
    // An unpressed strip selects nothing, so it states no window.
    if (!control.querySelector('button[aria-pressed="true"]')) continue;
    const row = control.parentElement;
    if (!row) continue;
    for (const line of row.children) {
      if (!line.id || !line.hasAttribute('data-period-basis')) continue;
      found.set(line.id, "the period control's basis");
    }
  }
  return found;
};

/** The changes under `root` whose comparison a reader cannot reach. */
export const unexplained = (root) => {
  const allowed = allowedBases(root);
  return [...root.querySelectorAll('.ui-stat__delta')].filter((d) => {
    if (d.querySelector('.ui-stat__basis')?.textContent.trim()) return false;
    const ids = (d.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    return !ids.some((id) => allowed.has(id) && root.querySelector(`[id="${id}"]`)?.textContent.trim());
  });
};

/** The captions under `root` that do not lead the figures they caption. */
export const misplaced = (root) => [...root.querySelectorAll('.ui-stats__basis')]
  .filter((p) => {
    const band = p.closest('.ui-stats');
    if (!band) return true;
    const list = band.querySelector('.ui-stats__list');
    return p.closest('.ui-stat') !== null || !list || !(p.compareDocumentPosition(list) & 4);
  });

/** The figures under `root` that stack more than one row under their value. */
export const overloaded = (root) => [...root.querySelectorAll('.ui-stat')]
  .filter((f) => [...f.children]
    .filter((c) => c.tagName === 'DD'
      && !c.classList.contains('ui-stat__value')
      && !c.classList.contains('ui-stat__trend')).length > 1);

const mount = (html) => {
  const box = doc.createElement('div');
  if (typeof html === 'string') box.innerHTML = html;
  else if (html instanceof dom.window.Node) box.append(html);
  doc.body.append(box);
  return box;
};

test('the check finds a change with nothing to say what it is measured against', () => {
  const figures = [{ label: 'Income', value: '€ 1', delta: { value: '+4%' } }];
  assert.equal(unexplained(mount(statBand({ stats: figures }))).length, 1);
  assert.equal(unexplained(mount(statBand({ stats: figures, basis: 'Against last year' }))).length, 0);
  assert.equal(unexplained(mount(statBand({ stats: [{ ...figures[0], delta: { value: '+4%', basis: 'against plan' } }] }))).length, 0);
});

/* -- The basis a period control states ---------------------------------------
 *
 * The third shape, and the narrowest: the band draws no caption because the
 * control above it already says which window the figures cover, so a caption
 * would be that state in a second sentence. What the band owes is still the
 * comparison, said once in text each change points at. These hold that the check
 * accepts exactly that arrangement and nothing that merely looks like it.
 */

/** A period row: the strip, and the basis beside it, as the dashboard draws them. */
const periodRow = ({ pressed = true, basis = 'Each change is against the 12 months before.' } = {}) =>
  '<div class="ui-toolbar">'
  + `<div class="ui-seg" role="toolbar" aria-label="Period" data-seg="period">${
    ['3M', '6M', '1Y', 'All'].map((o, i) => `<button type="button" aria-pressed="${pressed && i === 2}">${o}</button>`).join('')
  }</div>`
  + (basis ? `<p class="ui-sr" id="period-basis" data-period-basis>${basis}</p>` : '')
  + '</div>';

const CHANGES = [
  { label: 'Money in', value: '€ 1', delta: { value: '+4%' } },
  { label: 'Money out', value: '€ 2', delta: { value: '+9%' } },
];

test('a change takes its basis from the statement beside a period control', () => {
  const box = mount(periodRow() + statBand({ stats: CHANGES, basisId: 'period-basis', id: 'band' }));
  assert.equal(box.querySelectorAll('.ui-stats__basis').length, 0, 'premise: the band draws no caption of its own');
  assert.equal(box.querySelectorAll('.ui-stat__delta[aria-describedby="period-basis"]').length, 2,
    'premise: every change points at the statement beside the control');
  assert.equal(unexplained(box).length, 0);
  assert.equal(allowedBases(box).get('period-basis'), "the period control's basis");
});

test('a change with no caption and no period control beside it still fails', () => {
  const box = mount(statBand({ stats: CHANGES, basisId: 'period-basis', id: 'band' })
    + '<p id="period-basis">Each change is against the 12 months before.</p>');
  assert.equal(unexplained(box).length, 2,
    'a statement with the right id but no period control selecting a window passed as a basis');
});

test('a strip that selects nothing states no window, and the changes under it fail', () => {
  const box = mount(periodRow({ pressed: false }) + statBand({ stats: CHANGES, basisId: 'period-basis', id: 'band' }));
  assert.equal(unexplained(box).length, 2, 'an unpressed strip passed as the statement of a window');
});

test('a change pointing at text that is neither a caption nor a period basis fails', () => {
  const box = mount('<h1 id="page-title">Dashboard</h1>'
    + periodRow()
    + statBand({ stats: CHANGES, basisId: 'page-title', id: 'band' }));
  assert.equal(unexplained(box).length, 2,
    'the page title passed as a comparison basis, which is what the closed list is for');
});

/* The three shapes #505's review got through the allowance, each mounted and each
 * required to fail. They are not variations on one check: the first says the strip
 * has to be the one the statement names, the second says the row's other text is
 * not the basis, and the third says nesting does not count as beside. */

/** A strip that is pressed and selects something other than a window. */
const viewRow = (inside) => '<div class="ui-toolbar">'
  + `<div class="ui-seg" role="toolbar" aria-label="View" data-seg="view">${
    ['Table', 'Chart'].map((o, i) => `<button type="button" aria-pressed="${i === 0}">${o}</button>`).join('')
  }</div>${inside}</div>`;

test('a heading beside any pressed strip is not a basis', () => {
  // The probe in #505's review: a view switch beside the page title, and a change
  // pointing at the title. The allowance read every id in the row, so this passed.
  const box = mount(viewRow('<h1 id="title">Dashboard</h1>')
    + statBand({ stats: CHANGES, basisId: 'title', id: 'band' }));
  assert.equal(box.querySelectorAll('.ui-seg button[aria-pressed="true"]').length, 1,
    'premise: the strip is pressed, so the old allowance would have opened');
  assert.equal(allowedBases(box).has('title'), false, 'the page title is in the closed list');
  assert.equal(unexplained(box).length, 2, 'a change took its comparison from the page title');
});

test('the row\'s other text is not a basis just because it sits in the row', () => {
  const box = mount(periodRow().replace('</div>', '<p id="note">Figures update hourly.</p></div>')
    + statBand({ stats: CHANGES, basisId: 'note', id: 'band' }));
  assert.ok(box.querySelector('#note'), 'premise: the note is in the row');
  assert.ok(box.querySelector('[data-period-basis]'), 'premise: a designated basis is in the row too');
  assert.equal(allowedBases(box).has('note'), false);
  assert.equal(unexplained(box).length, 2, 'an undesignated line in the row passed as the basis');
});

test('a designated basis nested in the row is not beside the control', () => {
  const box = mount(periodRow({ basis: '' })
      .replace('</div>', '<div><p class="ui-sr" id="period-basis" data-period-basis>Against the 12 months before.</p></div></div>')
    + statBand({ stats: CHANGES, basisId: 'period-basis', id: 'band' }));
  assert.ok(box.querySelector('[data-period-basis]'), 'premise: the statement is in the row, one level down');
  assert.equal(allowedBases(box).has('period-basis'), false);
  assert.equal(unexplained(box).length, 2, 'a statement nested in the row passed as one beside the control');
});

test('the check finds a caption that has slipped under or into its figures', () => {
  const stats = [{ label: 'Income', value: '€ 1', delta: { value: '+4%' } }];
  const band = statBand({ stats, basis: 'Against last year', id: 'ok' });
  assert.equal(misplaced(mount(band)).length, 0);
  // The shape this rule refuses: the same band with its caption moved back under
  // the list, which is where #267 shipped it before tiles became the default.
  const under = band.replace(/(<p class="ui-stats__basis"[^>]*>[^<]*<\/p>)(<dl[\s\S]*<\/dl>)/, '$2$1');
  assert.notEqual(under, band, 'the mutation did not land — the caption markup moved');
  assert.equal(misplaced(mount(under)).length, 1);
  const inside = band.replace('<dt class="ui-stat__label">', '<p class="ui-stats__basis">Against last year</p><dt class="ui-stat__label">');
  assert.equal(misplaced(mount(inside)).length, 1);
});

test('the check finds a figure that stacks a second row under its value', () => {
  const band = statBand({ stats: [{ label: 'Margin', value: '36.1%', caption: 'of income', delta: { value: '+1.2 pts' } }] });
  assert.equal(overloaded(mount(band)).length, 0, 'a caption and a change already cost two rows');
  // The shape this rule refuses: the caption drawn as its own row above the
  // change, which is what #512 reviewed and what the row model replaced.
  const split = band.replace(/<span class="ui-stat__caption">([^<]*)<\/span> /, '<\/dd><dd class="ui-stat__caption">$1<\/dd><dd class="ui-stat__delta">');
  assert.notEqual(split, band, 'the mutation did not land — the caption markup moved');
  assert.equal(overloaded(mount(split)).length, 1);
});

test('every change in every story says what it is measured against, and no figure says it twice over', async () => {
  let subjects = 0;
  let captions = 0;
  let figures = 0;
  let fromControl = 0;
  const failures = [];
  // No filter on the file's source: a guidelines story renders its bands through
  // a content module and names neither the factory nor the class.
  for (const rel of storyFiles) {
    const mod = await import(path.join(here, rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      let box;
      try {
        box = mount(render(args, { globals: { theme: 'dark', accent: 'default' }, args }));
      } catch (err) {
        failures.push(`${rel}:${name} did not render — ${err.message}`);
        continue;
      }
      subjects += box.querySelectorAll('.ui-stat__delta').length;
      captions += box.querySelectorAll('.ui-stats__basis').length;
      figures += box.querySelectorAll('.ui-stat').length;
      const control = [...allowedBases(box)].filter(([, what]) => what === "the period control's basis").map(([id]) => id);
      fromControl += [...box.querySelectorAll('.ui-stat__delta[aria-describedby]')]
        .filter((d) => control.includes(d.getAttribute('aria-describedby'))).length;
      for (const d of unexplained(box)) {
        failures.push(`${rel}:${name} — "${d.textContent.trim()}" under "${d.parentElement.querySelector('dt')?.textContent}"`);
      }
      for (const p of misplaced(box)) {
        failures.push(`${rel}:${name} — the caption "${p.textContent.trim()}" does not lead its figures`);
      }
      for (const f of overloaded(box)) {
        failures.push(`${rel}:${name} — "${f.querySelector('dt')?.textContent}" stacks two rows under its value`);
      }
      box.remove();
    }
  }
  assert.ok(subjects >= 20, `walked ${subjects} changes — the walk stopped finding the bands`);
  assert.ok(captions >= 10, `walked ${captions} captions — the walk stopped finding the bands' captions`);
  assert.ok(figures >= 50, `walked ${figures} figures — the walk stopped finding them`);
  // The third shape has one screen today, the Finance dashboard's three figures.
  // Without this the Except could leave the kit and the check above would keep
  // passing on the two shapes that remained. #505
  assert.ok(fromControl >= 3,
    `${fromControl} change(s) take their basis from a period control; the Finance dashboard draws `
    + 'three. At none, the branch of this check that accepts them is measuring nothing.');
  assert.deepEqual(failures, []);
});
