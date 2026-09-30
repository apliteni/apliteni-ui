// The keyboard walk: every stop draws the shared ring, and nothing draws its own.
//
// Artur refused the browser's focus outline on #457. #482 measured the live
// landing page and found 19 of its 34 stops without the kit's ring: 17 fell back
// to the browser's outline — black in both themes and blind to the accent — and
// two drew a flat accent outline instead of the gap-band-halo ring. Two kit
// components carried the same hole, so every consumer of them inherited it.
//
// Subjects, all discovered: the landing page as site/build.mjs composes it, and
// every story exported by the shell and footer story files. Each is walked once —
// a focus rule is a fact about the source, not about a theme, so dark and light
// read the same here. The ring's colour against each ground is measured
// elsewhere, in stories/guidelines/accessibility-floor.test.js.
//
// WHAT THIS GATE WILL NOT CATCH.
//
//  - It reads the CSS source, not a browser. JSDOM computes neither box-shadow
//    nor :focus-visible, so asking it for a computed value would report "no
//    indicator" for every control in the kit. The cascade is therefore resolved
//    here instead, by specificity and document order over the page's own sheets
//    — which is how #487's review found a ring rule that matched a control and
//    painted nothing. What that resolver does not model is listed in
//    stories/lib/focus-walk.js: !important, inline style, a query's condition,
//    a state the static DOM is not in, and var() expansion.
//  - It says nothing about the ring's contrast, its shape on screen, or whether
//    a clipping ancestor hides it.
//  - A scroll container Chrome makes a keyboard stop is not one of its stops.
//    `keyboardStops` matches a fixed list of focusable kinds, and an overflowing
//    `div` is in none of them. #487's review found one such stop outside this
//    walk — `.ui-dropdown__panel.is-scroll`, which keeps the browser's own
//    outline. It predates #482 and is recorded as remaining work on the issue.
//  - It walks these surfaces only. Not the whole story catalogue: the guideline
//    pages draw deliberate counter-examples (stories/guidelines/_state-set.js
//    paints an ad-hoc ring to show the rule being broken), and a gate over all of
//    them would have to tell a specimen from a defect. Story prose links are the
//    known remaining gap — the kit styles a bare `a` in base.css but gives it no
//    focus rule, and a net over every anchor is a consumer-wide change with its
//    own decision behind it.
//  - Scripts do not run. A control a script adds after load is not walked.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { STYLE_FILES, installDomGlobals, storyFiles } from './lib/contrast.js';
import {
  focusRules, judgeStops, failures, accessibleName, sheetText,
  focusPaint, cascadeFailures, specificity, scrollingSelectors,
} from './lib/focus-walk.js';
import { topbar, footer, CHROME_CSS } from '../site/chrome.mjs';
import { catalogueCopy } from '../site/catalogue.mjs';
import { iconNames } from '../src/assets/icons.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

/**
 * Stops that may keep their own answer, each with the reason the source states.
 * Every entry is asserted to be REACHED, so an exemption that outlives the
 * control it excuses fails this file instead of hiding a new hole behind it.
 */
const EXEMPT = [
  {
    selector: '.ui-cmdk__input',
    why: 'the palette\'s only tab stop holds focus for as long as the dialog is up, so a '
      + 'ring would be painted the whole time and mark nothing. Decided in src/styles/'
      + 'command-palette.css, which states it on the declaration.',
  },
];
const exempt = (stop) => EXEMPT.some(({ selector }) => stop.el.matches(selector));

// ---- the stylesheets ------------------------------------------------------

/** The kit's own sheets, in the order src/index.css imports them. */
const KIT = STYLE_FILES.map((file) => ({ file, css: read(file) }));
const kitRules = KIT.flatMap(({ file, css }) => focusRules(css, file));
assert.ok(kitRules.length >= 30, `only ${kitRules.length} focus rules found in the kit sheet`);

// ---- the landing page -----------------------------------------------------

/** The landing page the way site/build.mjs composes it: the shared chrome
 *  injected into site/index.html, then the catalogue counts resolved. A renamed
 *  placeholder fails here rather than walking a page with no topbar in it. */
