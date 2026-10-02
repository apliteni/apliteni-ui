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
//  - A scroll container is never one of THIS walk's stops. `keyboardStops`
//    matches a fixed list of focusable kinds, and an overflowing `div` is in
//    none of them, although Chrome makes it a keyboard stop. Scroll containers
//    are covered separately, by the `scrollingSelectors` triage below, which
//    discovers them from the sheets and holds which carry the ring and which are
//    not a stop at all. #531 emptied the untriaged middle: eight carry the ring
//    and two hold their own tabbable rows, which is what spares them.
//  - A roving row the kit focuses with a key rather than Tab is judged only if
//    its role is in ROVING_ROLES. That list is what the kit uses today; a row
//    given some other role would drop out of the walk unseen. #487's re-review
//    found `.vopt` that way — `role="option"` was missing, so the version
//    switcher's rows shipped with the browser's outline and nothing saw it.
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
  focusPaint, cascadeFailures, specificity, scrollingSelectors, tabbableIn,
  ringRulesFor,
} from './lib/focus-walk.js';
import { topbar, footer, CHROME_CSS } from '../site/chrome.mjs';
import { catalogueCopy } from '../site/catalogue.mjs';
import { iconNames } from '../src/assets/icons.js';
// #531's no-stop half is a fact about the markup these two emit, not about a sheet.
import { segmented } from '../src/components/index.js';
import { appShell } from '../src/components/shell.js';

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
  {
    selector: '.ui-cmdk__item',
    why: 'the palette never focuses a row. Focus stays in the input — '
      + 'src/components/command-palette.js:349 `input.focus()` is the only call that moves '
      + 'it — and the row the reader is on is announced instead, by '
      + 'src/components/command-palette.js:263 `aria-activedescendant`, which that file '
      + 'calls the combobox pattern\'s own answer. A ring needs a stop, and there is none. '
      + 'The rows are walked at all only because #487 added `option` to ROVING_ROLES so '
      + 'that .vopt, which IS focused, could be seen.',
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
const SUBJECT_FILES = [
  'apps/ShellLayouts.stories.js',
  'components/Footer.stories.js',
  // Added by #487's re-review. The version switcher's rows are `role="option"`
  // with `tabindex="-1"`, focused by the arrow keys in src/components/dropdown.js,
  // and no walked surface rendered one — so `.vopt` shipped with the browser's
  // own outline and nothing could see it.
  'apps/AccountPreset.stories.js',
];
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
    // 12 before #487's re-review added `option` to ROVING_ROLES; the three the
    // palette holds are rows it never focuses, exempted by name below.
    'stories/apps/ShellLayouts.stories.js:TopbarWide': 15,
    'stories/apps/ShellLayouts.stories.js:TopbarCentered': 15,
    'stories/apps/ShellLayouts.stories.js:RailWide': 10,
    'stories/apps/ShellLayouts.stories.js:RailCentered': 10,
    'stories/components/Footer.stories.js:Full': 22,
    'stories/components/Footer.stories.js:Slim': 7,
    'stories/components/Footer.stories.js:App': 3,
    'stories/components/Footer.stories.js:MobileStacked': 21,
    // The surface #487's re-review added, for the version switcher's rows.
    'stories/apps/AccountPreset.stories.js:Default': 13,
    'stories/apps/AccountPreset.stories.js:WithVersionSwitcher': 18,
  }, 'the walk covers different ground than it did; count the new surface by hand');
  const exempted = walked.flatMap(({ stops }) => stops.filter(exempt));
  assert.equal(exempted.length, 8, 'the two topbar-layout shell screens hold one palette input '
    + 'and three palette rows each');
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
  assert.equal(buckets.self, 157, 'the number of stops whose own cascade was resolved moved');
  assert.deepEqual([...new Set(buckets.delegated)], [
    '.ui-switch input:focus-visible + .ui-switch__track',
  ], 'a ring painted on another box is not cascade-resolved — add it here with its reason');
  assert.equal(buckets.delegated.length, 6, 'two switch inputs on the landing page, and two '
    + 'more on each of the account presets');
  assert.equal(buckets.exempt, 8, 'the two topbar-layout shell screens hold one palette input '
    + 'and three palette rows each');
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
// #531 closed the gap #487 recorded. Chrome's rule has a second half: a scroller
// whose own children are keyboard-focusable gets NO stop of its own, because the
// keyboard already reaches into it. That splits the ten in two, and each half is
// held exactly below — a box moving between them, or an eleventh box appearing,
// fails here.
//
// WHAT THIS TRIAGE DOES NOT READ. Which half a box belongs in was decided in a
// browser, not here: this file reads the sheets, and a sheet does not say whether
// the markup a factory emits holds a focusable child. The two in SCROLL_NO_STOP
// are therefore checked against the markup as well, below. Nor does it read WHICH
// box a delegated ring is painted on — `ringRulesFor` finds the rule, the reason
// beside each entry names the box, and the captures on #531 show it.

