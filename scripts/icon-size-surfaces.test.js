/* Rule: an icon-sizing rule is measured wherever the kit renders one — not only
 * in the stylesheets the package ships.
 *
 * why: docs/adr/0004-the-gates-discover-their-subjects.md
 * why: docs/adr/0003-an-icons-size-is-measured-not-reasoned-about.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  BLIND_REFUSAL,
  CLAMPED_BLIND_REFUSAL,
  CLAMP_REFUSAL,
  DIMS,
  DROPPED_REFUSAL,
  IMPORT_REFUSAL,
  blindSpots,
  clampsOn,
  droppedDecls,
  foldLogicalDims,
  importsIn,
  isSvgSubject,
  kitSheetNames,
  kitStyleHtml,
  mount,
  resolve,
  rulesOf,
  selectorParts,
  styleBlocksOf,
  svgClassSet,
  walk,
  without,
  writtenAs,
} from './lib/icon-cascade.js';
import { topbar, footer, CHROME_CSS, CHROME_JS } from '../site/chrome.mjs';
import { changelogMain, release } from '../site/changelog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const siteDir = path.join(root, 'site');
const storiesDir = path.join(root, 'stories');
const sbDir = path.join(root, '.storybook');
const rel = (p) => path.relative(root, p);

// Same tripwire as EXPECTED_SUBJECTS in src/styles/icon-size.test.js, and the
// same deliberate inconvenience: a rule that quietly leaves coverage looks
// exactly like a rule that passes, so the number is the real count with no slack
// in it. Six rules across four files, width and height apiece. Raise it when
// you add one; lower it in the same commit as the removal, and say why there.
// Was seven across five: stories/apps/_appShell.js was a story-local fork of the
// page shell, and #127 replaced it with the kit's own appShell(), whose icons are
// sized in src/styles — the other gate's territory, not this one's.
// Was 12: #217 held every stroked glyph the stories render to ADR 0010's 1.5 CSS
// px line, and two glyphs in the Consent demo were sized by nothing but the
// reset's 1.1em — so their box followed the font-size they landed in and their
// stroke rendered at 1.40 and 0.97. Saying the box is what lets the stroke
// beside it be said, so `.cn-arrow svg` and `.cn-note svg` arrived, width and
// height apiece.
const EXPECTED_SUBJECTS = 16;

/* Every file Storybook can render, plus everything under stories/ they reach.
 * The roots are the glob .storybook/main.js declares; the closure is what makes
 * a shared module like _finance-nav.js a surface without being named as one. */
function storyFiles() {
  const roots = walk(storiesDir).filter((p) => /\.stories\.(js|mjs)$/.test(p));
  assert.ok(roots.length > 0, 'found no *.stories.js under stories/ — the sweep is broken, not the kit.');
  const seen = new Set();
  const queue = [...roots];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, 'utf8').matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(file), m[1]);
      // src/ is the other gate's territory, and it has no <style> blocks anyway.
      if (target.startsWith(storiesDir)) queue.push(target);
    }
  }
  return [...seen].sort();
}

/* The site pages as site/build.mjs writes them. Every placeholder it fills is
 * filled here, from the same modules; anything left over throws rather than
 * being handed to a CSS parser that would drop rules around it. */
function sitePages() {
  const names = readdirSync(siteDir).filter((n) => n.endsWith('.html')).sort();
  assert.ok(names.length > 0, 'found no *.html in site/ — the sweep is broken, not the kit.');
  return names.map((name) => {
    const html = readFileSync(path.join(siteDir, name), 'utf8')
      .replace('{{TOPBAR}}', () => topbar(''))
      .replace('{{FOOTER}}', () => footer())
      .replace('{{CHROME_CSS}}', () => CHROME_CSS)
      .replace('{{CHROME_JS}}', () => CHROME_JS)
      .replace('{{MAIN}}', () => changelogMain({}))
      .replaceAll('{{VERSION}}', 'v0.0.0')
      .replaceAll('{{CSSHASH}}', '0000000000');
    const left = [...html.matchAll(/\{\{[A-Z0-9_]+\}\}/g)].map((m) => m[0]);
    assert.deepEqual(left, [],
      `site/${name} still carries ${left.join(', ')} after composition. site/build.mjs fills a `
      + 'placeholder this gate does not — teach it, or the CSS around it goes unmeasured.');
    return { from: `site/${name}`, html };
  });
}

/* The Storybook chrome's own CSS. `.storybook/preview.js` imports
 * `../src/index.css`, so the kit loads into every story iframe and a rule
 * written beside it competes with the reset in every story anybody browses.
 *
 * Discovered rather than listed, at any depth: every .css file, and the <style>
 * blocks of every .html file, which is how Storybook takes hand-written CSS —
 * manager-head.html today, a preview-head.html the day somebody adds one. A .js
 * or .jsx file there is not read for <style> blocks; theme-toggle.jsx writes
 * none, and the day one does it is outside this sweep. */