function landingHtml() {
  let html = catalogueCopy(read('site/index.html'), {
    icons: iconNames,
    buttonSource: read('react/src/primitives/Button.tsx'),
  });
  for (const [marker, value] of [
    ['{{TOPBAR}}', topbar('')],
    ['{{FOOTER}}', footer()],
    ['{{CHROME_CSS}}', CHROME_CSS],
    ['{{CHROME_JS}}', ''],
  ]) {
    assert.equal(html.split(marker).length, 2, `site/index.html must hold exactly one ${marker}`);
    html = html.replace(marker, value);
  }
  return html;
}

// ---- the subjects ---------------------------------------------------------

/** The story files #482 names, found by filename in the discovered catalogue so
 *  a moved or renamed file fails rather than dropping out of the walk. */
const SUBJECT_FILES = ['apps/ShellLayouts.stories.js', 'components/Footer.stories.js'];
for (const wanted of SUBJECT_FILES) {
  assert.ok(storyFiles.includes(wanted), `${wanted} is not in the story catalogue any more`);
}

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});

const subjects = [];

{
  const dom = new JSDOM(landingHtml(), { virtualConsole: quiet });
  const local = [...dom.window.document.querySelectorAll('style')]
    .map((el) => el.textContent).join('\n');
  subjects.push({
    id: 'site/index.html',
    body: dom.window.document.body,
    sheets: [...KIT, { file: 'site page <style>', css: local }],
  });
}

{
  const dom = new JSDOM(
    '<!doctype html><html lang="en" data-theme="dark"><head></head><body></body></html>',
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  // Several stories build their markup with document.createElement, exactly as
  // stories/a11y.test.js and the contrast walk find.
  installDomGlobals(dom.window);
  for (const rel of SUBJECT_FILES) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    let rendered = 0;
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      assert.equal(typeof render, 'function', `${rel}:${name} has nothing to render`);
      const args = { ...def.args, ...story.args };
      const out = render(args, { globals: { theme: 'dark', accent: 'default' }, args });
      const html = typeof out === 'string' ? out : out?.outerHTML;
      assert.ok(html, `${rel}:${name} rendered nothing to walk`);
      // One document per story, so a story cannot be judged against the markup
      // of the one before it.
      const page = new JSDOM(
        `<!doctype html><html lang="en" data-theme="dark"><head></head><body>${html}</body></html>`,
        { virtualConsole: quiet },
      );
      const local = [...page.window.document.body.querySelectorAll('style')]
        .map((el) => el.textContent).join('\n');
      subjects.push({
        id: `stories/${rel}:${name}`,
        body: page.window.document.body,
        sheets: [...KIT, { file: `stories/${rel}:${name} <style>`, css: local }],
      });
      rendered += 1;
    }
    assert.ok(rendered > 0, `${rel} exported no story to walk`);
  }
}

const walked = subjects.map((subject) => {
  const rules = subject.sheets.flatMap(({ file, css }) => focusRules(css, file));
  return {
    ...subject,
    rules,
    ...judgeStops(subject.body, rules),
    paint: focusPaint(subject.body, subject.sheets),
  };
});

// ---- the gate -------------------------------------------------------------

test('focus walk: every selector the sheets carry is one JSDOM can match', () => {
  const broken = walked.flatMap(({ id, unmatchable }) => unmatchable.map((u) => `${id}: ${u}`));
  assert.deepEqual(broken, [], 'a selector this walk cannot match is a control it never judged');
});

test('focus walk: no keyboard stop falls back to a native or non-ring outline', () => {
  const found = walked.flatMap(({ id, stops }) => failures(stops, exempt).map((f) => `${id} → ${f}`));
  assert.deepEqual(found, [], `${found.length} stops do not draw the shared ring:\n  ${found.join('\n  ')}`);
});

test('focus walk: every exemption still names a stop that exists', () => {
  for (const { selector, why } of EXEMPT) {
    const hits = walked.filter(({ stops }) => stops.some((stop) => stop.el.matches(selector)));
    assert.ok(hits.length, `${selector} is exempt ("${why}") but no walked surface has one — drop the entry`);
  }
});