/**
 * The scrolling boxes that carry the ring, each with the reason and the box the
 * ring is painted on. A ring is reached either by a rule of the box's own or by one
 * on an ancestor keyed on `:has(<it>:focus-visible)` — the delegation #474
 * introduced, for a scroller flush with its container or inside one that clips.
 */
const SCROLL_RINGED = {
  '.ui-card:has(> .ui-table)': 'on the card itself. A card around a table of plain cells '
    + 'is a stop — measured on the shell at 390 with the browser\'s outline — and a card '
    + 'with a link or a button in a cell is not a stop at all. A box\'s own box-shadow '
    + 'survives its own `overflow`, and the card has the radius the ring follows, so no '
    + 'delegation is needed. #531',
  '.ui-dropdown__panel.is-scroll': 'on the panel, by the rule written for every panel: '
    + 'a panel that takes focus any other way has the same claim on the ring. #487',
  '.ui-dropdown__list': 'on the PANEL. The rows are role="option" tabindex="-1", so the '
    + 'list takes the stop — measured at 390 and 1280 with the browser\'s outline. The '
    + 'list sits 6px inside a 16px corner, where a ring on the list leaves the panel\'s '
    + 'rounded corner. #531',
  '.ui-drawer__body': 'on the PANEL. A text-only body scrolls and Tab reaches it between '
    + 'the close button and the footer\'s actions. The body is flush with the panel\'s '
    + 'sides and has no radius, so a ring on it paints onto the scrim and draws two lines '
    + 'across the panel. #531',
  '.ui-confirm__body': 'on the paragraph itself: the panel insets it by --space-5 on every '
    + 'side, so a square ring on a square scroller clips nothing and reaches no corner — '
    + 'what .ui-table-scroll already draws. #531',
  '.ui-cmdk__list': 'on the PANEL, which clips with `overflow: hidden`. The wired '
    + 'palette\'s Tab trap holds one item and never hands the list focus; the markup the '
    + 'kit publishes as a string has no trap and does. #531',
  '.ui-table-scroll': 'on the wrapper itself, which is square and clipped by nothing. '
    + 'The kit\'s first ringed scroller.',
  '.ui-snippet pre': 'on the CARD. A shell command overflows the `pre`, which is flush '
    + 'with its card on three sides and has no radius of its own, so a ring drawn on it '
    + 'overhung the rounded corners and cut a line across the card. #474',
};

/**
 * The scrolling boxes that are NOT a keyboard stop, each with the reason and the
 * markup that proves it. Chrome gives a scroller no stop of its own while its own
 * children are keyboard-focusable, so there is no outline here to replace and
 * nothing to remove: these two hold their rows by construction, and each overflows
 * only once it holds more of them than fit.
 *
 * Measured in Chrome 153 at 1280 and 390, both themes: each had content wider than
 * its box and neither entered the tab order. Artur's call on #531 was to say why
 * rather than ring a box the keyboard never lands on.
 */
const SCROLL_NO_STOP = {
  '.ui-seg--underline': {
    why: 'a tab strip holds its tabs, which are <button>s. It scrolls only when it holds '
      + 'more tabs than fit across, so a strip that overflows is a strip full of them.',
    markup: () => segmented({
      options: [{ label: 'Overview' }, { label: 'Performance' }, { label: 'Costs' }],
      appearance: 'underline',
      ariaLabel: 'Dataset view',
    }),
  },
  '.ui-app__rail': {
    why: 'the rail holds the brand link, its nav rows and the reader\'s menu trigger. It '
      + 'scrolls down only when it holds more rows than the viewport\'s height, so a rail '
      + 'that overflows is a rail full of links.',
    markup: () => appShell({
      word: 'Finance',
      layout: 'rail',
      nav: [
        { id: 'overview', icon: 'chart', label: 'Overview' },
        { id: 'reports', icon: 'table', label: 'Reports' },
      ],
      active: 'reports',
      account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
      title: 'Payouts',
    }),
  },
};

