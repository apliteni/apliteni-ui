/* Rule: an underline segmented strip fits its column — every tab inside the
 * strip's box, no tab too wide for it, no page scrolled sideways, no scroll
 * box. src/styles/segmented.test.js reads the declarations; this is what they
 * draw. #527
 *
 * The shipped sheet is read at 320, 390 and 1280; the mutations at 320, where a
 * label that cannot fit shows soonest. Subjects come from the story sweep, with
 * two fixtures for the long labels no story carries. Limits: the sweep reads stories/ only, so no React strip is
 * measured, and every discovered subject's labels are short — the fixtures are
 * what answer that. Opt-in on a browser as stories/tap-zone.test.js is, for the
 * same reason: CI runs nothing here. why: scripts/evidence/README.md
 *
 *   UI_PLAYWRIGHT=… SEG_WRAP=1 node --test stories/segmented-wrap.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const RUN = process.env.SEG_WRAP === '1';

/** Read every underline strip on the page against its own box. */
const PROBE = (html) => {
  document.body.innerHTML = html;
  return [...document.querySelectorAll('.ui-seg--underline')].map((seg) => {
    const box = seg.getBoundingClientRect();
    const tabs = [...seg.querySelectorAll('button')].map((b) => {
      const r = b.getBoundingClientRect();
      return { label: b.textContent.trim(), left: r.left, right: r.right, top: Math.round(r.top) };
    });
    const cs = getComputedStyle(seg);
    // The ink box of a label, not its padded button box: the question is which
    // row of WORDS the rail reads as belonging to.
    const ink = (b) => { const r = document.createRange(); r.selectNodeContents(b); return r.getBoundingClientRect(); };
    const chosen = seg.querySelector('button.is-active, button[aria-pressed="true"], button[aria-selected="true"]');
    const nextRow = chosen && [...seg.querySelectorAll('button')]
      .find((b) => Math.round(b.getBoundingClientRect().top) > Math.round(chosen.getBoundingClientRect().top));
    const rail = chosen ? chosen.getBoundingClientRect().bottom : null;
    return {
      rail: chosen && nextRow ? {
        label: chosen.textContent.trim(),
        toOwnLabel: +(rail - ink(chosen).bottom).toFixed(1),
        toNextRowLabel: +(ink(nextRow).top - rail).toFixed(1),
      } : null,
      left: box.left,
      right: box.right,
      // The padding box is what a scroll box would clip against.
      past: +(seg.scrollWidth - seg.clientWidth).toFixed(2),
      overflowX: cs.overflowX,
      // Drawn inside the box is not the same question as able to fit in it.
      // `flex-wrap` moves whole items and cannot narrow one that is already too
      // wide, so a tab wider than the content box is the one that spills. #527
      widest: +Math.max(...tabs.map((t) => t.right - t.left)).toFixed(1),
      inner: +(box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)).toFixed(1),
      pageScrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      rows: new Set(tabs.map((t) => t.top)).size,
      tabs,
      // A tab drawn outside the strip is the defect #527 reported.
      outside: tabs
        .filter((t) => t.right > box.right + 0.5 || t.left < box.left - 0.5)
        .map((t) => `${t.label} (${t.left.toFixed(1)}…${t.right.toFixed(1)} vs strip ${box.left.toFixed(1)}…${box.right.toFixed(1)})`),
    };
  });
};

/** Every strip on every story, at one width, under one extra sheet. */
async function strips(browser, { subjects, css, width, extra = '' }) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  try {
    const page = await ctx.newPage();
    await page.setContent(
      '<!doctype html><html lang="en" data-theme="dark"><head><style>'
      + 'html,body{margin:0;padding:0}' + css + extra
      + '</style></head><body></body></html>',
    );
    const out = [];
    for (const s of subjects) {
      for (const strip of await page.evaluate(PROBE, s.html)) out.push({ story: s.id, ...strip });
    }
    return out;
  } finally {
    await ctx.close();
  }
}