// The counts are the anti-vacuity check: a walk that stops finding controls
// passes every assertion above it. Each number is what this tree measures today,
// so a control that leaves a surface fails here and has to be re-counted by hand.
test('focus walk: the surfaces and stops this gate covers', () => {
  const counts = Object.fromEntries(walked.map(({ id, stops }) => [id, stops.length]));
  assert.deepEqual(counts, {
    'site/index.html': 37,
    'stories/apps/ShellLayouts.stories.js:TopbarWide': 12,
    'stories/apps/ShellLayouts.stories.js:TopbarCentered': 12,
    'stories/apps/ShellLayouts.stories.js:RailWide': 10,
    'stories/apps/ShellLayouts.stories.js:RailCentered': 10,
    'stories/components/Footer.stories.js:Full': 22,
    'stories/components/Footer.stories.js:Slim': 7,
    'stories/components/Footer.stories.js:App': 3,
    'stories/components/Footer.stories.js:MobileStacked': 21,
  }, 'the walk covers different ground than it did; count the new surface by hand');
  const exempted = walked.flatMap(({ stops }) => stops.filter(exempt));
  assert.equal(exempted.length, 2, 'the two topbar-layout shell screens each hold one palette input');
});

// Prove the gate rejects, rule by rule, rather than agreeing with the tree.
// Every ring rule the walk actually leans on is taken back out of its own
// stylesheet, and the walk has to notice. A rule nobody leans on is not a
// mutation this gate can prove, and is reported as such.
test('focus walk: removing any ring rule the walk leans on turns it red', () => {
  const leaned = new Map();
  for (const { rules, stops } of walked) {
    for (const stop of stops) {
      if (stop.status !== 'ring') continue;
      const rule = rules.find((r) => r.paints.ring && stop.detail.endsWith(r.selector)
        && stop.detail.startsWith(r.origin));
      if (rule) leaned.set(`${rule.origin}|${rule.raw}`, rule);
    }
  }
  assert.ok(leaned.size >= 12, `only ${leaned.size} ring rules are load-bearing on these surfaces`);
  const silent = [];
  for (const rule of leaned.values()) {
    const survived = walked.every((subject) => {
      const mutated = subject.sheets.flatMap(({ file, css }) => (file === rule.origin
        ? focusRules(sheetText(css).split(rule.raw).join(''), file)
        : focusRules(css, file)));
      const { stops } = judgeStops(subject.body, mutated);
      return failures(stops, exempt).length === 0;
    });
    if (survived) silent.push(`${rule.origin} ${rule.selector}`);
  }
  assert.deepEqual(silent, [], 'a ring rule this walk relies on can be deleted without failing it');
});

test('focus walk: a native fallback and a flat outline are both rejected', () => {
  const dom = new JSDOM('<!doctype html><html><body><button class="t">Go</button></body></html>',
    { virtualConsole: quiet });
  const body = dom.window.document.body;
  const judge = (css) => judgeStops(body, focusRules(css, 'fixture')).stops[0];
  assert.equal(judge('.t{color:red}').status, 'native', 'a stop no focus rule reaches is native');
  assert.equal(judge('.t:focus-visible{outline:2px solid var(--accent)}').status, 'outline',
    'a flat accent outline is not the ring');
  assert.equal(judge('.t:focus-visible{outline:2px solid transparent;box-shadow:0 0 0 2px blue}').status,
    'shadow', 'a box-shadow that is not the ring is not the ring');
  assert.equal(judge('.t:focus-visible{outline:2px solid transparent;box-shadow:var(--ring)}').status,
    'ring', 'the shared ring passes');
  assert.equal(judge('.t:focus-visible{outline:2px solid var(--accent);box-shadow:var(--ring)}').status,
    'outline', 'a visible outline beside the ring is two indicators, not one');
  dom.window.close();
});