test('focus walk: every box the kit makes scrollable is triaged', () => {
  const scrolling = scrollingSelectors(KIT);
  assert.ok(scrolling.length >= 10,
    `only ${scrolling.length} scrolling boxes discovered — the reader is not finding overflow`);
  const ringed = [];
  const bare = [];
  for (const selector of scrolling) {
    (ringRulesFor(selector, kitRules).length ? ringed : bare).push(selector);
  }
  assert.deepEqual(ringed, Object.keys(SCROLL_RINGED),
    'a scrolling box gained or lost the ring — move it between the lists and say why');
  assert.deepEqual(bare, Object.keys(SCROLL_NO_STOP),
    'the set of scrolling boxes with no ring moved; triage each change on #531');
  // An entry with no reason is an entry nobody triaged.
  for (const [selector, why] of Object.entries(SCROLL_RINGED)) {
    assert.ok(why.length >= 80, `${selector} needs the box its ring is painted on in prose`);
  }
});

/** The scrolling boxes a set of sheets rings, read the way the triage reads it. */
const ringedIn = (sheets) => {
  const rules = sheets.flatMap(({ file, css }) => focusRules(css, file));
  return scrollingSelectors(sheets).filter((selector) => ringRulesFor(selector, rules).length);
};

// Prove the triage rejects, box by box rather than once. Each ringed box has EVERY
// rule that answers its focus taken back out of its own sheet, and has to fall into
// the bare list on its own. Every rule, because `.ui-snippet pre` is answered by
// two and deleting one of them proves nothing. Mutating only one box would leave
// the others agreeing with the tree: before #474 this test deleted the dropdown's
// rule and asserted the remainder, which said nothing about whether a second ringed
// box could be caught at all.
test('focus walk: a scrolling box losing its ring is caught', () => {
  assert.deepEqual(ringedIn(KIT), Object.keys(SCROLL_RINGED),
    'the ringed list moved out from under this test');
  for (const selector of Object.keys(SCROLL_RINGED)) {
    const answering = ringRulesFor(selector, kitRules);
    assert.ok(answering.length, `${selector} has no ring rule to take out`);
    const mutated = KIT.map((one) => {
      const mine = answering.filter((rule) => rule.origin === one.file);
      if (!mine.length) return one;
      return { ...one, css: mine.reduce((css, rule) => css.split(rule.raw).join(''), sheetText(one.css)) };
    });
    assert.deepEqual(
      ringedIn(mutated),
      Object.keys(SCROLL_RINGED).filter((other) => other !== selector),
      `${selector} kept a ring after ${answering.map((r) => `${r.origin}'s ${r.selector}`).join(' and ')} was deleted`,
    );
  }
});

// The half of the triage the sheets cannot answer: a box is excused ONLY because
// its own children are keyboard-focusable, and that is a fact about the markup the
// kit's factories emit. So the markup is rendered and walked. A factory that stops
// emitting a focusable row fails here instead of shipping a scroller that quietly
// becomes a stop with the browser's outline on it.
test('focus walk: every box excused as no stop holds keyboard-focusable rows of its own', () => {
  for (const [selector, { why, markup }] of Object.entries(SCROLL_NO_STOP)) {
    const page = new JSDOM(`<!doctype html><html lang="en"><body>${markup()}</body></html>`,
      { virtualConsole: quiet });
    const box = page.window.document.querySelector(selector);
    assert.ok(box, `${selector} is excused ("${why}") but its own factory renders none`);
    // One is enough, and one is what a roving strip has: `segmented()` gives the
    // active tab tabindex="0" and the rest tabindex="-1", so Tab enters the strip
    // once and the arrow keys move inside it. Chrome's question is whether ANY
    // child is keyboard-focusable, not how many.
    const inside = tabbableIn(box);
    assert.ok(inside.length >= 1,
      `${selector} is excused because it holds its own stops, and holds none`);
    page.window.close();
  }
});

// Prove that check rejects: the same reading over a scroller with nothing focusable
// in it has to come back empty, which is what would move the box into the ringed
// half rather than leaving it excused.
test('focus walk: a scroller with no focusable row of its own is not excused', () => {
  const page = new JSDOM('<!doctype html><html lang="en"><body>'
    + '<div class="fx-scroll"><p>text</p><div role="option" tabindex="-1">a row</div></div>'
    + '</body></html>', { virtualConsole: quiet });
  const box = page.window.document.querySelector('.fx-scroll');
  assert.deepEqual(tabbableIn(box).map((el) => el.textContent), [],
    'a role="option" row at tabindex="-1" is not in the tab order, which is why its list is');
  page.window.close();
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