function storybookChrome() {
  const out = [];
  for (const file of walk(sbDir).sort()) {
    const from = rel(file);
    const text = readFileSync(file, 'utf8');
    if (file.endsWith('.css')) out.push({ from, css: text });
    else if (file.endsWith('.html')) {
      for (const el of new JSDOM(text).window.document.querySelectorAll('style')) {
        out.push({ from, css: el.textContent });
      }
    }
  }
  return out;
}

/* One entry per FILE the kit renders, carrying that file's <style> blocks in
 * document order.
 *
 * Grouped by file, not one entry per block, and that is a correctness point
 * rather than bookkeeping. Two <style> blocks on one page are one cascade and
 * have to compete, exactly as they do in a browser. Giving each block its own
 * document put every rule somewhere nothing could out-rank it: a page declaring
 * `.bIcon svg { width: 24px }` in one block and `.bIcon svg { width: 8px }` in a
 * later one renders at 8px, and split into two documents both rules reported they
 * decided the icon's width. Grouped, the 24px rule fails by name and says what
 * beat it. Split, the only red available was the count — whose own message tells
 * you to raise EXPECTED_SUBJECTS and go green. That is the defect this gate
 * exists to end, reintroduced inside the gate.
 *
 * Grouping does not reach a rule that wins on SPECIFICITY rather than on order.
 * `.bento .bIcon svg { width: 8px }` beats `.bIcon svg { width: 24px }` on the
 * page, and both pass here either way, because a subject is mounted with only the
 * ancestors its own selector names — so the `.bIcon svg` subject has no `.bento`
 * above it to lose to and wins a contest the page does not hold. That is the
 * first entry under WHAT THIS WILL NOT CATCH in the header of this file, met from
 * the other side.
 *
 * The original reason for splitting survives grouping: two UNRELATED surfaces
 * that happen to share a class name are still separate files, so they still get
 * separate documents and still cannot decide each other's contests. */
function chunks() {
  const byFile = new Map();
  const add = (from, css) => {
    const blocks = byFile.get(from) ?? [];
    blocks.push(css);
    byFile.set(from, blocks);
  };
  for (const file of storyFiles()) {
    for (const css of styleBlocksOf(readFileSync(file, 'utf8'))) add(rel(file), css);
  }
  for (const { from, html } of sitePages()) {
    // Parsed rather than regexed: the pages are real documents, and <style> in
    // one is worth finding wherever the markup puts it.
    const page = new JSDOM(html);
    for (const el of page.window.document.querySelectorAll('style')) add(from, el.textContent);
  }
  for (const { from, css } of storybookChrome()) add(from, css);
  return [...byFile].map(([from, blocks]) => ({ from, blocks }));
}

const CHUNKS = chunks();
const BLOCKS = CHUNKS.reduce((n, c) => n + c.blocks.length, 0);

// The classes the kit puts on an <svg>, derived from the source the way the
// other gate derives them — over the surfaces too, because
// `.term__copy .ic { width: 15px }` in site/index.html is a rule on a class
// written onto the svg tag itself, and a leaf-is-`svg` test alone would take it
// out of coverage in silence. Over .storybook/ for the same reason: its chrome
// is free to put a class on an svg of its own, and a rule sizing that class
// would otherwise read as a rule about nothing.
const SVG_CLASSES = svgClassSet([src, siteDir, storiesDir, sbDir], ['.js', '.jsx', '.mjs', '.html']);

const SHEETS = kitSheetNames(src);
const KIT = kitStyleHtml(src, SHEETS);

/* One document per file: the kit's stylesheets in import order, then that
 * file's own <style> blocks in document order — the order a browser sees, since
 * every page links kit.css in <head> before its own <style>. */
const docs = CHUNKS.map(({ from, blocks }) => {
  const own = blocks
    .map((css, j) => `<style data-surface="${from}" data-block="${j}">${css}</style>`)
    .join('\n');
  const dom = new JSDOM(`<!doctype html><html><head>${KIT}${own}</head><body></body></html>`);
  assert.equal(dom.window.document.styleSheets.length, SHEETS.length + blocks.length,
    `jsdom dropped a stylesheet composing ${from} — every rule in it would silently leave coverage.`);
  /* The kit's sheets are folded here as well as in src/styles/icon-size.test.js,
   * because this document holds its own copy of them: a reset written with a
   * logical property and left unfolded would sit out the cascade entirely, and
   * every surface rule would then win a contest nobody was holding. */
  [...dom.window.document.styleSheets].forEach((sheet, k) => {
    foldLogicalDims(sheet, k < SHEETS.length ? SHEETS[k] : from);
  });
  return dom;
});

