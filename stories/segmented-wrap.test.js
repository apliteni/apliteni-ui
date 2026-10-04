/* Rule: an underline segmented strip fits its column, and its chosen tab says
 * so in its own label. #527, #544
 *
 * Read in a browser rather than off the sheet: the strip wraps, so where a mark
 * sits against a tab's edge is geometry, and whether a tab draws a box is
 * `background` and `box-shadow` resolved through the whole cascade — the pair
 * round r31 rejected.
 *
 * What it measures, its limits, and the reason for each of the nine mutations:
 * why: docs/specification.md#the-chosen-tab-in-an-underline-strip
 * Opt-in on a browser, as stories/tap-zone.test.js is; CI runs nothing here.
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
      // Every tab reserves the bar slot, so a mark counts only once it is drawn:
      // a resting tab's slot carries --border at opacity 0 and paints nothing.
      const barShown = before.content !== 'none' && +before.opacity > 0;
      const bar = barShown ? [before.backgroundColor] : [];
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
          barShown ? before.backgroundColor : '-', ...sides].join('|'),
        accents: painted.filter((c) => c === accent).length,
        shadowAccent: s.boxShadow.includes(accent),
        background: s.backgroundColor,
        boxShadow: s.boxShadow,
        // The type step, which is what carries the selection now. Read as
        // numbers so a step can be required rather than merely a difference.
        color: s.color,
        weight: +s.fontWeight,
        // A plate is any background a reader can see against the strip's own
        // ground; a hairline is a border or an inset shadow. Both are the grip
        // shape round r31 took away, and neither may return on any tab.
        plate: s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent',
        edge: sides.length > 0 || (s.boxShadow !== 'none' && /inset/.test(s.boxShadow)),
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
      if (b.content === 'none' || +b.opacity === 0) return null;
      const t = chosen.getBoundingClientRect();
      // left/top are resolved against the tab's padding box; width/height are
      // the drawn bar. The question is whether it stays inside the tab, and —
      // the half that lets the strip wrap — whether it stands clear of the
      // tab's bottom edge rather than sitting on the line between two rows.
      return {
        w: parseFloat(b.width), h: parseFloat(b.height), tabW: t.width, tabH: t.height,
        left: parseFloat(b.left),
        // `bottom` on a pseudo-element computes to the used inset, so this is the
        // bar's own distance from the tab's padding-box bottom.
        clear: +parseFloat(b.bottom).toFixed(1),
      };
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

/**
 * One strip, with its first resting tab under the pointer. A real hover, because
 * the reserved bar slot sits on every tab and the question is whether hovering
 * one draws it — a second accent mark in the strip would be #544 again, reached
 * by a state instead of by a rule.
 */
