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
    reactEdgeCases, broken, whereCase, WRAP_OFF, NO_MUTATION_OBSERVER, READ, SLACK,
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

    /* #888: a ghost trigger in a form hangs past its column, so a long value makes the
       trigger wider than the view's room. Its panel is at least the trigger, and that floor
       must stop at the panel's ceiling. The story's first field takes a long value, and its
       card takes no padding, so the field fills the page less the canvas's 16px padding.
       Its limits: the light theme, the in-place panel, and two phone widths. At 466px the
       story sets two fields in a row, so the trigger is narrower than the room. */
    await t.test('a long ghost field in a form keeps its menu inside the view room', async () => {
      const GHOST_STORY = 'react-proposed-value--form-row';
      assert.ok(all.some((s) => s.id === GHOST_STORY), `no story with the id ${GHOST_STORY} in the built index`);
      const LONG_VALUE = 'Professional services and international subscriptions';
      const FLOOR_UNCAPPED = '.ui-field > .ui-dropdown > .ui-dropdown__panel { min-inline-size: 100% !important; }';
      const ghost = async (width, mutation) => {
        const ctx = await browser.newContext({ viewport: { width, height: 800 } });
        const page = await ctx.newPage();
        const got = await openStory(page, { id: GHOST_STORY }, { port: server.port, theme: 'light' });
        assert.equal(got.phase, 'finished', `${GHOST_STORY} did not render at ${width}px: ${got.phase}`);
        await page.evaluate(() => document.fonts.ready);
        if (mutation) await page.addStyleTag({ content: mutation });
        await page.evaluate((long) => {
          document.querySelector('.ui-card').style.padding = '0';
          document.querySelector('.ui-field .ui-dropdown__value').textContent = long;
          document.querySelector('[data-dropdown-trigger]').click();
        }, LONG_VALUE);
        await page.locator('.ui-dropdown.open').waitFor();
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        const reading = await page.evaluate(`(${READ})()`);
        const trigger = await page.evaluate(() => document.querySelector('.ui-field > .ui-dropdown').getBoundingClientRect().width);
        await ctx.close();
        return { case: 'a long ghost field in a form', state: `open at ${width}px`, half: 'react', trigger, ...reading };
      };
      const GHOST_WIDTHS = [360, 390];
      const got = [];
      for (const width of GHOST_WIDTHS) got.push(await ghost(width));
      console.log(`long ghost field: ${got.length} readings\n${got.map(whereCase).join('\n')}`);
      assert.equal(got.length, GHOST_WIDTHS.length, 'a width was not measured');
      // The fixture must make the trigger wider than the room, or it measures nothing.
      for (const r of got) assert.ok(r.trigger > r.bound, `${whereCase(r)}: the trigger is ${r.trigger}px, not wider than the room`);
      // The room leaves the edge inset at each end, so the panel keeps that gap to the view.
      const gapless = (list) => list.filter((r) => broken([r]).length || r.left < (r.view - r.bound) / 2 - SLACK
        || r.right > r.view - (r.view - r.bound) / 2 + SLACK);
      assert.deepEqual(gapless(got).map(whereCase), [], 'a long ghost field opened a menu past the view room.');
      const refused = gapless([await ghost(390, FLOOR_UNCAPPED)]);
      console.log(`the floor's cap taken away: ${refused.map(whereCase).join('; ') || 'none'}`);
      assert.ok(refused.length > 0, 'with the floor uncapped, the menu stayed inside the view room. Then this case cannot see the fault.');
    });
  } finally {
    await browser.close();
    server.proc.kill();
  }
});