// The cascade, resolved over the sheets in the order the page loads them. The
// test above reads presence; this one reads the winner. #487's review found the
// gap between the two: `.accents button:focus-visible` from the shared chrome
// and `.play-accents button.on` from the landing page both come to (0,2,1), the
// chrome is injected above the page's own rules, so the selected playground
// swatch kept its flat accent band and painted nothing new when focused.
test('focus walk: a ring that is written is also the one that paints', () => {
  const broken = walked.flatMap(({ id, paint }) => paint.unmatchable.map((u) => `${id}: ${u}`));
  assert.deepEqual(broken, [], 'a painting rule this resolver cannot match is a rule it never ranked');
  const lost = walked.flatMap(({ id, paint }) => cascadeFailures(paint, exempt)
    .map((f) => `${id} → ${f}`));
  assert.deepEqual(lost, [], `${lost.length} stops ask for the ring and lose it to the cascade:\n  ${lost.join('\n  ')}`);
});

// Anti-vacuity, and the resolver's own coverage: every stop these surfaces hold
// is accounted for. Either the cascade was resolved on the stop itself, or its
// ring is painted on another box and named below, or it is exempt. A stop in
// none of those three buckets is a stop this resolver silently skipped.
test('focus walk: the cascade resolver accounts for every stop it walks', () => {
  const buckets = { self: 0, delegated: [], exempt: 0 };
  for (const { paint } of walked) {
    for (const stop of paint.stops) {
      if (stop.rings.length) { buckets.self += 1; assert.ok(stop.shadow, `${stop.label} asks for the ring with no winning box-shadow`); continue; }
      if (stop.delegated.length) { buckets.delegated.push(...stop.delegated); continue; }
      assert.ok(exempt(stop), `${stop.label} is neither ring-resolved, delegated nor exempt`);
      buckets.exempt += 1;
    }
  }
  assert.equal(buckets.self, 130, 'the number of stops whose own cascade was resolved moved');
  assert.deepEqual([...new Set(buckets.delegated)], [
    '.ui-switch input:focus-visible + .ui-switch__track',
  ], 'a ring painted on another box is not cascade-resolved — add it here with its reason');
  assert.equal(buckets.delegated.length, 2, 'the landing page holds the two switch inputs');
  assert.equal(buckets.exempt, 2, 'the two topbar-layout shell screens each hold one palette input');
});

// Specificity is where a cascade reading lives or dies, so it is asserted
// directly rather than only through the pages above.
test('focus walk: specificity is counted the way the cascade counts it', () => {
  assert.deepEqual(specificity('.accents button:focus-visible'), [0, 2, 1]);
  assert.deepEqual(specificity('.play-accents button.on'), [0, 2, 1]);
  assert.deepEqual(specificity('#a .b:not(.c, #d) e::before'), [2, 1, 2]);
  assert.deepEqual(specificity(':where(.x) .y'), [0, 1, 0]);
  assert.deepEqual(specificity('a[href]:hover'), [0, 2, 1]);
  assert.deepEqual(specificity('*'), [0, 0, 0]);
});

// The mutation that proves it: take the landing page's own focus rule for the
// playground swatches back out, leaving the shared chrome's rule to tie with
// `.on` and lose. The presence reading above stays green — that is the whole
// point — and the cascade reading has to go red, naming the selected swatch.
test('focus walk: losing a ring to source order turns the cascade test red', () => {
  const subject = subjects.find(({ id }) => id === 'site/index.html');
  const rule = '.play-accents button:focus-visible { outline: 2px solid transparent; box-shadow: var(--ring); }';
  const page = subject.sheets.at(-1);
  assert.equal(sheetText(page.css).split(rule).length, 2,
    'the landing page no longer carries exactly one playground-swatch focus rule');
  const mutated = subject.sheets.map((sheet) => (sheet === page
    ? { ...sheet, css: sheetText(sheet.css).split(rule).join('') }
    : sheet));

  const stillPresent = failures(
    judgeStops(subject.body, mutated.flatMap(({ file, css }) => focusRules(css, file))).stops,
    exempt,
  );
  assert.deepEqual(stillPresent, [],
    'the presence reading is supposed to miss this — if it now catches it, re-state both tests');

  const lost = cascadeFailures(focusPaint(subject.body, mutated), exempt);
  assert.equal(lost.length, 1, `expected the one selected swatch, got:\n  ${lost.join('\n  ')}`);
  assert.match(lost[0], /play-accents button\.on/,
    'the finding has to name the always-on rule that wins');
});