/** That file's own sheets, in document order, after the kit's. */
const ownSheets = (i) => CHUNKS[i].blocks
  .map((_css, j) => docs[i].window.document.styleSheets[SHEETS.length + j]);

const subjects = [];
CHUNKS.forEach(({ from }, i) => {
  for (const sheet of ownSheets(i)) {
    for (const [rule] of rulesOf(sheet, from, SVG_CLASSES)) {
      for (const raw of selectorParts(rule.selectorText)) {
        const sel = raw.replace(/\s+/g, ' ');
        if (!isSvgSubject(sel, SVG_CLASSES)) continue;
        for (const dim of DIMS) {
          const want = rule.style.getPropertyValue(dim).trim();
          if (want) subjects.push({ sel, dim, want, from, i, rule, as: writtenAs(rule, dim) });
        }
      }
    }
  }
});

test('the sweep still recognises a class the kit puts directly on an svg', () => {
  // If this derivation ever returns nothing, every class-on-svg rule silently
  // leaves coverage — which is how .ui-fbck was missed in src the first time.
  assert.ok(SVG_CLASSES.has('ic'),
    'the scanner no longer finds `ic`, the class site/index.html writes onto its copy-button svgs; '
    + `it found: ${[...SVG_CLASSES].join(', ') || '(nothing)'}`);
});

test('the Storybook chrome is one of the swept surfaces', () => {
  /* .storybook/ carries no icon size today, so the count above reads 14 whether
   * this sweep opened it or read nothing at all. This is what tells the two
   * apart. */
  const swept = CHUNKS.filter((c) => c.from.startsWith('.storybook/'));
  assert.ok(swept.length > 0,
    'the sweep found no CSS under .storybook/, and every assertion in this file would pass on that '
    + 'empty sweep — the subject count included, because .storybook/ contributes none. Storybook '
    + `loads the kit into every story iframe, so a rule there competes with the reset. It read: ${
      CHUNKS.map((c) => c.from).join(', ')}`);
});

test('nothing that sizes an icon is hidden behind an interpolation this gate cannot read', () => {
  /* Every rule that sets width or height, not only the ones that survived
   * isSvgSubject — because an interpolation in the SELECTOR is exactly what
   * would stop a rule looking like an icon rule. `.a${X} svg` reads as
   * `.aui-unresolved-interpolation svg` and is still caught by shape, but a bare
   * `${X} { width: … }` reads as an element selector and would not be. */
  const blind = [];
  const clampedBlind = [];
  CHUNKS.forEach(({ from, blocks }, i) => {
    ownSheets(i).forEach((sheet, j) => {
      const found = blindSpots(from, blocks[j], sheet);
      blind.push(...found.blind);
      clampedBlind.push(...found.clampedBlind);
    });
  });
  assert.deepEqual(blind, [], BLIND_REFUSAL);
  assert.deepEqual(clampedBlind, [], CLAMPED_BLIND_REFUSAL);
});

test('no icon on a surface is sized by a value this gate cannot read', () => {
  /* The count above moves when a subject appears or disappears, and a rule jsdom
   * refused to parse is neither: `width: fit-content(20%)` in a page's <style>
   * block reaches the CSSOM as a rule that sizes nothing, so the page ships it,
   * the browser applies it and the number stays put. Asked of the raw text, which
   * is the one place the declaration still exists, and of the rules that decide
   * an icon — a page sizing a layout with a bare `env()` is writing CSS this gate
   * has no business refusing. A value hidden behind an interpolation is left to
   * the test above, which can say what is wrong with it. */
  const dropped = CHUNKS.flatMap(({ from, blocks }) => blocks
    .flatMap((css) => droppedDecls(from, css, SVG_CLASSES)));
  assert.deepEqual(dropped, [], DROPPED_REFUSAL);
});

test('no surface imports a stylesheet this gate never opens', () => {
  const unfollowed = CHUNKS.flatMap(({ from, blocks }) => blocks
    .flatMap((css) => importsIn(css).map((spec) => `${from}: @import ${spec}`)));
  assert.deepEqual(unfollowed, [], IMPORT_REFUSAL);
});

test('every icon sizing rule the kit renders outside src/styles is gated', () => {
  assert.equal(subjects.length, EXPECTED_SUBJECTS,
    `collected ${subjects.length} icon sizing declarations across ${BLOCKS} <style> blocks in `
    + `${CHUNKS.length} files, `
    + `expected ${EXPECTED_SUBJECTS}:\n`
    + subjects.map((s) => `  ${s.from}: ${s.sel} { ${s.as}: ${s.want} }`).join('\n')
    + '\nIf you added a rule, raise EXPECTED_SUBJECTS. If you removed one, lower it and say why in '
    + 'the commit — a rule that leaves coverage is otherwise indistinguishable from a pass.');
});

