/* Rule: a dropdown panel stays inside the view it is laid out in, shut and open, and
 * a label longer than the screen is wrapped rather than clipped. #572 is what that
 * looked like with nothing measuring the view.
 *
 * The browser half of the rule, for the React Dropdown. The source and JSDOM halves
 * are in src/logic/dropdown-placement.test.js. Off unless DROPDOWN_EDGES=1:
 * Playwright is deliberately not a dependency of this package, CI does not run it,
 * and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… DROPDOWN_EDGES=1 node --test stories/dropdown-contain.test.js
 *
 * Its limits: one engine, Chrome for Testing through whichever Playwright the host
 * supplies; no right-to-left row, the kit claiming no RTL support; not the block
 * axis, which is #255's; and not a filter row's panels, which
 * stories/filter-bar-fit.test.js measures.
 * why: docs/components.md#dropdown
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN = process.env.DROPDOWN_EDGES === '1';

test('measured in a browser, four widths and both themes', {
  skip: !RUN && 'set DROPDOWN_EDGES=1',
}, async (t) => {
  const lib = await import('./lib/dropdown-contain.js');
  const {
    WIDTHS, THEMES, serve, reactPass, indexed, openStory, panels, outside, where, SHIFT_OFF,
    reactEdgeCases, broken, whereCase, WRAP_OFF, NO_MUTATION_OBSERVER,
    NO_SCROLL_LISTENER, LONG_LABEL, NO_CHARACTER_DATA, NO_MOTION_END, playwright,
  } = lib;

  const pw = await playwright();
  assert.ok(
    pw,
    'DROPDOWN_EDGES=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one — '
    + 'scripts/evidence/README.md has the recipe — or leave the variable unset. A browser gate '
    + 'that quietly skipped would report the same green as one that measured.',
  );
  const build = path.join(root, 'storybook-static');
  assert.ok(
    existsSync(path.join(build, 'index.json')),
    `no Storybook build at ${build} — run: npm run build-storybook. React's fit is an effect, `
    + 'so it exists only where React is running.',
  );

  /* Stable text metrics, so a width measured here is the width measured next time.
     `--deterministic-mode` is NOT among them: under it this host's Chromium
     produces no frames at all, and a React story never commits. */
  const browser = await pw.chromium.launch({
    executablePath: process.env.UI_CHROME,
    args: ['--font-render-hinting=none', '--disable-lcd-text', '--disable-gpu'],
  });
  // The server's /__shot page is never asked for; any file satisfies the argument.
  const server = await serve(build, path.join(build, 'iframe.html'));

  try {
    /* Discovery: every story in the built index is opened once, and the ones that
       put a panel on the page join the sweep. A story that will not render is not
       skipped: discovery decides what the passes below measure, so one missed here
       leaves this gate smaller with nothing saying by how much. */
    const all = indexed(build);
    const found = await reactPass(browser, server.port, {
      width: 390, theme: 'dark', ids: all, discovering: true,
    });
    assert.deepEqual(
      found.problems, [],
      'A story that would not render is not skipped here: an unreached story is an '
      + 'unmeasured subject, and discovery is where this gate decides what it covers.',
    );
    const ids = all.filter((s) => found.rows.some((r) => r.subject === s.label));

    const rows = [];
    // A subject discovered and then not measured is named by the pass that lost it.
    const lost = [];
    for (const width of WIDTHS) {
      for (const theme of THEMES) {
        const pass = await reactPass(browser, server.port, { width, theme, ids });
        rows.push(...pass.rows);
        lost.push(...pass.problems);
      }
    }
    assert.deepEqual(
      lost, [],
      `${lost.length} subjects were discovered and then went unmeasured. Each is a story this `
      + 'walk reached once and lost, which is a smaller gate reported as a passing one.',
    );
    const measured = panels(rows);
    const cases = rows.length;
    const seen = new Set(rows.map((r) => r.subject));

    /* Floors, recorded from what this build reaches rather than derived from the
       sweep that filled them: a count computed from its own loop can only restate
       itself. Each is just under what this branch measures, so a story that stops
       rendering a panel fails here instead of passing quietly. */
    const FLOOR_SUBJECTS = 80;
    const FLOOR_PAGES = 640;
    const FLOOR_PANELS = 1600;
    const FLOOR_OPENED = 770;

    console.log(`subjects: ${seen.size}`);
    console.log(`cases: ${cases} at ${WIDTHS.join(', ')} in ${THEMES.join(' and ')}`);
    console.log(`panels measured: ${measured.length}, of which open: ${measured.filter((p) => p.state === 'open').length}`);

    assert.ok(seen.size >= FLOOR_SUBJECTS, `${seen.size} subjects, floor ${FLOOR_SUBJECTS}`);
    assert.ok(cases >= FLOOR_PAGES, `${cases} cases, floor ${FLOOR_PAGES}`);
    assert.ok(measured.length >= FLOOR_PANELS, `${measured.length} panels, floor ${FLOOR_PANELS}`);

    await t.test('a form dropdown keeps its longest option width after a pick', async () => {
      const FIELD_STORY = 'react-fields--dropdown-control';
      const fieldStory = all.find((story) => story.id === FIELD_STORY);
      assert.ok(fieldStory, `no story with the id ${FIELD_STORY} in the built index`);
      const read = async (theme, mutation = '') => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        try {
          const rendered = await openStory(page, fieldStory, { port: server.port, theme });
          assert.equal(rendered.phase, 'finished', `${theme} did not render the field story`);
          if (mutation) await page.addStyleTag({ content: mutation });
          return await page.evaluate(async () => {
            const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            const field = [...document.querySelectorAll('.ui-field')]
              .find((el) => el.querySelector('.ui-field__label')?.textContent === 'Reviewer');
            const trigger = field?.querySelector('[data-dropdown-trigger]');
            if (!trigger) throw new Error('the Reviewer trigger is missing');
            const before = trigger.getBoundingClientRect().width;
            const pick = async (label) => {
              trigger.click();
              await frame();
              const panel = field.querySelector('[data-dropdown-panel]');
              const row = [...field.querySelectorAll('[data-dd-item]')]
                .find((el) => el.textContent.trim() === label);
              if (!row) throw new Error(`${label} is missing`);
              row.click();
              await frame();
              return { after: trigger.getBoundingClientRect().width, panel: panel.getBoundingClientRect().width };
            };
            return { before, jordan: await pick('Jordan Example'), avery: await pick('Avery Example') };
          });
        } finally {
          await context.close();
        }
      };
      for (const theme of THEMES) {
        const stable = await read(theme);
        assert.equal(stable.before, stable.jordan.after, `${theme} changed width from its placeholder to Jordan Example`);
        assert.equal(stable.jordan.after, stable.avery.after, `${theme} changed width between Jordan Example and Avery Example`);
        assert.ok(stable.jordan.panel >= stable.jordan.after, `${theme} panel is narrower than its trigger`);
        const old = await read(theme, '.ui-dropdown__fit { display: none !important; }');
        assert.notEqual(old.jordan.after, old.avery.after, `${theme} did not reject the old value-sized rule`);
        const noPlaceholder = await read(theme, '.ui-dropdown__fit > .ui-dropdown__line:first-child { display: none !important; }');
        assert.notEqual(noPlaceholder.before, noPlaceholder.jordan.after, `${theme} did not reject the placeholder left out of the measurement`);
      }
    });

    await t.test('a touch trigger keeps its 16px type in the hidden rows', async () => {
      const FIELD_STORY = 'react-fields--dropdown-control';
      const fieldStory = all.find((story) => story.id === FIELD_STORY);
      assert.ok(fieldStory, `no story with the id ${FIELD_STORY} in the built index`);
      const read = async (theme, mutation = '') => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        try {
          const rendered = await openStory(page, fieldStory, { port: server.port, theme });
          assert.equal(rendered.phase, 'finished', `${theme} did not render the field story`);
          if (mutation) await page.addStyleTag({ content: mutation });
          return await page.evaluate(async () => {
            const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            const field = [...document.querySelectorAll('.ui-field')]
              .find((el) => el.querySelector('.ui-field__label')?.textContent === 'Reviewer');
            const trigger = field?.querySelector('[data-dropdown-trigger]');
            if (!trigger) throw new Error('the Reviewer trigger is missing');
            const before = trigger.getBoundingClientRect().width;
            const pick = async (label) => {
              trigger.click();
              await frame();
              const row = [...field.querySelectorAll('[data-dd-item]')]
                .find((el) => el.textContent.trim() === label);
              if (!row) throw new Error(`${label} is missing`);
              row.click();
              await frame();
              return trigger.getBoundingClientRect().width;
            };
            return {
              coarse: matchMedia('(pointer: coarse)').matches,
              font: getComputedStyle(trigger).fontSize,
              before,
              jordan: await pick('Jordan Example'),
              avery: await pick('Avery Example'),
            };
          });
        } finally {
          await context.close();
        }
      };
      for (const theme of THEMES) {
        const touch = await read(theme);
        assert.equal(touch.coarse, true, `${theme} did not emulate a coarse pointer`);
        assert.equal(touch.font, '16px', `${theme} touch trigger is ${touch.font}, not 16px`);
        assert.equal(touch.before, touch.jordan, `${theme} changed width at touch from its placeholder to Jordan Example`);
        assert.equal(touch.jordan, touch.avery, `${theme} changed width at touch between Jordan Example and Avery Example`);
        const drifted = await read(theme, '.ui-field > .ui-dropdown > .ui-dropdown__trigger > .ui-dropdown__fit { font-size: var(--text-base) !important; }');
        assert.notEqual(drifted.before, drifted.jordan, `${theme} did not reject the hidden rows drifting off the 16px type`);
      }
    });

    await t.test('a picker of people measures the mark with the name', async () => {
      const PICKER_STORY = 'react-dropdown--person-picker';
      const pickerStory = all.find((story) => story.id === PICKER_STORY);
      assert.ok(pickerStory, `no story with the id ${PICKER_STORY} in the built index`);
      const read = async (theme, mutation = '') => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        try {
          const rendered = await openStory(page, pickerStory, { port: server.port, theme });
          assert.equal(rendered.phase, 'finished', `${theme} did not render the picker story`);
          if (mutation) await page.addStyleTag({ content: mutation });
          return await page.evaluate(async () => {
            const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            const trigger = document.querySelector('.ui-field [data-dropdown-trigger]');
            if (!trigger) throw new Error('the picker trigger is missing');
            const before = trigger.getBoundingClientRect().width;
            const pick = async (label) => {
              trigger.click();
              await frame();
              const row = [...document.querySelectorAll('[data-dd-item]')]
                .find((el) => el.querySelector('.ui-dropdown__label')?.textContent === label);
              if (!row) throw new Error(`${label} is missing`);
              row.click();
              await frame();
              return trigger.getBoundingClientRect().width;
            };
            return { before, avery: await pick('Avery Example'), none: await pick('No one') };
          });
        } finally {
          await context.close();
        }
      };
      for (const theme of THEMES) {
        const stable = await read(theme);
        assert.equal(stable.before, stable.avery, `${theme} changed width from its placeholder to Avery Example`);
        assert.equal(stable.avery, stable.none, `${theme} changed width between Avery Example and No one`);
        const old = await read(theme, '.ui-dropdown__fit .ui-avatar { display: none !important; }');
        assert.notEqual(old.avery, old.none, `${theme} did not reject the mark left out of the measurement`);
        const noPlaceholder = await read(theme, '.ui-dropdown__fit > .ui-dropdown__line:first-child { display: none !important; }');
        assert.notEqual(noPlaceholder.before, noPlaceholder.avery, `${theme} did not reject the placeholder left out of the measurement`);
      }
    });

    await t.test('a muted row measures its state word in the fit', async () => {
      const MUTED_STORY = 'react-dropdown--muted-item';
      const mutedStory = all.find((story) => story.id === MUTED_STORY);
      assert.ok(mutedStory, `no story with the id ${MUTED_STORY} in the built index`);
      const read = async (theme, script = '') => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        try {
          const rendered = await openStory(page, mutedStory, { port: server.port, theme });
          assert.equal(rendered.phase, 'finished', `${theme} did not render the muted story`);
          if (script) await page.evaluate(`(${script})()`);
          return await page.evaluate(async () => {
            const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            const field = [...document.querySelectorAll('.ui-field')]
              .find((el) => el.querySelector('.ui-field__label')?.textContent === 'Unit' && el.querySelector('[data-dropdown-trigger]'));
            const trigger = field?.querySelector('[data-dropdown-trigger]');
            if (!trigger) throw new Error('the Unit trigger is missing');
            const pick = async (label) => {
              if (trigger.getAttribute('aria-expanded') !== 'true') {
                trigger.click();
                await frame();
              }
              const row = [...document.querySelectorAll('[data-dd-item]')]
                .find((el) => el.querySelector('.ui-dropdown__label')?.textContent === label);
              if (!row) throw new Error(`${label} is missing`);
              row.click();
              await frame();
              return trigger.getBoundingClientRect().width;
            };
            return { kestrel: await pick('Kestrel Consulting'), harbour: await pick('Harbour Consulting') };
          });
        } finally {
          await context.close();
        }
      };
      const STRIP_STATE = `() => {
        const strip = () => {
          for (const el of document.querySelectorAll('.ui-dropdown__fit .ui-dropdown__value')) {
            const text = el.textContent || '';
            const next = text.replace(/ \\([^)]*\\)$/, '');
            if (next !== text) el.textContent = next;
          }
        };
        strip();
        new MutationObserver(strip).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
      }`;
      for (const theme of THEMES) {
        const stable = await read(theme);
        assert.equal(stable.kestrel, stable.harbour, `${theme} changed width between Kestrel Consulting (Archived) and Harbour Consulting`);
        const old = await read(theme, STRIP_STATE);
        assert.notEqual(old.kestrel, old.harbour, `${theme} did not reject the state word left out of the measurement`);
      }
    });

    await t.test('a long option never widens the page past its field', async () => {
      const LONG_STORY = 'react-fields--form-row-long-value';
      const longStory = all.find((story) => story.id === LONG_STORY);
      assert.ok(longStory, `no story with the id ${LONG_STORY} in the built index`);
      const read = async (theme, mutation = '') => {
        const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
        const page = await context.newPage();
        try {
          const rendered = await openStory(page, longStory, { port: server.port, theme });
          assert.equal(rendered.phase, 'finished', `${theme} did not render the long-value story`);
          if (mutation) await page.addStyleTag({ content: mutation });
          return await page.evaluate(async () => {
            const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            await frame();
            const el = document.documentElement;
            return { client: el.clientWidth, scroll: el.scrollWidth };
          });
        } finally {
          await context.close();
        }
      };
      for (const theme of THEMES) {
        const shut = await read(theme);
        assert.equal(shut.scroll, shut.client, `${theme} page is ${shut.scroll}px wide inside ${shut.client}px`);
        const old = await read(theme, [
          '.ui-field > .ui-dropdown > .ui-dropdown__trigger > .ui-dropdown__fit { overflow: visible !important; }',
          '.ui-field > .ui-dropdown > .ui-dropdown__trigger > .ui-dropdown__fit .ui-dropdown__value { overflow: visible !important; min-inline-size: max-content !important; }',
        ].join('\n'));
        assert.ok(old.scroll > old.client, `${theme} did not reject the hidden rows overflowing the field`);
      }
    });

    await t.test('every panel is inside the view it is laid out in', () => {
      const out = outside(measured);
      assert.deepEqual(
        out.map(where), [],
        `${out.length} of ${measured.length} panels are outside their view.`,
      );
    });

    await t.test('every trigger that was clicked opened a panel', () => {
      const opened = rows.flatMap((r) => r.opens);
      assert.ok(
        opened.length >= FLOOR_OPENED,
        `${opened.length} triggers clicked, floor ${FLOOR_OPENED}. The open half of the rule is `
        + 'measured by opening them, so a walk that stopped clicking would pass on the shut half.',
      );
      const silent = opened.filter((o) => o.opened < 1);
      assert.deepEqual(
        silent.slice(0, 10).map((o) => `“${o.trigger}”`), [],
        `${silent.length} of ${opened.length} triggers opened nothing. An unmeasured open is a `
        + 'failure here: a panel nobody opened is inside the view the way a page with no dropdown '
        + 'on it is.',
      );
    });

    await t.test('the panels add nothing to the page’s scrollable width', () => {
      // Measured with the panels and then without them, because a story may put a
      // wide table on a phone screen and that overflow is not a panel's. #501 is
      // this number on a shut panel.
      const over = rows.filter((r) => r.flow.added > 1);
      assert.deepEqual(
        over.map((r) => `${r.width}/${r.theme} “${r.subject}” → +${r.flow.added}px`), [],
        `${over.length} of ${cases} pages are made wider by their panels.`,
      );
    });

    await t.test('a panel moved by nothing is rejected', async () => {
      // The side margins are where the in-place fit writes its answer. Refusing it is
      // the placement #572 reported.
      const pass = await reactPass(browser, server.port, {
        width: 375, theme: 'dark', ids, mutation: SHIFT_OFF,
      });
      const caught = outside(panels(pass.rows)).length;
      console.log(`shift refused: ${caught} panels outside`);
      assert.ok(
        caught > 0,
        `${caught} panels were outside the view with the fit's own answer refused. Then this `
        + 'gate would pass with the fix taken out.',
      );
    });

    /* -- The moves no size reports ------------------------------------------ */
    /* The sweep above reads a settled page, so five states are invisible to it: a
       row that reorders under an open panel, an ancestor scrolled sideways, a row
       whose own label is longer than the screen, a sibling text node that grows,
       and a trigger slid by a transition. #572's review reproduced each of them
       against an answer that had stopped short of it. Fixtures rather than
       discovered subjects, but they move a SHIPPED story, so renaming it fails
       this gate rather than shrinking it. */
    /* Found by its id and not by its label: the id is what AGENTS.md asks to keep
       stable, and Storybook derives a label's capitals from the export name. */
    const EDGE_STORY = 'react-dropdown--near-the-screen-edges';
    const edgeStory = all.find((s) => s.id === EDGE_STORY);
    assert.ok(
      edgeStory,
      `no story with the id ${EDGE_STORY} in the built index. The moved and scrolled cases `
      + 'below are measured against that story, so a rename has to be a failure here rather than '
      + 'cases quietly going missing.',
    );

    const CASES = 5;      // reorder, ancestor scroll, long label, grown text, motion
    const READINGS = 12;  // 3 reorder + 3 scrolled + 2 long + 2 grown + 2 motion

    await t.test('a panel stays inside the view when its anchor moves or is slid, and when a row is longer than the screen', async () => {
      const got = await reactEdgeCases(browser, server.port, { story: edgeStory.id, width: 390, theme: 'light' });
      console.log(`moves and long content: ${got.length} readings\n${got.map(whereCase).join('\n')}`);
      // Counted, so a probe that stopped reaching the page fails instead of
      // reporting an empty pass.
      assert.equal(got.length, READINGS, `${got.length} readings, expected ${READINGS}`);
      assert.equal(new Set(got.map((r) => r.case)).size, CASES, `${CASES} cases`);
      assert.deepEqual(
        broken(got).map(whereCase), [],
        'a panel left its view, passed the width bound its sheet declares, widened the page or clipped its label.',
      );
      /* The long-content case has to BE long content, or it proves nothing: an
         in-place panel is shrink-to-fit against the room beside its own offsets,
         so breaking the token anywhere takes it to the 240px floor. */
      const long = got.filter((r) => r.case === 'a label longer than the screen');
      assert.ok(long.length >= 2, `${long.length} long-label readings, expected at least 2`);
      for (const r of long) {
        assert.ok(
          r.portal ? r.width > 240 : r.width === 240,
          `${whereCase(r)} — a ${r.portal ? 'portalled' : 'in-place'} panel carrying `
          + `${LONG_LABEL} is meant to settle at ${r.portal ? 'the bound' : 'its 240px floor'}. `
          + 'A different number means the fixture is not measuring that row at all.',
        );
      }
    });

    await t.test('each case is refused when the declaration that catches it is taken away', async () => {
      /* One refusal per mechanism, not per case: the mutation observer reports the
         reorder, the scroll listener the scroll, the text-change observation the
         grown text run and the end events the slide, while the long row needs the wrap.
         The width bound is not refused here: it holds a portalled panel, which this
         story does not render. */
      const refusals = [
        ['the mutation observer', 'a row that reorders', { script: NO_MUTATION_OBSERVER }],
        ['the scroll listener', 'an ancestor scrolled sideways', { script: NO_SCROLL_LISTENER }],
        ['the text-change observation', 'a sibling text node that grows', { script: NO_CHARACTER_DATA }],
        /* Its limit: in a Storybook iframe something else mutates inside the 1.2s
           this arm leaves the panel stale, and that mutation refits it, so this arm
           may measure nothing outside. react/src/Dropdown.test.tsx holds the end
           event, the timer and the cleanup, each failing without it. */
        ['the motion end events', 'a trigger slid by a transition', { script: NO_MOTION_END, motionMs: 1200 }],
        ['the long-token wrap', 'a label longer than the screen', { mutation: WRAP_OFF }],
      ];
      for (const [what, which, how] of refusals) {
        const got = await reactEdgeCases(browser, server.port, {
          story: edgeStory.id, width: 390, theme: 'light', ...how,
        });
        const out = broken(got).filter((r) => r.case === which);
        console.log(`${what} taken away: ${out.length} readings outside — ${out.map(whereCase).join('; ') || 'none'}`);
        assert.ok(
          out.length > 0,
          `with ${what} taken away, “${which}” stayed inside the view. Then this gate would `
          + 'pass with that half of the fix removed.',
        );
      }
    });
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