// The stop kinds a fixed focusable list misses. Chrome makes a scroll container
// a keyboard stop with no tabindex and no author rule, so an overflowing box
// draws the browser's own outline — black in light mode, which #457 refused.
// #487's review measured one: `.ui-dropdown__panel.is-scroll`, outside this
// walk entirely. The boxes are discovered from the sheets, so a new overflowing
// one has to be triaged here rather than appearing unseen.
//
// NOT A DECISION THIS GATE MAKES. Whether the eight below should paint the ring
// is Artur's call on #482; several sit inside a region that already takes focus,
// and the ring on a scrolling table wrapper or the application rail is a visible
// change on surfaces #482 never named. They are recorded as a measured gap, not
// excused: the list is asserted exactly, so one of them gaining a ring, or a
// ninth box appearing, fails here.
const SCROLL_GAP = [
  '.ui-card:has(> .ui-table)',
  '.ui-seg--underline',
  '.ui-dropdown__list',
  '.ui-drawer__body',
  '.ui-confirm__body',
  '.ui-cmdk__list',
  '.ui-snippet pre',
  '.ui-app__rail',
];

test('focus walk: every box the kit makes scrollable is triaged', () => {
  const scrolling = scrollingSelectors(KIT);
  assert.ok(scrolling.length >= 8,
    `only ${scrolling.length} scrolling boxes discovered — the reader is not finding overflow`);
  const ringed = [];
  const bare = [];
  for (const selector of scrolling) {
    const reached = kitRules.some((rule) => rule.paints.ring
      && (selector === rule.subject || selector.startsWith(`${rule.subject}.`)
        || selector.startsWith(`${rule.subject} `)));
    (reached ? ringed : bare).push(selector);
  }
  assert.deepEqual(ringed, ['.ui-dropdown__panel.is-scroll', '.ui-table-scroll'],
    'a scrolling box gained or lost the ring — move it between the lists and say why');
  assert.deepEqual(bare, SCROLL_GAP,
    'the set of scrolling boxes without the ring moved; triage each change on #482');
});

// Prove the triage rejects: take the ring off the panel this PR gave one to, and
// the scrolling box has to fall into the bare list.
test('focus walk: a scrolling box losing its ring is caught', () => {
  const panel = KIT.find(({ file }) => file === 'src/styles/dropdown.css');
  assert.ok(panel, 'src/styles/dropdown.css is not in the kit sheet list any more');
  const rule = kitRules.find((r) => r.selector === '.ui-dropdown__panel:focus-visible');
  assert.ok(rule, 'the dropdown panel has no focus rule to take out');
  const mutated = KIT.map((sheet) => (sheet === panel
    ? { ...sheet, css: sheetText(sheet.css).split(rule.raw).join('') }
    : sheet));
  const rules = mutated.flatMap(({ file, css }) => focusRules(css, file));
  const stillRinged = scrollingSelectors(mutated).filter((selector) => rules.some((r) => r.paints.ring
    && (selector === r.subject || selector.startsWith(`${r.subject}.`)
      || selector.startsWith(`${r.subject} `))));
  assert.deepEqual(stillRinged, ['.ui-table-scroll'],
    'the panel kept a ring after its only focus rule was deleted');
});

// #482's third criterion. A swatch carries no text and no glyph, so its name is
// whatever the markup gives it, and `aria-pressed` is the only way a reader who
// cannot see the colours learns which accent is on.
test('focus walk: every accent swatch is named and says whether it is on', () => {
  const swatches = walked.flatMap(({ id, body }) => [
    ...body.querySelectorAll('.ui-accent-picker button, .accents button'),
  ].map((el) => ({ id, el })));
  assert.ok(swatches.length >= 12, `only ${swatches.length} accent swatches found on these surfaces`);
  const problems = swatches.flatMap(({ id, el }) => {
    const name = accessibleName(el);
    const pressed = el.getAttribute('aria-pressed');
    return [
      name ? null : `${id}: a swatch has no accessible name`,
      pressed === 'true' || pressed === 'false' ? null : `${id}: swatch "${name}" has no aria-pressed`,
    ].filter(Boolean);
  });
  assert.deepEqual(problems, [], problems.join('\n  '));
});
