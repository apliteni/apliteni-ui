// The shape of a rule and the gates that walk this page: docs/guidelines.md
//
// The rules come through the shared shell. What follows them — the aims above
// the floor, the gate table and the ungated list — is this page's own, because
// none of it is a do/don't pair and drawing it as one would be a lie about what
// a picture can say here.
import { guidelinePage, mono } from './_layout.js';
import { pad } from '../_gallery.js';
import { badge } from '../../src/components/index.js';
import { TITLE, RULES, SPEC_CSS, AIMS, GATES, UNGATED } from './_accessibility-floor.js';

const CSS = `
  <style>
    .af { max-width: var(--gl-page); margin-top: var(--space-8);
      padding-top: var(--space-8); border-top: 1px solid var(--border); }
    .af h2 { font: 700 19px/1.3 Poppins; letter-spacing: -.01em; color: var(--strong);
      margin: 0 0 var(--space-2); }
    .af h2 + p { font: 400 13px/1.65 Poppins; color: var(--dim); margin: 0 0 var(--space-5);
      max-width: 72ch; }
    .af + .af { margin-top: var(--space-8); }
    .af-aim { margin: 0 0 var(--space-4); }
    .af-aim__what { font: 600 14.5px/1.5 Poppins; color: var(--strong); margin: 0; }
    .af-aim__how { font: 400 13px/1.65 Poppins; color: var(--dim); margin: var(--space-1) 0 0;
      max-width: 72ch; }
    .af-table { table-layout: fixed; }
    .af-table td { white-space: normal; vertical-align: top; }
    .af-table th:last-child { text-align: left; }
    .af-file { font-family: var(--font-mono); font-size: 12px; color: var(--accent); }
    .af-blind { margin: 0; padding-left: var(--space-4); font: 400 12.5px/1.6 Poppins;
      color: var(--dim); }
    .af-blind li + li { margin-top: var(--space-1); }
    .af-does { font: 400 12.5px/1.6 Poppins; color: var(--text); }
  </style>`;

const aim = (a) => `
  <div class="af-aim">
    <p class="af-aim__what">${mono(a.aim)}</p>
    <p class="af-aim__how">${mono(a.apply)}</p>
  </div>`;

const gateRow = (g) => `
  <tr>
    <td><span class="af-file">${g.file}</span></td>
    <td><span class="af-does">${mono(g.does)}</span></td>
    <td><ul class="af-blind">${g.blind.map((b) => `<li>${mono(b)}</li>`).join('')}</ul></td>
  </tr>`;

const ungatedRow = (u) => `
  <tr>
    <td>${badge('Ungated', 'warn')}</td>
    <td><span class="af-does">${u.what}</span></td>
    <td><span class="af-blind">${mono(u.note)}</span></td>
  </tr>`;

export default {
  title: 'Guidelines/The accessibility floor',
  parameters: { layout: 'fullscreen' },
};

export const AccessibilityFloor = {
  name: 'The accessibility floor',
  render: () => `${CSS}${guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS })}${pad(`
    <section class="af gl">
      <h2>What the kit aims at, above the floor</h2>
      <p>Every number above is the least this kit accepts. These four are what it reaches for,
         written so they can be applied to a component nobody has built yet.</p>
      ${AIMS.map(aim).join('')}
    </section>
    <section class="af gl">
      <h2>What the gates admit they cannot see</h2>
      <p>Not a fresh audit — this is what each gate already states about itself in its own
         header. A gate that is not on this list fails the build until it is.</p>
      <table class="ui-table af-table">
        <colgroup><col style="width:24%"><col style="width:32%"><col style="width:44%"></colgroup>
        <thead><tr><th>Gate</th><th>What it checks</th><th>What it will not catch</th></tr></thead>
        <tbody>${GATES.map(gateRow).join('')}</tbody>
      </table>
    </section>
    <section class="af gl">
      <h2>What nothing measures at all</h2>
      <p>Named here so it does not read as covered.</p>
      <table class="ui-table af-table">
        <colgroup><col style="width:14%"><col style="width:28%"><col style="width:58%"></colgroup>
        <thead><tr><th></th><th>Subject</th><th>Where it stands</th></tr></thead>
        <tbody>${UNGATED.map(ungatedRow).join('')}</tbody>
      </table>
    </section>`)}`,
};
