// Rule: every stat change says what it is measured against in reachable text or in its
// tooltip, a caption leads the figures it captions, and a figure uses one row. The
// reading is in stories/lib/stat-basis.js.
// Accepted shapes are a figure basis, a band caption, a period-control basis, or a kit
// Tooltip with a screen-reader basis; a hover `title` does not count. Every React story is walked, so a new band becomes a
// subject by default.
// why: docs/components.md#stat-bands
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'vitest';
import { StatBand, type StatBandProps } from './primitives/StatBand';
import * as FinanceDashboardStories from '../../stories/apps/FinanceDashboard.stories.tsx';
// @ts-expect-error -- shared, independently tested JS module.
import { allowedBases, unexplained, misplaced, overloaded } from '../../stories/lib/stat-basis.js';

/** The React band's markup as a string, so a fixture can be edited the way a defect would. */
const statBand = (props: StatBandProps) => renderToStaticMarkup(<StatBand {...props} />);

const mount = (html: string) => {
  const box = document.createElement('div');
  box.innerHTML = html;
  document.body.append(box);
  return box;
};

/** Mount a React tree for real, hooks and all. */
const roots: Root[] = [];
const mountElement = (element: ReactElement) => {
  const box = document.body.appendChild(document.createElement('div'));
  const root = createRoot(box);
  roots.push(root);
  act(() => root.render(element));
  return box;
};
// A root left mounted can run React's queued work after the window is torn down.
afterEach(() => act(() => roots.splice(0).forEach((root) => root.unmount())));

const FinanceDashboard = () => (FinanceDashboardStories.Default as { render: () => ReactElement }).render();