/* Rule: in a Modal or a Drawer, a dropdown panel opens below its trigger, over the body and
 * its footer, and the body does not scroll. When the view has less than 120px below the
 * trigger, the panel opens above it. After each key and click the trigger stays under the
 * pointer, the focus stays in the dropdown while it is open, Escape closes it and gives the
 * focus back to the trigger, no fixed element moves by more than 1px, no box scrolls, the
 * cumulative layout shift stays under 0.1 and the page does not scroll sideways.
 *
 * Off unless DROPDOWN_EDGES=1, as the sweep above is, and it needs web-vitals too:
 *
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js DROPDOWN_EDGES=1 \
 *     node --test stories/dropdown-contain.test.js
 *
 * It opens react-dropdown-placement--in-a-form in a Modal and in a Drawer, with four fields
 * above the select and two below it, at each of ten window sizes and on six devices: the
 * Galaxy Z Fold 7 and Flip 7 and their cover screens from Playwright's list, and a two-screen
 * phone of 466×678 and 890×626 at scale 3 with touch. One more run scrolls the body when a
 * panel opens, and the walk must report that the trigger moved.
 *
 * Its limits: one engine, the light theme and the default accent. The layout shift is
 * web-vitals' onCLS, which does not count a shift within 500ms of an input.
 * why: docs/components.md#dropdown
 */
const FLOAT_STORY = 'react-dropdown-placement--in-a-form';
const FLOAT_SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const FLOAT_DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const FLOAT_DUO = [[466, 678], [890, 626]];
const FLOAT_STAGES = ['modal', 'drawer'];

// The state after one action: the trigger, the panel and its side, the focus, every fixed
// element outside the dropdown, every box that scrolls, the layout shift and the sideways
// overflow.
const FLOAT_READ = () => {
  const dd = document.querySelector('.ui-dropdown');
  const trigger = dd.querySelector('[data-dropdown-trigger]');
  const panel = dd.querySelector('.ui-dropdown__panel');
  const t = trigger.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  const all = [...document.querySelectorAll('body *')].filter((e) => !dd.contains(e));
  const el = document.activeElement;
  const doc = document.scrollingElement;
  return {
    open: dd.classList.contains('open'),
    side: panel.getAttribute('data-dd-lifted'),
    trigger: { x: t.left, top: t.top, bottom: t.bottom },
    panel: { top: p.top, bottom: p.bottom, left: p.left, right: p.right },
    focus: !dd.contains(el) ? null : panel.contains(el) ? 'panel' : el === trigger ? 'trigger' : 'dropdown',
    fixed: all.filter((e) => getComputedStyle(e).position === 'fixed')
      .map((e) => { const r = e.getBoundingClientRect(); return { name: `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`, x: r.left, y: r.top }; }),
    scrolled: [...all, doc].filter((e) => e.scrollHeight > e.clientHeight).map((e) => e.scrollTop),
    cls: window.__cls,
    over: doc.scrollWidth - doc.clientWidth,
    view: [innerWidth, innerHeight],
  };
};
// Waits for the dropdown to be open or shut and for every animation to end.
const settle = (page, open) => page.waitForFunction((want) => document.querySelector('.ui-dropdown').classList.contains('open') === want
  && document.getAnimations().every((a) => a.playState !== 'running'), open);
const press = (key, open) => [`key: ${key}`, async (page) => { await page.keyboard.press(key); await settle(page, open); }];
const hit = (name, locate, open) => [`${name}`, async (page, touch) => {
  const at = locate(page);
  await (touch ? at.tap() : at.click());
  await settle(page, open);
}];
const FLOAT_ACTIONS = [
  hit('click: trigger', (page) => page.locator('.ui-dropdown [data-dropdown-trigger]'), true),
  press('ArrowDown', true),
  press('End', true),
  press('Escape', false),
  press('ArrowDown', true),
  hit('click: Account 3', (page) => page.getByRole('option', { name: 'Account 3' }), false),
];