test('no surface the kit renders sizes an icon with a clamp', () => {
  // Only each surface's own sheets. The kit's are the same sheets
  // src/styles/icon-size.test.js sweeps, and every surface holds a copy of
  // them, so including them here would report one kit clamp once per file.
  const clamped = CHUNKS.flatMap(({ from }, i) => ownSheets(i)
    .flatMap((sheet) => clampsOn(sheet, from, SVG_CLASSES)));
  assert.deepEqual(clamped, [], CLAMP_REFUSAL);
});

for (const { sel, dim, want, from, i, rule, as } of subjects) {
  test(`${from}: ${sel} { ${as}: ${want} } decides the icon's ${dim}`, () => {
    const { document, getComputedStyle } = docs[i].window;
    const { el, top } = mount(document, sel, SVG_CLASSES);
    try {
      assert.ok(el.matches(sel),
        `mounted an element that does not match "${sel}" — the measurement would be of the wrong thing`);
      /* Forced so the two candidates cannot agree by arithmetic — the reason is
       * the badge's, spelled out at the bottom of this file, and it is a class
       * of hole rather than one instance. It changes no selector, so it changes
       * nothing about which rules match; `resolve` clones this element, inline
       * style included, so the expectation is computed on the same basis. */
      el.style.fontSize = '100px';
      const got = getComputedStyle(el).getPropertyValue(dim);
      const expected = resolve(getComputedStyle, el, dim, want);
      assert.equal(got, expected,
        `${from} asks for ${as}: ${want} (resolves to ${expected}) and the cascade gives ${got}. `
        + 'Something upstream out-specifies it — see the header of src/styles/icon-size.test.js.');
      // And prove that comparison could have failed — see without().
      const gone = without(getComputedStyle, el, rule, dim);
      assert.notEqual(gone, expected,
        `taking "${as}: ${want}" out of ${from} changes nothing — the element still computes `
        + `${gone}. So the assertion above passes whether this rule wins or loses, and gates `
        + 'nothing. Either the rule is redundant and should go, or this subject needs a basis '
        + 'that pulls it apart from whatever else is setting the same value.');
    } finally {
      top.remove();
    }
  });
}

/* The breaking badge renders only when a release carries a breaking change, so
 * measuring it against whatever RELEASES happens to hold today would be a gate
 * that lapses the moment the data changes. site/changelog.test.js asserts both
 * states from a fixture — that a breaking release renders the badge and that a
 * release with nothing breaking omits it; this asserts the icon's size in the
 * state where it renders, on the real markup site/changelog.mjs emits rather
 * than a mounted approximation of it. */
test('the breaking badge icon is sized by the changelog page, in the state where it renders', () => {
  const i = CHUNKS.findIndex((c) => c.from === 'site/changelog.html');
  assert.notEqual(i, -1, 'site/changelog.html is no longer among the swept surfaces');
  const { document, getComputedStyle } = docs[i].window;

  const host = document.createElement('div');
  host.innerHTML = release({
    v: '9.9.9', date: '2026-01-01', changes: [['breaking', 'Renamed a prop.', ['Table']]],
  });
  document.body.appendChild(host);
  try {
    const badge = host.querySelector('.ui-badge--breaking');
    assert.ok(badge, 'a breaking release no longer renders .ui-badge--breaking');
    const svg = badge.querySelector('svg');
    assert.ok(svg, 'a breaking release no longer renders an icon inside .ui-badge--breaking');
    assert.equal(svg.getAttribute('width'), null,
      'the badge icon now carries a width attribute, so the reset skips it and this rule is moot');

    /* The badge is measured with its font-size forced, and that is not a detail.
     * src/styles/badge.css sets .ui-badge { font-size: 10px }, so the reset's
     * 1.1em computes to exactly 11px on this element — the same number the
     * changelog asks for. Read as it renders, a reset that had taken the rule
     * over would produce an identical measurement and this test would pass
     * through the regression it exists to catch. Forcing the em basis does not
     * touch which rules match; it only pulls the two candidates apart, so a
     * reset that won reads 110px. */
    badge.style.fontSize = '100px';
    for (const dim of DIMS) {
      assert.equal(getComputedStyle(svg).getPropertyValue(dim), '11px',
        `the changelog asks for ${dim}: 11px on the badge icon and the cascade gives `
        + `${getComputedStyle(svg).getPropertyValue(dim)} — something upstream out-specifies it.`);
    }
  } finally {
    host.remove();
  }
});
