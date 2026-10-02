/* Rule: an underline segmented strip fits its column. Every tab is drawn inside
 * the strip's own box, so the strip wraps rather than put one past its right
 * edge, and it is never a scroll box. #527
 *
 * src/styles/segmented.test.js holds the declarations as source text and cannot
 * see clipping a parent reintroduces; this is the rendered outcome. Subjects
 * are discovered from the story sweep, never listed. Opt-in on a browser the
 * way stories/tap-zone.test.js is, for the same reason: CI runs nothing here
 * and the builder reports the numbers. why: scripts/evidence/README.md
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
  const subjects = stories.filter((s) => s.html.includes('ui-seg--underline'));
  assert.ok(
    subjects.length >= 2,
    `${subjects.length} stories render an underline strip. The sweep is the coverage: a filter `
    + 'that stopped matching would pass while measuring nothing.',
  );

  const css = kitStylesheet();
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  try {
    const narrow = await strips(browser, { subjects, css, width: 390 });
    const wide = await strips(browser, { subjects, css, width: 1280 });

    assert.ok(
      narrow.length >= subjects.length,
      `${narrow.length} strips measured at 390 from ${subjects.length} stories — the probe found `
      + 'fewer strips than there are stories carrying one, so some went unread.',
    );

    for (const width of [narrow, wide]) {
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
        assert.equal(
          s.overflowX, 'visible',
          `${s.story}: the strip is a scroll box. Chrome makes one a keyboard stop with the `
          + "browser's own outline, which #457 refused, and it clips the focus ring's glow.",
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
    t.diagnostic(`${subjects.length} stories, ${narrow.length} strips at 390, ${wide.length} at 1280`);

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
  } finally {
    await browser.close();
  }
});