// Runs every action and returns the findings and the open panels' sides.
async function floatWalk(page, label, touch) {
  const found = [];
  const sides = [];
  let before = await page.evaluate(FLOAT_READ);
  if (before.fixed.length === 0) found.push(`${label}: no fixed element found to hold still`);
  for (const [name, run] of FLOAT_ACTIONS) {
    await run(page, touch);
    const after = await page.evaluate(FLOAT_READ);
    const at = `${label} ${name}`;
    const moved = Math.max(Math.abs(after.trigger.x - before.trigger.x), Math.abs(after.trigger.top - before.trigger.top));
    if (moved > 1) found.push(`${at}: the trigger moved ${Math.round(after.trigger.top - before.trigger.top)}px`);
    for (const f of after.fixed) {
      const was = before.fixed.find((b) => b.name === f.name);
      if (was && Math.max(Math.abs(f.x - was.x), Math.abs(f.y - was.y)) > 1) found.push(`${at}: ${f.name} moved ${Math.round(f.x - was.x)},${Math.round(f.y - was.y)}px`);
    }
    if (after.scrolled.join() !== before.scrolled.join()) found.push(`${at}: a box scrolled from ${before.scrolled} to ${after.scrolled}`);
    if (!(after.cls < 0.1)) found.push(`${at}: the layout shift is ${after.cls}`);
    if (after.over > 0) found.push(`${at}: the page scrolls ${after.over}px sideways`);
    if (after.open) {
      if (!after.focus) found.push(`${at}: the focus left the open dropdown`);
      // Below the trigger, unless the view has less than the 120px floor there.
      const want = after.view[1] - after.trigger.bottom - 9 < 120 ? 'up' : 'down';
      if (after.side !== want) found.push(`${at}: the panel opens ${after.side ?? 'in the body'}, not ${want}`);
      if (after.side === 'down' && after.panel.top < after.trigger.bottom) found.push(`${at}: the panel covers its trigger`);
      if (after.side === 'up' && after.panel.bottom > after.trigger.top) found.push(`${at}: the panel covers its trigger`);
      if (after.panel.top < 0 || after.panel.bottom > after.view[1] || after.panel.left < 0 || after.panel.right > after.view[0]) found.push(`${at}: the panel leaves the view`);
      sides.push(after.side);
    } else if (name === 'key: Escape' && after.focus !== 'trigger') found.push(`${at}: Escape did not give the focus back to the trigger`);
    before = after;
  }
  return { found, sides };
}

// Scrolls the body 80px when a panel opens: the scroll that this rule removed.
const SCROLL_ON_OPEN = `new MutationObserver(() => {
  const dd = document.querySelector('.ui-dropdown.open');
  if (!dd || dd.__mutated) return;
  dd.__mutated = true;
  let box = dd.parentElement;
  while (box && !['auto', 'scroll'].includes(getComputedStyle(box).overflowY)) box = box.parentElement;
  if (box) box.scrollTop += 80;
}).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });`;

test('in a Modal or a Drawer, each key and click opens the panel over the body and moves nothing', {
  skip: !RUN && 'set DROPDOWN_EDGES=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const { readFileSync } = await import('node:fs');
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_EDGES=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const ids = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  assert.ok(ids.includes(FLOAT_STORY), `the Storybook build has no ${FLOAT_STORY}`);

  const subjects = [
    ...FLOAT_SIZES.map(([width, height]) => [`${width}×${height}`, { viewport: { width, height } }]),
    ...FLOAT_DEVICES.map((name) => { assert.ok(pw.devices[name], `Playwright has no device "${name}"`); return [name, pw.devices[name]]; }),
    ...FLOAT_DUO.map(([width, height]) => [`two-screen ${width}×${height}`, { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }]),
  ];
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  const open = async (context, stage, script) => {
    const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
    await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });\n${script ?? ''}` });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${server.port}/iframe.html?id=${FLOAT_STORY}&viewMode=story&globals=theme:light&args=stage:${stage};before:4;after:2;rows:12`);
    await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
      && window.__STORYBOOK_PREVIEW__.currentRender.id === id, FLOAT_STORY);
    await settle(page, false);
    // A person scrolls the field into view before they use it, and so does a click here.
    await page.locator('.ui-dropdown [data-dropdown-trigger]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
    return { ctx, page };
  };
  try {
    const findings = [];
    const table = [];
    const seen = new Set();
    for (const [label, context] of subjects) {
      for (const stage of FLOAT_STAGES) {
        const { ctx, page } = await open(context, stage);
        const { found, sides } = await floatWalk(page, `${label} ${stage}`, !!context.hasTouch);
        findings.push(...found);
        sides.forEach((s) => seen.add(s));
        table.push(`${label} ${stage}: ${FLOAT_ACTIONS.length} actions, opens ${[...new Set(sides)].join(' and ')}, ${found.length ? 'fail' : 'pass'}`);
        await ctx.close();
      }
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, (FLOAT_SIZES.length + FLOAT_DEVICES.length + FLOAT_DUO.length) * FLOAT_STAGES.length, 'a size or a device was not measured');
    assert.deepEqual(findings, []);
    // Both sides are reached, so the 120px choice is measured and not only the usual side.
    assert.deepEqual([...seen].sort(), ['down', 'up'], `the panels opened only ${[...seen]}`);

    // The mutation: a body that scrolls on the open must be caught.
    const { ctx, page } = await open({ viewport: { width: 1280, height: 800 } }, 'modal', SCROLL_ON_OPEN);
    const { found } = await floatWalk(page, 'mutated', false);
    await ctx.close();
    assert.ok(found.some((f) => f.includes('the trigger moved')), `a body scrolled on the open and the walk found: ${found.join('; ') || 'nothing'}`);
  } finally {
    await browser.close();
    server.proc.kill();
  }
});