/**
 * The two labels no showcase carries, built with the kit's own factory.
 *
 * Every discovered subject names a view in one or two short words, so the sweep
 * alone is green against a tab that cannot fit its column at all — which is the
 * defect `white-space: nowrap` left behind once the scroll box went. One fixture
 * is ordinary prose and the other a single unbreakable word, because they fail
 * differently: prose narrows on `white-space: normal` alone, and the word needs
 * `overflow-wrap: anywhere` to lower the tab's min-content width.
 */
async function longLabelFixtures() {
  const { segmented } = await import('../src/components/index.js');
  return [
    {
      id: 'fixture:long prose label',
      html: segmented({
        options: ['Revenue', 'Operating expenditure by region and segment, year to date', 'Cash'],
        appearance: 'underline', ariaLabel: 'Views',
      }),
    },
    {
      id: 'fixture:unbreakable label',
      html: segmented({
        options: ['Revenue', 'Operatingexpenditurebyregionandsegmentyeartodate', 'Cash'],
        appearance: 'underline', ariaLabel: 'Views',
      }),
    },
  ];
}

test('measured: an underline strip keeps every tab inside its own box', { skip: !RUN && 'set SEG_WRAP=1' }, async (t) => {
  const { storySubjects, kitStylesheet, playwright } = await import('./lib/tap-zone.js');
  const pw = await playwright();
  assert.ok(
    pw,
    'SEG_WRAP=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one — '
    + 'scripts/evidence/README.md has the recipe — or leave the variable unset. A browser gate '
    + 'that quietly skipped would report the same green as one that measured.',
  );

  const { subjects: stories, problems } = await storySubjects();
  assert.deepEqual(problems, [], 'a story that will not render is a failure here, not a silence');
  const found = stories.filter((s) => s.html.includes('ui-seg--underline'));
  assert.ok(
    found.length >= 2,
    `${found.length} stories render an underline strip. The sweep is the coverage: a filter `
    + 'that stopped matching would pass while measuring nothing.',
  );
  const fixtures = await longLabelFixtures();
  assert.equal(fixtures.length, 2, 'both long-label fixtures have to be measured, not one');
  const subjects = [...found, ...fixtures];

  const css = kitStylesheet();
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  try {
    // 320 is the width the spill was measured at, and the narrowest the kit
    // draws for; 390 is the issue's own; 1280 is where the strip must stay on
    // one row. The shipped sheet goes through the assertion loop at all three.
    const tight320 = await strips(browser, { subjects, css, width: 320 });
    const narrow = await strips(browser, { subjects, css, width: 390 });
    const wide = await strips(browser, { subjects, css, width: 1280 });

    assert.ok(
      narrow.length >= subjects.length,
      `${narrow.length} strips measured at 390 from ${subjects.length} stories — the probe found `
      + 'fewer strips than there are stories carrying one, so some went unread.',
    );

    for (const width of [tight320, narrow, wide]) {
      for (const s of width) {
        assert.deepEqual(
          s.outside, [],
          `${s.story}: a tab is drawn outside its strip. This is #527 — the tab is on the page `
          + 'but not in the box, so at rest nobody can see it.',
        );
        assert.equal(
          s.past, 0,
          `${s.story}: the strip's content is ${s.past}px wider than its box. Whether that `
          + 'scrolls or spills, a tab is out of sight at rest.',
        );
        assert.ok(
          s.widest <= s.inner + 0.5,
          `${s.story}: a tab is ${s.widest}px wide in a ${s.inner}px column. Wrapping moves whole `
          + 'tabs and cannot narrow one, so this tab is drawn past the strip whatever the strip does.',
        );
        assert.ok(
          s.pageScrollWidth <= s.viewport,
          `${s.story}: the page scrolls sideways — scrollWidth ${s.pageScrollWidth} against a `
          + `${s.viewport}px viewport. A strip that spills drags every sibling with it. #435`,
        );
        assert.equal(
          s.overflowX, 'visible',
          `${s.story}: the strip is a scroll box, so it clips the focus ring's glow against `
          + 'its own 4px padding and hides at rest whatever does not fit.',
        );
      }
    }

    // A wrapped strip's rail has to read as the mark of the row it is drawn on.
    // It sits under its own label and over the next row's, so the two distances
    // are the whole question — at the track's own 4px they were 14 and 16, and
    // #545 removes the accent box that is carrying selection in the meantime.
    for (const s of narrow.filter((x) => x.rows > 1 && x.rail)) {
      assert.ok(
        s.rail.toNextRowLabel > s.rail.toOwnLabel * 1.5,
        `${s.story}: the chosen tab's rail is ${s.rail.toOwnLabel}px under its own label and `
        + `${s.rail.toNextRowLabel}px over the next row's, so it reads as either row's mark.`,
      );
    }

    // The issue's own subject: at a phone width the screener's three views do not
    // fit one row, so the strip has to use two. A sheet that honoured
    // `flex-wrap: wrap` while shrinking the tabs to fit would pass everything
    // above; this is the case that says the fix is the one #527 asked for.
    const screener = narrow.filter((s) => s.story.includes('StockScreener'));
    assert.ok(screener.length, 'no Stock screener story carried an underline strip at 390');
    for (const s of screener) {
      assert.equal(s.rows, 2, `${s.story}: expected the three views on two rows at 390, got ${s.rows}`);
    }
    for (const s of wide.filter((x) => x.story.includes('StockScreener'))) {
      assert.equal(s.rows, 1, `${s.story}: expected one row at 1280, got ${s.rows}`);
    }
    t.diagnostic(`${subjects.length} subjects, ${tight320.length} strips at 320, ${narrow.length} at 390, ${wide.length} at 1280`);

    // --- the mutation. The sheet put back the way `main` shipped it: one row and
    // a scroll box. If the checks above still pass against that, they measure
    // nothing and the green they report is the green a deleted test reports.
    const reverted = await strips(browser, {
      subjects, css, width: 390,
      extra: '.ui-seg--underline{flex-wrap:nowrap!important;overflow:auto!important}',
    });
    const caught = reverted.filter((s) => s.outside.length || s.past > 0 || s.overflowX !== 'visible');
    assert.ok(
      caught.length,
      'the pre-#527 sheet passed every check above. Nothing here measures the defect.',
    );
    t.diagnostic(`mutation to nowrap + overflow:auto fails ${caught.length} of ${reverted.length} strips`);

    // --- the second mutation. The rows closed back up to the track's own gap,
    // which is what the strip inherited before #527 set one for the wrap.
    const tight = await strips(browser, {
      subjects, css, width: 390,
      extra: '.ui-seg--underline{row-gap:var(--space-1)!important}',
    });
    const ambiguous = tight.filter((s) => s.rows > 1 && s.rail
      && !(s.rail.toNextRowLabel > s.rail.toOwnLabel * 1.5));
    assert.ok(
      ambiguous.length,
      'closing the rows to the track gap left every rail still reading as its own row. The '
      + 'check above measures nothing.',
    );
    t.diagnostic(`mutation to a 4px row gap fails ${ambiguous.length} of ${tight.filter((s) => s.rows > 1 && s.rail).length} wrapped strips`);

    // --- the tab's own two. `nowrap` is what the sheet carried while the scroll
    // box contained it; `break-word` is the weaker half of what replaced it, which
    // wraps prose but cannot narrow one unbreakable word. Only the fixtures have a
    // label long enough to show either — which is why they are here.
    for (const [name, extra] of [
      ['nowrap', '.ui-seg--underline button{white-space:nowrap!important}'],
      ['break-word', '.ui-seg--underline button{white-space:normal!important;overflow-wrap:break-word!important}'],
    ]) {
      const spilt = await strips(browser, { subjects, css, width: 320, extra });
      const over = spilt.filter((s) => s.widest > s.inner + 0.5 || s.pageScrollWidth > s.viewport);
      assert.ok(
        over.length,
        `${name} on the tab left every tab inside its column at 320. The containment checks `
        + 'above measure nothing, or no subject has a label long enough to show it.',
      );
      t.diagnostic(`mutation to ${name} fails ${over.length} of ${spilt.length} strips at 320`);
    }
  } finally {
    await browser.close();
  }
});