async function hovered(browser, { html, css, extra = '' }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  try {
    const page = await ctx.newPage();
    await page.setContent('<!doctype html><html lang="en" data-theme="dark"><head><style>'
      + 'html,body{margin:0;padding:0}' + css + extra + `</style></head><body>${html}</body></html>`);
    const tab = page.locator('.ui-seg--underline button:not(.is-active):not([aria-pressed="true"])').first();
    await tab.hover();
    // The bar transitions, so an unsettled read catches it part-grown.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    await page.waitForTimeout(250);
    // Awaited inside the try: the `finally` below closes the context, and an
    // unawaited promise reaches it with the page already gone.
    return await page.evaluate(() => {
      const el = document.querySelector('.ui-seg--underline button:not(.is-active):not([aria-pressed="true"])');
      const b = getComputedStyle(el, '::before');
      const chosen = document.querySelector('.ui-seg--underline button.is-active, .ui-seg--underline button[aria-pressed="true"]');
      return {
        opacity: +b.opacity, transform: b.transform, background: b.backgroundColor,
        chosenBackground: chosen ? getComputedStyle(chosen, '::before').backgroundColor : null,
        ink: getComputedStyle(el).color,
      };
    });
  } finally { await ctx.close(); }
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
        // Round r31 left the type step and the bar, so the step is required and
        // not merely a difference — a chosen tab at the resting weight is a
        // chosen tab holding 2px of accent and nothing else.
        assert.ok(
          s.resting && s.chosen.weight > s.resting.weight && s.chosen.color !== s.resting.color,
          `${s.story}: the chosen tab's label is not a step above a resting one — weight `
          + `${s.chosen.weight} against ${s.resting?.weight}, ink ${s.chosen.color} against `
          + `${s.resting?.color}. The step is half of what says which view is open.`,
        );
        assert.ok(
          s.bar && s.bar.w <= s.bar.tabW && s.bar.h <= s.bar.tabH && s.bar.left >= 0,
          `${s.story}: the accent mark is not inside the tab that carries it — ${JSON.stringify(s.bar)}. `
          + 'On a wrapped strip an edge mark reads as the neighbouring row\'s.',
        );
        // Inside the tab is not enough: a bar flush with the tab's bottom edge
        // is a bar on the line between two wrapped rows, which is the mark the
        // strip used to draw. It has to stand clear of that edge.
        assert.ok(
          s.bar.clear > 0,
          `${s.story}: the accent bar sits on the tab's bottom edge (clear ${s.bar.clear}px). On a `
          + 'wrapped strip that edge is the line between two rows, and the mark reads as either\'s.',
        );
      }
      for (const s of width.filter((x) => x.chosen && x.resting)) {
        // Round r31's own rule, and the one the sheet alone cannot settle: no tab
        // draws a box. A chosen tab raised off the page with a bar standing in its
        // leading padding is the list-row grip, and the strip read as draggable.
        for (const [which, tab] of [['chosen', s.chosen], ['resting', s.resting]]) {
          assert.ok(
            !tab.plate && !tab.edge,
            `${s.story}: the ${which} tab draws a box — background ${tab.background}, box-shadow `
            + `${tab.boxShadow}. A raised plate with a bar beside it is the grip shape Artur `
            + 'rejected in round r31; the tab keeps the ground it stands on.',
          );
        }
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
    // Forced colours repaints an author colour, so the accent bar comes back as
    // the same ink the labels are and the weight step is all that is left. The
    // bar is restated in `Highlight`, which the mode keeps where it is named, so
    // one painted mark survives; the weight step is deliberately NOT read here,
    // because a selection a reader can only find by comparing two labels' stroke
    // weight is not one the mode should be left with. A resting tab must not
    // pick up the same mark on the way, which is the failure #544 found on `main`.
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

    // --- the selection's own six. Each one puts back something the strip used
    // to do, or takes away one of the two things round r31 left it, and each has
    // to be caught by the block above or that block is reading nothing.
    for (const [name, extra, caught] of [
      [
        'the pill rule\'s accent outline back on the chosen tab',
        '.ui-seg--underline button.is-active,.ui-seg--underline button[aria-pressed="true"]{outline:1px solid var(--accent)!important}',
        (s) => s.chosen && s.chosen.accents + (s.chosen.shadowAccent ? 1 : 0) !== 1,
      ],
      [
        'round r30\'s plate and hairline back on the chosen tab',
        '.ui-seg--underline button.is-active,.ui-seg--underline button[aria-pressed="true"]{background:var(--surface)!important;box-shadow:inset 0 0 0 1px var(--border)!important}',
        (s) => s.chosen && (s.chosen.plate || s.chosen.edge),
      ],
      [
        'the pre-#527 rail — the accent on the tab\'s own bottom edge',
        '.ui-seg--underline button.is-active::before,.ui-seg--underline button[aria-pressed="true"]::before{left:0!important;right:0!important;bottom:0!important}',
        (s) => s.bar && s.bar.clear <= 0,
      ],
      [
        'the resting label stepped up to the chosen tab\'s weight',
        '.ui-seg--underline button{font-weight:var(--weight-semibold)!important}',
        (s) => s.chosen && s.resting && s.chosen.weight <= s.resting.weight,
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
    const SHOW_EVERY_BAR = '.ui-seg--underline button::before{opacity:1!important}';
    const unstated = await strips(browser, {
      subjects, css, width: 1280, forced: true,
      extra: `${SHOW_EVERY_BAR}.ui-seg--underline button.is-active::before,`
        + '.ui-seg--underline button[aria-pressed="true"]::before{background:var(--accent)!important}',
    });
    const silent = unstated.filter((s) => s.chosen && s.resting && s.chosen.marks === s.resting.marks);
    assert.ok(
      silent.length,
      'with the forced-colours restatement gone — and every tab\'s bar drawn, so the chosen one '
      + 'cannot be found by having a bar at all — the chosen tab still read differently. The '
      + 'check above is measuring the normal cascade rather than the mode.',
    );
    t.diagnostic(`mutation — no forced-colours restatement — ${silent.length} chosen tabs become indistinguishable`);
    // And the restatement alone answers it: the same strip with every bar drawn,
    // `Highlight` left in place, keeps the chosen tab apart from its neighbours.
    const held = await strips(browser, { subjects, css, width: 1280, forced: true, extra: SHOW_EVERY_BAR });
    for (const s of held.filter((x) => x.chosen && x.resting)) {
      assert.ok(
        s.chosen.marks !== s.resting.marks,
        `${s.story}: with every tab's bar drawn in forced colours the chosen one is not `
        + `distinguishable — both ${s.chosen.marks}. \`Highlight\` is what has to separate them.`,
      );
    }

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

    // --- and the placement's own. The bar is on ::before because below the phone
    // step tap-zone.css owns ::after and sizes it to the 44px floor. Drawing the
    // bar there instead takes the zone down to the bar, which is the latent loss
    // the sheet's comment claims and this is what measures it.
    const onAfter = await strips(browser, {
      subjects, css, width: 390, touch: true,
      extra: '.ui-seg--underline button.is-active::after,.ui-seg--underline button[aria-pressed="true"]::after'
        + '{content:""!important;height:2px!important;width:auto!important;'
        + 'left:var(--space-3)!important;right:var(--space-3)!important;top:auto!important;bottom:3px!important}',
    });
    const collapsed = onAfter.filter((s) => s.chosen && s.chosen.zone != null && s.chosen.zone < 44);
    assert.ok(
      collapsed.length,
      'the bar drawn on ::after left every tap zone at the floor, so the sheet\'s reason for '
      + 'keeping it on ::before measures nothing.',
    );
    t.diagnostic(`mutation — bar on ::after — ${collapsed.length} tap zones collapse under the floor`);

    // --- hover. Every tab carries the bar slot so the mark can travel, which
    // means a careless hover rule turns a second tab's slot on and the strip
    // paints the accent twice. Measured under a real pointer.
    const hoverSubject = { html: subjects[0].html, css };
    const onHover = await hovered(browser, hoverSubject);
    assert.equal(
      onHover.opacity, 0,
      `a resting tab under the pointer draws its bar (opacity ${onHover.opacity}) in `
      + `${onHover.background}. The accent belongs to the chosen tab alone — #544.`,
    );
    const slotOn = await hovered(browser, { ...hoverSubject, extra: '.ui-seg--underline button:hover::before{opacity:1!important}' });
    assert.equal(
      slotOn.opacity, 1,
      'a hover rule that turns the slot on left it off, so the check above reads nothing.',
    );
    t.diagnostic(`hover: resting slot at opacity ${onHover.opacity}, chosen bar ${onHover.chosenBackground}`);

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