/* Rule: an off trigger keeps its off edge while it is pressed, also when the pointer leaves it
 * while the button is held, and also when a Field marks it invalid. The menu stays shut. No
 * fixed element moves by more than 1px, the layout shift stays under 0.1 and the page does not
 * scroll sideways. #915
 *
 * Off unless DROPDOWN_EDGES=1, and it needs web-vitals, as the walk above does.
 *
 * It opens react-fields--form-row-invalid in both themes at each of the ten window sizes and on
 * the six devices above. On the invalid Owner trigger it sets the native `disabled` or
 * `aria-disabled="true"`, as the default, the ghost and the text trigger. Then the mouse moves
 * over it, presses it, leaves it while held, lets go and presses Escape. After each step the
 * edge must be the edge at rest. One more run adds the invalid press rule without its off
 * twin, as 0.226.0 shipped it at fa8fdb8a, and the walk must report the pink edge.
 *
 * Its limits: one engine and the default accent. The story renders the trigger live, so the
 * walk writes the off state into the page. React writes `disabled` only on a change, so the
 * page keeps it. A touch press cannot leave its target in Playwright, so a touch device is
 * walked with the mouse. The filter chip is not walked: its trigger draws no edge, and a chip
 * goes off only with its fieldset, which src/styles/filter-bar.test.js holds.
 * why: docs/components.md#dropdown
 */
const OFF_STORY = 'react-fields--form-row-invalid';
const OFF_CASES = ['default', 'ghost', 'text'].flatMap((variant) => ['native', 'aria'].map((spelling) => ({ variant, spelling })));
// The invalid press rule as fa8fdb8a shipped it, with no off rule after it.
const PRESS_PINK = '.ui-dropdown__trigger[aria-invalid="true"]:active:not(:focus-visible) { border-color: var(--pink); }';

