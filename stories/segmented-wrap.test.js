/* Rule: an underline segmented strip fits its column, and its chosen tab says
 * so inside its own box — every tab inside the strip, no tab too wide for it,
 * no page scrolled sideways, no scroll box, and a selection that is one accent
 * mark drawn entirely within the tab that carries it. #527, #544
 *
 * Why the second half is measured here and not read off the sheet: the strip
 * wraps, and a mark on a tab's EDGE belongs to whichever row the reader decides
 * it belongs to. Containment is a geometric claim, and the sheet cannot settle
 * it.
 *
 * The shipped sheet is read at 320, 390 and 1280 on a fine pointer, at 390 on a
 * coarse one, and at 1280 in forced colours; the mutations at 320, 390 and 1280. Subjects come from the story
 * sweep, with two fixtures for the long labels no story carries. Limits: the
 * sweep reads stories/ only, so no React strip is measured; every discovered
 * subject's labels are short — the fixtures are what answer that; and the marks
 * are read from the computed cascade, so what a GPU finally paints is the
 * screenshots' evidence, not this file's. Opt-in on a browser as
 * stories/tap-zone.test.js is, for the same reason: CI runs nothing here.
 * why: scripts/evidence/README.md
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
    const chosen = seg.querySelector('button.is-active, button[aria-pressed="true"], button[aria-selected="true"]');
    const resting = [...seg.querySelectorAll('button')].find((b) => b !== chosen);

    // --accent as the cascade resolves it, in the rgb() every computed colour
    // comes back as. Reading the custom property would compare a hex to an rgb.
    const probe = document.createElement('span');
    probe.style.color = 'var(--accent)';
    seg.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();

    /** Every place an element can put paint, and whether that paint is the accent. */
    const marks = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      const before = getComputedStyle(el, '::before');
      const sides = ['Top', 'Right', 'Bottom', 'Left']
        .filter((side) => s[`border${side}Style`] !== 'none' && parseFloat(s[`border${side}Width`]) > 0)
        .map((side) => s[`border${side}Color`]);
      const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 ? [s.outlineColor] : [];
      const bar = before.content !== 'none' ? [before.backgroundColor] : [];
      const painted = [s.backgroundColor, ...sides, ...outline, ...bar]
        .filter((c) => c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent');
      return {
        // What actually marks a tab in forced colours, as one string. The
        // background is left out on purpose: the mode maps an author background
        // to Canvas, and Canvas on a Canvas page paints nothing a reader can
        // see, so a chosen tab whose only remaining difference is its
        // background is a chosen tab nobody can find. Measured — the plate
        // comes back opaque white against the resting tabs' transparent one.
        // An outline that does not paint contributes nothing: `outline: 0` and
        // the UA's own `none 3px` are the same picture.
        marks: [outline.length ? `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}` : '-',
          before.content === 'none' ? '-' : before.backgroundColor, ...sides].join('|'),
        accents: painted.filter((c) => c === accent).length,
        shadowAccent: s.boxShadow.includes(accent),
        background: s.backgroundColor,
        boxShadow: s.boxShadow,
        // A zone grows outside the drawn box; this is the zone, so the tight
        // row gap is checked against the floor it has to leave standing.
        zone: (() => { const a = getComputedStyle(el, '::after'); return a.content === 'none' ? null : +parseFloat(a.height).toFixed(1); })(),
      };
    };

    // The selection has to be inside the tab that carries it, because a wrapped
    // strip has a row above and a row below and an edge mark belongs to both.
    const barBox = (() => {
      if (!chosen) return null;
      const b = getComputedStyle(chosen, '::before');
      if (b.content === 'none') return null;
      const t = chosen.getBoundingClientRect();
      // left/top are resolved against the tab's padding box; width/height are
      // the drawn bar. The question is only whether it stays inside the tab.
      return { w: parseFloat(b.width), h: parseFloat(b.height), tabW: t.width, tabH: t.height, left: parseFloat(b.left) };
    })();

    return {
      chosen: marks(chosen),
      resting: marks(resting),
      bar: barBox,
      stripBorder: ['Top', 'Right', 'Bottom', 'Left']
        .filter((side) => cs[`border${side}Style`] !== 'none' && parseFloat(cs[`border${side}Width`]) > 0),
      rowGap: +parseFloat(cs.rowGap).toFixed(1),
      columnGap: +parseFloat(cs.columnGap).toFixed(1),
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
async function strips(browser, { subjects, css, width, extra = '', touch = false, forced = false }) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 }, hasTouch: touch, deviceScaleFactor: 1, reducedMotion: 'reduce',
    ...(forced ? { forcedColors: 'active' } : {}),
  });
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
    // The one width where tap-zone.css has anything to say. The strip keeps its
    // own row gap there, so this pass is what proves the gap did not cost the
    // 44px floor.
    const coarse = await strips(browser, { subjects, css, width: 390, touch: true });

    assert.ok(
      narrow.length >= subjects.length,
      `${narrow.length} strips measured at 390 from ${subjects.length} stories — the probe found `
      + 'fewer strips than there are stories carrying one, so some went unread.',
    );

    for (const width of [tight320, narrow, wide, coarse]) {
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

    // --- What the chosen tab says, and where it says it.
    for (const width of [tight320, narrow, wide, coarse]) {
      for (const s of width.filter((x) => x.chosen)) {
        assert.equal(
          s.chosen.accents + (s.chosen.shadowAccent ? 1 : 0), 1,
          `${s.story}: the chosen tab paints the accent ${s.chosen.accents + (s.chosen.shadowAccent ? 1 : 0)} `
          + 'times. One element, one accent mark — a rail AND a box is the same sentence said twice. '
          + `background ${s.chosen.background}, box-shadow ${s.chosen.boxShadow}`,
        );
        // Read against a resting tab rather than against a constant: the claim
        // is that a reader can tell them apart without looking anywhere else.
        assert.ok(
          s.resting && (s.chosen.background !== s.resting.background || s.chosen.boxShadow !== s.resting.boxShadow),
          `${s.story}: the chosen tab's own box is drawn exactly like a resting tab's, so the `
          + 'accent mark is the only thing saying which is chosen.',
        );
        assert.ok(
          s.bar && s.bar.w <= s.bar.tabW && s.bar.h <= s.bar.tabH && s.bar.left >= 0,
          `${s.story}: the accent mark is not inside the tab that carries it — ${JSON.stringify(s.bar)}. `
          + 'On a wrapped strip an edge mark reads as the neighbouring row\'s.',
        );
      }
      for (const s of width) {
        assert.deepEqual(
          s.stripBorder, [],
          `${s.story}: the strip draws a rule on ${s.stripBorder.join(', ')}. The chosen tab carries `
          + 'the selection, so a line under the row marks nothing and reads as noise. #545',
        );
        assert.equal(
          s.rowGap, s.columnGap,
          `${s.story}: the strip's rows stand ${s.rowGap}px apart against a ${s.columnGap}px track. A `
          + 'contained highlight belongs to no row but its own, so the rows close back to the track.',
        );
      }
    }
    // Forced colours keeps neither the plate nor the hairline — it repaints
    // `background` and drops `box-shadow` outright — so the chosen tab has to
    // say it again in something the mode does keep. A resting tab must not pick
    // up the same mark on the way, which is the failure #544 found on `main`.
    const forced = await strips(browser, { subjects, css, width: 1280, forced: true });
    for (const s of forced.filter((x) => x.chosen && x.resting)) {
      assert.ok(
        s.chosen.marks !== s.resting.marks,
        `${s.story}: in forced colours the chosen tab is drawn exactly like a resting one — `
        + `both ${s.chosen.marks}. Nothing there says which view is open.`,
      );
    }
    assert.ok(forced.some((s) => s.chosen), 'no strip carried a chosen tab under forced colours');
    t.diagnostic(`forced colours: ${forced.filter((s) => s.chosen).length} chosen tabs, each unlike its resting neighbours`);

    // The tight gap may not cost the tap floor. A tab draws 41, and the 4px gap
    // is what its zone grows into — 1.5px each side, so two rows' zones stop
    // 1px short of meeting. why: docs/specification.md#a-tap-reaches-the-floor-below-the-phone-step
    for (const s of coarse.filter((x) => x.chosen && x.chosen.zone != null)) {
      assert.ok(
        s.chosen.zone >= 44,
        `${s.story}: the chosen tab's tap zone is ${s.chosen.zone}px below the phone step, under the `
        + '44px floor. Closing the rows took the clearance the zone grows into.',
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
    t.diagnostic(`${subjects.length} subjects, ${tight320.length} strips at 320, ${narrow.length} at 390, ${wide.length} at 1280, ${coarse.length} at 390 coarse`);

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

    // --- the selection's own four. Each one puts back something the strip used
    // to do, and each has to be caught by the block above or that block is
    // reading nothing.
    for (const [name, extra, caught] of [
      [
        'the pill rule\'s accent outline back on the chosen tab',
        '.ui-seg--underline button.is-active,.ui-seg--underline button[aria-pressed="true"]'
        + '{outline:1px solid var(--accent)!important}',
        (s) => s.chosen && s.chosen.accents + (s.chosen.shadowAccent ? 1 : 0) !== 1,
      ],
      [
        'the pre-#527 chosen tab — a rail on its bottom edge and nothing else',
        '.ui-seg--underline button.is-active,.ui-seg--underline button[aria-pressed="true"]'
        + '{background:transparent!important;box-shadow:none!important;'
        + 'border-bottom:2px solid var(--accent)!important}'
        + '.ui-seg--underline button.is-active::before,'
        + '.ui-seg--underline button[aria-pressed="true"]::before{content:none!important}',
        (s) => s.chosen && (s.resting
          && s.chosen.background === s.resting.background && s.chosen.boxShadow === s.resting.boxShadow),
      ],
      [
        'the strip\'s bottom rule back under the tabs',
        '.ui-seg--underline{border-bottom:1px solid var(--border)!important}',
        (s) => s.stripBorder.length > 0,
      ],
      [
        'the rows stood --space-5 apart again',
        '.ui-seg--underline{row-gap:var(--space-5)!important}',
        (s) => s.rowGap !== s.columnGap,
      ],
    ]) {
      const mutated = await strips(browser, { subjects, css, width: 390, extra });
      const failed = mutated.filter(caught);
      assert.ok(
        failed.length,
        `${name}: every check above stayed green against it, so they measure nothing.`,
      );
      t.diagnostic(`mutation — ${name} — fails ${failed.length} of ${mutated.length} strips`);
    }

    // --- forced colours' own. The block put back the way the sheet read before
    // it existed: a plate and a hairline the mode throws away, and nothing else.
    const unstated = await strips(browser, {
      subjects, css, width: 1280, forced: true,
      extra: '.ui-seg--underline button.is-active,.ui-seg--underline button[aria-pressed="true"],'
        + '.ui-seg--underline button[aria-selected="true"]{outline:0!important}'
        + '.ui-seg--underline button.is-active::before,.ui-seg--underline button[aria-pressed="true"]::before,'
        + '.ui-seg--underline button[aria-selected="true"]::before{content:none!important}',
    });
    const silent = unstated.filter((s) => s.chosen && s.resting && s.chosen.marks === s.resting.marks);
    assert.ok(
      silent.length,
      'with the forced-colours restatement gone the chosen tab still read differently, so the '
      + 'check above is measuring the normal cascade rather than the mode.',
    );
    t.diagnostic(`mutation — no forced-colours restatement — ${silent.length} chosen tabs become indistinguishable`);

    // --- the tap floor's own. The strip keeps a 4px row gap instead of
    // --tap-gap, and the zone reaches 44 only because 4px of clearance is
    // declared for it. Take the clearance away and the floor goes with it.
    const floorless = await strips(browser, {
      subjects, css, width: 390, touch: true,
      extra: '.ui-seg--underline{--tap-clear-y:0px!important}',
    });
    const short = floorless.filter((s) => s.chosen && s.chosen.zone != null && s.chosen.zone < 44);
    assert.ok(
      short.length,
      'the zones still reached 44 with no clearance declared, so the floor check reads nothing.',
    );
    t.diagnostic(`mutation — no vertical clearance — ${short.length} chosen tabs fall under the 44px floor`);

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
