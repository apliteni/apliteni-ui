// Accessibility gate — a real lifesaver, not noise.
//
// Renders EVERY story in stories/, in both themes but not every accent, and
// runs axe-core over the result — the same rule set the Storybook panel runs
// (.storybook/preview.js), so the two never disagree.
//
// A story that will not render is a failure rather than a skip, and the count is
// asserted so a story cannot fall out of the set unnoticed:
// Report unmeasured subjects as failures.
//
// `region` and `color-contrast` stay deliberately quiet — the first flags story
// content outside a landmark inside the Storybook iframe, the second reads the
// kit's unresolved var() as no colour at all. stories/contrast.test.js gates
// contrast instead. The focused shell test below enables `region`.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runJobs } from './lib/job-pool.js';
import {
  THEMES, storyFiles, getDom, violationsFor, fmt,
} from './lib/a11y-walk.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dom = getDom();
after(() => dom.window.close());

// Every story file is independent, so they are dealt to threads at load. A test per file below
// reports each one's answer, which keeps the count of tests the same as when they ran in turn.
const RESULTS = await runJobs(
  new URL('./lib/a11y-walk.js', import.meta.url),
  storyFiles.map((rel) => ({ fn: 'a11yFile', args: [rel] })),
);

// Running tally, asserted at the end so a whole FILE can't drop out either.
const tally = { files: 0, discovered: 0, checked: 0 };

storyFiles.forEach((rel, i) => {
  test(`a11y: stories/${rel}`, () => {
    const { discovered, checked, problems } = RESULTS[i];
    tally.files += 1;
    tally.discovered += discovered;
    tally.checked += checked;

    assert.ok(discovered > 0, `no stories found in stories/${rel} — did the export shape change?`);
    assert.equal(problems.length, 0, `\nAccessibility violations:\n${problems.join('\n')}\n`);
    assert.equal(
      checked, discovered * THEMES.length,
      `stories/${rel}: ${discovered} stories × ${THEMES.length} themes should be `
      + `${discovered * THEMES.length} checks, ran ${checked}`,
    );
  });
});

test('a11y: feedback widget markup', async () => {
  const { feedbackWidget } = await import(path.join(root, 'src/components/feedback.js'));
  const problems = [];
  for (const theme of THEMES) {
    for (const v of await violationsFor(feedbackWidget(), theme)) problems.push(fmt('feedbackWidget()', theme, v));
  }
  assert.equal(problems.length, 0, `\nAccessibility violations:\n${problems.join('\n')}\n`);
});

// The gate's own gate. If a story file stops exporting stories, if a story stops
// rendering, or if someone re-introduces a silent `continue`, these numbers move
// and this fails — which is the whole point: coverage you can count.
test('a11y: every discovered story was actually checked, in every theme', () => {
  assert.equal(tally.files, storyFiles.length, 'every story file ran');
  assert.ok(tally.discovered > 0, 'stories were discovered');
  assert.equal(
    tally.checked, tally.discovered * THEMES.length,
    `${tally.discovered} stories × ${THEMES.length} themes = ${tally.discovered * THEMES.length} `
    + `checks expected, ran ${tally.checked}`,
  );
});

// This checks shell landmarks in jsdom, not responsive visibility or layout.
// Rendered browser audits must also cover desktop and phone viewports.
test('a11y: the shell rail contains its head, navigation and fold in a named region', async () => {
  const { appShell } = await import('../src/components/shell.js');
  let checked = 0;
  for (const layout of ['rail', 'topbar']) {
    for (const collapsed of [false, true]) {
      dom.window.document.body.innerHTML = appShell({
        layout, collapsed, title: 'Overview', navLabel: 'Sections',
        nav: [{ id: 'overview', label: 'Overview', href: '/overview', icon: 'home' }],
        account: { name: 'Demo Reader', email: 'reader@example.com' },
        body: '<p>Overview content</p>',
      });
      const doc = dom.window.document;
      const rail = doc.querySelector('.ui-app__rail');
      assert.ok(rail, 'the fixture must render a rail');
      assert.equal(rail.getAttribute('role'), 'region');
      assert.equal(rail.getAttribute('aria-label'), 'Sidebar');
      for (const selector of ['.ui-app__head', 'nav', '.ui-app__fold']) {
        const part = rail.querySelector(selector);
        assert.ok(part, `the fixture must include ${selector}`);
        assert.equal(part.closest('[role="region"]'), rail, `${selector} belongs to Sidebar`);
      }
      assert.equal(rail.querySelector('nav').getAttribute('aria-label'), 'Sections');
      assert.equal(doc.querySelectorAll('header, [role="banner"]').length, layout === 'topbar' ? 1 : 0);
      const result = await dom.window.axe.run(doc.body, { runOnly: ['region'] });
      assert.equal(result.violations.length, 0, `${layout}, collapsed=${collapsed}: ${JSON.stringify(result.violations)}`);
      checked += 1;
    }
  }
  assert.equal(checked, 4, 'both layouts and both fold states were checked');
});