// Sets one case on the invalid Owner trigger, or takes it away again.
const OFF_SET = ({ variant, spelling, on }) => {
  const el = document.querySelector('.ui-field [data-dropdown-trigger][aria-invalid="true"]');
  el.classList.toggle(`ui-dropdown__trigger--${variant}`, on && variant !== 'default');
  if (spelling === 'native') el.disabled = on;
  else if (on) el.setAttribute('aria-disabled', 'true');
  else el.removeAttribute('aria-disabled');
};
const OFF_READ = () => {
  const el = document.querySelector('.ui-field [data-dropdown-trigger][aria-invalid="true"]');
  const doc = document.scrollingElement;
  return {
    edge: getComputedStyle(el).borderTopColor,
    open: !!el.closest('.ui-dropdown.open'),
    fixed: [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed')
      .map((e) => { const r = e.getBoundingClientRect(); return { name: `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`, x: r.left, y: r.top }; }),
    cls: window.__cls,
    over: doc.scrollWidth - doc.clientWidth,
  };
};

// Walks one case and returns its findings.
async function offWalk(page, label, kase) {
  const found = [];
  await page.evaluate(OFF_SET, { ...kase, on: true });
  const trigger = page.locator('.ui-field [data-dropdown-trigger][aria-invalid="true"]');
  await trigger.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const rest = await page.evaluate(OFF_READ);
  const box = await trigger.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const away = box.y + box.height + 40 < page.viewportSize().height ? box.y + box.height + 40 : Math.max(1, box.y - 40);
  const steps = [
    ['hover', () => page.mouse.move(x, y)],
    ['press', () => page.mouse.down()],
    ['leave while held', () => page.mouse.move(x, away, { steps: 4 })],
    ['let go', () => page.mouse.up()],
    ['key: Escape', () => page.keyboard.press('Escape')],
  ];
  for (const [name, run] of steps) {
    await run();
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
    const now = await page.evaluate(OFF_READ);
    const at = `${label} ${kase.variant} ${kase.spelling} ${name}`;
    if (now.edge !== rest.edge) found.push(`${at}: the edge is ${now.edge}, not the off edge ${rest.edge}`);
    if (now.open) found.push(`${at}: the menu opened`);
    for (const f of now.fixed) {
      const was = rest.fixed.find((b) => b.name === f.name);
      if (was && Math.max(Math.abs(f.x - was.x), Math.abs(f.y - was.y)) > 1) found.push(`${at}: ${f.name} moved`);
    }
    if (!(now.cls < 0.1)) found.push(`${at}: the layout shift is ${now.cls}`);
    if (now.over > 0) found.push(`${at}: the page scrolls ${now.over}px sideways`);
  }
  await page.evaluate(OFF_SET, { ...kase, on: false });
  return found;
}

test('a pressed off trigger keeps its off edge when the pointer leaves it, in both themes', {
  skip: !RUN && 'set DROPDOWN_EDGES=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const { readFileSync } = await import('node:fs');
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_EDGES=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  const ids = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  assert.ok(ids.includes(OFF_STORY), `the Storybook build has no ${OFF_STORY}`);

  const subjects = [
    ...FLOAT_SIZES.map(([width, height]) => [`${width}×${height}`, { viewport: { width, height } }]),
    ...FLOAT_DEVICES.map((name) => { assert.ok(pw.devices[name], `Playwright has no device "${name}"`); return [name, pw.devices[name]]; }),
    ...FLOAT_DUO.map(([width, height]) => [`two-screen ${width}×${height}`, { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }]),
  ];
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  const open = async (context, theme, css) => {
    const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
    await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${server.port}/iframe.html?id=${OFF_STORY}&viewMode=story&globals=theme:${theme}`);
    await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
      && window.__STORYBOOK_PREVIEW__.currentRender.id === id, OFF_STORY);
    if (css) await page.addStyleTag({ content: css });
    return { ctx, page };
  };
  try {
    const findings = [];
    const table = [];
    for (const [label, context] of subjects) {
      for (const theme of ['light', 'dark']) {
        const { ctx, page } = await open(context, theme);
        const found = [];
        for (const kase of OFF_CASES) found.push(...await offWalk(page, `${label} ${theme}`, kase));
        findings.push(...found);
        table.push(`${label} ${theme}: ${OFF_CASES.length} cases, ${found.length ? 'fail' : 'pass'}`);
        await ctx.close();
      }
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, (FLOAT_SIZES.length + FLOAT_DEVICES.length + FLOAT_DUO.length) * 2, 'a size, a device or a theme was not measured');
    assert.deepEqual(findings, []);

    // The mutation: the invalid press rule without its off twin must be caught, default and ghost.
    const { ctx, page } = await open({ viewport: { width: 1280, height: 800 } }, 'light', PRESS_PINK);
    const caught = [];
    for (const kase of OFF_CASES.filter(({ spelling }) => spelling === 'native')) caught.push(...await offWalk(page, 'mutated', kase));
    await ctx.close();
    for (const variant of ['default', 'ghost']) {
      assert.ok(caught.some((f) => f.startsWith(`mutated ${variant} native leave while held: the edge`)), `the walk missed the pink press on the ${variant} trigger: ${caught.join('; ') || 'nothing'}`);
    }
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