describe('stat basis: fixtures', () => {
  it('the check finds a change with nothing to say what it is measured against', () => {
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
  const periodRow = ({ pressed = true, basis = 'vs previous 12 months' } = {}) =>
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

  it('a change takes its basis from the statement beside a period control', () => {
    const box = mount(periodRow() + statBand({ stats: CHANGES, basisId: 'period-basis', id: 'band' }));
    assert.equal(box.querySelectorAll('.ui-stats__basis').length, 0, 'premise: the band draws no caption of its own');
    assert.equal(box.querySelectorAll('.ui-stat__delta[aria-describedby="period-basis"]').length, 2,
      'premise: every change points at the statement beside the control');
    assert.equal(unexplained(box).length, 0);
    assert.equal(allowedBases(box).get('period-basis'), "the period control's basis");
  });

  it('the Dashboard period basis is a label all three changes describe', () => {
    const box = mountElement(<FinanceDashboard />);
    const basis = box.querySelector('#fd-period-basis');
    assert.equal(basis?.textContent.trim(), 'vs previous 12 months');
    const deltas = [...box.querySelectorAll('.ui-stat__delta')];
    assert.equal(deltas.length, 3);
    for (const d of deltas) assert.equal(d.getAttribute('aria-describedby'), 'fd-period-basis');
    assert.equal(unexplained(box).length, 0);
  });

  it('a change with no caption and no period control beside it still fails', () => {
    const box = mount(statBand({ stats: CHANGES, basisId: 'period-basis', id: 'band' })
      + '<p id="period-basis">vs previous 12 months</p>');
    assert.equal(unexplained(box).length, 2,
      'a statement with the right id but no period control selecting a window passed as a basis');
  });

  it('a strip that selects nothing states no window, and the changes under it fail', () => {
    const box = mount(periodRow({ pressed: false }) + statBand({ stats: CHANGES, basisId: 'period-basis', id: 'band' }));
    assert.equal(unexplained(box).length, 2, 'an unpressed strip passed as the statement of a window');
  });

  it('a change pointing at text that is neither a caption nor a period basis fails', () => {
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

  it('a heading beside any pressed strip is not a basis', () => {
    // The probe in #505's review: a view switch beside the page title, and a change
    // pointing at the title. The allowance read every id in the row, so this passed.
    const box = mount(viewRow('<h1 id="title">Dashboard</h1>')
      + statBand({ stats: CHANGES, basisId: 'title', id: 'band' }));
    assert.equal(box.querySelectorAll('.ui-seg button[aria-pressed="true"]').length, 1,
      'premise: the strip is pressed, so the old allowance would have opened');
    assert.equal(allowedBases(box).has('title'), false, 'the page title is in the closed list');
    assert.equal(unexplained(box).length, 2, 'a change took its comparison from the page title');
  });

  it('the row\'s other text is not a basis just because it sits in the row', () => {
    const box = mount(periodRow().replace('</div>', '<p id="note">Figures update hourly.</p></div>')
      + statBand({ stats: CHANGES, basisId: 'note', id: 'band' }));
    assert.ok(box.querySelector('#note'), 'premise: the note is in the row');
    assert.ok(box.querySelector('[data-period-basis]'), 'premise: a designated basis is in the row too');
    assert.equal(allowedBases(box).has('note'), false);
    assert.equal(unexplained(box).length, 2, 'an undesignated line in the row passed as the basis');
  });

  it('a designated basis nested in the row is not beside the control', () => {
    const box = mount(periodRow({ basis: '' })
        .replace('</div>', '<div><p class="ui-sr" id="period-basis" data-period-basis>vs previous 12 months</p></div></div>')
      + statBand({ stats: CHANGES, basisId: 'period-basis', id: 'band' }));
    assert.ok(box.querySelector('[data-period-basis]'), 'premise: the statement is in the row, one level down');
    assert.equal(allowedBases(box).has('period-basis'), false);
    assert.equal(unexplained(box).length, 2, 'a statement nested in the row passed as one beside the control');
  });

  /* The fourth shape: the basis in a kit Tooltip on each change, and screen-reader text
   * that the change references. Each mutation takes one part away and must fail. */
  const TIPPED = renderToStaticMarkup(<>
    <p className="ui-sr" id="sr-basis">vs. previous 12 months</p>
    <StatBand id="band" basisId="sr-basis" stats={[{ label: 'Money in', value: '€ 1', delta: { value: '+4%', tooltip: 'vs. previous 12 months' } }]} />
  </>);
  it('a change takes its basis from its tooltip and screen-reader text', () => {
    const box = mount(TIPPED);
    assert.equal(box.querySelectorAll('.ui-stats__basis, .ui-seg').length, 0, 'premise: no caption and no period control');
    assert.equal(unexplained(box).length, 0);
  });
  const without: [string, (html: string) => string][] = [
    ['the tooltip says nothing', html => html.replace(/(<span class="ui-tip__label">)[^<]*/, '$1 ')],
    ['the trigger does not point at its tooltip', html => html.replace(/(tabindex="0") aria-describedby="[^"]*"/, '$1')],
    ['the keyboard cannot reach the trigger', html => html.replace(/ tabindex="0"/, '')],
    ['a hover title stands in for the tooltip', html => html.replace(/<span class="ui-tip-host"[\s\S]*?(<span class="ui-stat__change")[^>]*>([^<]*)<\/span>[\s\S]*?(?=<\/dd>)/, '$1 title="vs. previous 12 months">$2</span>')],
    ['the change references no text', html => html.replace(' aria-describedby="sr-basis"', '')],
    ['the screen-reader text is empty', html => html.replace(/(id="sr-basis">)[^<]*/, '$1')],
    ['the text is not the screen-reader basis', html => html.replace(' class="ui-sr"', '')],
  ];
  for (const [name, mutate] of without) {
    it(`the tooltip basis fails when ${name}`, () => {
      const html = mutate(TIPPED);
      assert.notEqual(html, TIPPED, 'the mutation did not land — the markup moved');
      const box = mount(html);
      assert.equal(box.querySelectorAll('.ui-stat__delta').length, 1, 'premise: the change is still drawn');
      assert.equal(unexplained(box).length, 1);
    });
  }

  it('the check finds a caption that has slipped under or into its figures', () => {
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

  it('the check finds a figure that stacks a second row under its value', () => {
    const band = statBand({ stats: [{ label: 'Margin', value: '36.1%', caption: 'of income', delta: { value: '+1.2 pts' } }] });
    assert.equal(overloaded(mount(band)).length, 0, 'a caption and a change already cost two rows');
    // The shape this rule refuses: the caption drawn as its own row above the
    // change, which is what #512 reviewed and what the row model replaced.
    const split = band.replace(/<span class="ui-stat__caption">([^<]*)<\/span> /, '<\/dd><dd class="ui-stat__caption">$1<\/dd><dd class="ui-stat__delta">');
    assert.notEqual(split, band, 'the mutation did not land — the caption markup moved');
    assert.equal(overloaded(mount(split)).length, 1);
  });
});

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });

// The catalogue as measured: a drop means the walk stopped finding bands, which is a
// change to look at. Captions fell from 18 to 7 when the Stat band story and guideline
// moved their basis into tooltips (#849).
const SUBJECTS_FLOOR = 43, CAPTIONS_FLOOR = 7, TOOLTIPS_FLOOR = 30, FIGURES_FLOOR = 59;

// Found when #429 gave the React stories this gate; none of it comes from the vanilla
// removal. Listed rather than skipped: a story not listed here fails, and a listed one
// that comes clean fails until it is taken off. Each fix changes a story or the rule, so
// it waits for the owner.
const KNOWN_GAPS: Record<string, string> = {
  './PeriodPicker.stories.tsx:Loading': 'the loading band draws change rows with no text',
};

// A guideline page draws each rule's failure in its Don't half, so a finding inside
// [data-specimen="dont"] is the picture, not a defect. Only that half is skipped: the
// Do half and every other story are judged in full. Limit: a story that labels a real
// band as a Don't escapes the gate, which only guideline pages do. #768
const judged = (found: Element[]) => found.filter((el) => !el.closest('[data-specimen="dont"]'));

// The Stat bands guideline page's Do halves, counted so the skip cannot hide the page.
const GUIDELINE = '../../stories/guidelines/StatBands.stories.tsx';
const GUIDELINE_DO_FLOOR = 9;

describe('stat basis: a Don\'t half is skipped, a Do half is not', () => {
  const band = statBand({ stats: [{ label: 'Income', value: '€ 1', delta: { value: '+4%' } }] });
  it('a Do half with no basis still fails', () => {
    const box = mount(`<div data-specimen="do">${band}</div>`);
    assert.equal(judged(unexplained(box)).length, 1, 'the skip let a Do half through with no basis');
  });
  it('the same band in a Don\'t half is the picture', () => {
    const box = mount(`<div data-specimen="dont">${band}</div>`);
    assert.equal(unexplained(box).length, 1, 'premise: the band has no basis');
    assert.equal(judged(unexplained(box)).length, 0);
  });
});

describe('stat basis: React stories', () => {
  // One `it` per story file, so a slow file shows as itself and no single test
  // carries the whole walk past the 5 s budget.
  const sweep = { guidelineDo: 0, subjects: 0, captions: 0, tooltips: 0, figures: 0, fromControl: 0, failures: [] as string[], known: new Set<string>() };

  for (const file of Object.keys(modules).sort()) {
    it(`every change in ${file} says what it is measured against`, () => {
      const mod = modules[file];
      const def = mod.default || {};
      for (const [name, story] of Object.entries(mod)) {
        if (name === 'default' || !story || typeof story !== 'object') continue;
        const render = (story as Story).render || def.render;
        if (typeof render !== 'function') continue;
        const args = { ...def.args, ...(story as Story).args };
        const StoryRender = () => render(args, { globals: { theme: 'dark', accent: 'default' }, args });
        let box: HTMLElement;
        try {
          box = mountElement(<StoryRender />);
        } catch (err) {
          sweep.failures.push(`${file}:${name} did not render — ${(err as Error).message}`);
          continue;
        }
        sweep.subjects += box.querySelectorAll('.ui-stat__delta').length;
        sweep.captions += box.querySelectorAll('.ui-stats__basis').length;
        sweep.tooltips += box.querySelectorAll('.ui-stat__delta .ui-tip-host').length;
        sweep.figures += box.querySelectorAll('.ui-stat').length;
        const control = [...allowedBases(box)].filter(([, what]) => what === "the period control's basis").map(([id]) => id);
        sweep.fromControl += [...box.querySelectorAll('.ui-stat__delta[aria-describedby]')]
          .filter((d) => control.includes(d.getAttribute('aria-describedby'))).length;
        if (file === GUIDELINE) sweep.guidelineDo += box.querySelectorAll('[data-specimen="do"] .ui-stat__delta').length;
        const id = `${file}:${name}`;
        const before = sweep.failures.length;
        for (const d of judged(unexplained(box))) {
          sweep.failures.push(`${file}:${name} — "${d.textContent!.trim()}" under "${d.parentElement!.querySelector('dt')?.textContent}"`);
        }
        for (const p of judged(misplaced(box))) sweep.failures.push(`${file}:${name} — the caption "${p.textContent!.trim()}" does not lead its figures`);
        for (const f of judged(overloaded(box))) sweep.failures.push(`${file}:${name} — "${f.querySelector('dt')?.textContent}" stacks two rows under its value`);
        if (KNOWN_GAPS[id]) {
          if (sweep.failures.length > before) sweep.known.add(id);
          sweep.failures.length = before;
        }
        box.remove();
      }
    });
  }

  it('the walk found the bands and every story is clean', () => {
    assert.ok(sweep.subjects >= SUBJECTS_FLOOR, `walked ${sweep.subjects} changes — the walk stopped finding the bands`);
    assert.ok(sweep.captions >= CAPTIONS_FLOOR, `walked ${sweep.captions} captions — the walk stopped finding the bands' captions`);
    assert.ok(sweep.tooltips >= TOOLTIPS_FLOOR, `walked ${sweep.tooltips} tooltips — the walk stopped finding the changes' tooltips`);
    assert.ok(sweep.figures >= FIGURES_FLOOR, `walked ${sweep.figures} figures — the walk stopped finding them`);
    // The third shape has one screen today, the Dashboard's three figures. #505
    assert.ok(sweep.fromControl >= 3, `${sweep.fromControl} change(s) take their basis from a period control; the Dashboard draws three`);
    assert.ok(sweep.guidelineDo >= GUIDELINE_DO_FLOOR, `walked ${sweep.guidelineDo} Do changes on the Stat bands page`);
    assert.deepEqual(sweep.failures, []);
    assert.deepEqual(Object.keys(KNOWN_GAPS).filter((id) => !sweep.known.has(id)), [], 'it comes clean now: take it off the list');
  });
});
