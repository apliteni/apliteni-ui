/* Rule: an icon-sizing rule is measured wherever the kit renders one — not only
 * in the stylesheets the package ships.
 *
 * src/styles/icon-size.test.js gates the rules inside src/styles. It builds its
 * list from the @imports of src/index.css, so anything the kit renders through
 * another path is outside it by construction — and two such paths exist:
 *
 *   the landing site   site/build.mjs writes assets/kit.css from src/inline.js,
 *                      which carries src/styles/base.css verbatim, and both
 *                      site/index.html and site/changelog.html link it. Their own
 *                      <style> blocks then compete with that reset. A change to a
 *                      kit stylesheet lands on ui.apli.tech without passing a
 *                      check that knows the homepage exists — eight bento icons
 *                      went from ~16px to 24px that way, found by hand.
 *   the stories        Storybook loads src/index.css and every story's own
 *                      <style> block competes with the same reset.
 *
 * This gate reads those surfaces and asks src/styles/icon-size.test.js's
 * question of them: mount an element matching the rule's selector against the
 * kit's real stylesheets plus that surface's own CSS, and read getComputedStyle
 * back. The machinery is imported from scripts/lib/icon-cascade.js rather than
 * copied, so the two gates cannot drift into measuring different things.
 *
 * IT DISCOVERS, IT DOES NOT ENUMERATE. This is the property that matters most
 * here, because the defect being fixed was an undercount: a header that named
 * two files out of five read as a complete account of the gap, so the next
 * person trusted it and stopped looking. So there is no list of filenames below.
 * The surfaces are swept:
 *
 *   site/*.html                 every page site/build.mjs writes, composed here
 *                               the same way it composes them.
 *   every *.stories.js|mjs      under stories/ — the glob .storybook/main.js
 *                               loads — plus every file under stories/ they
 *                               import transitively, which is how the shared
 *                               shells (_appShell.js, _content.js) join coverage
 *                               without being named.
 *
 * A new page, a new story, a new shared shell: all in scope by existing. A file
 * that stops carrying an icon rule leaves the count, and the count is asserted.
 *
 * NO BUILT SITE. The pages are composed from source, not read out of
 * site/public/. CI runs `npm test` before `npm run build-storybook` and never
 * runs site/build.mjs, so site/public/ does not exist there — a gate that read it
 * would fail in CI, and one that skipped when it was absent would silently drop
 * coverage, which is the exact fault this file exists to fix. Composing from
 * source means importing what site/build.mjs imports (chrome.mjs, changelog.mjs)
 * and substituting the same placeholders; the raw HTML carries {{CHROME_CSS}} and
 * friends, and feeding that to a CSS parser drops rules on the floor. The same
 * argument applies to the walk that derives the svg class set, which is why
 * icon-cascade.js skips site/public and friends by name — see SKIP_DIRS.
 *
 * TWO SHAPES OF STORY CSS. `stories/apps/_appShell.js` writes its CSS literally
 * between <style> and </style>; `stories/foundations/Iconography.stories.js`
 * writes `<style>${STYLE}</style>` and declares STYLE above. An extractor that
 * handles only the first measures nothing for the second and says so in green.
 * Both are handled, and an interpolation that cannot be resolved is turned into
 * a marker that this file then refuses to ignore — see UNRESOLVED. Including
 * the case where the marker is the block's ENTIRE body, which parses to no
 * rules at all and so reads as a surface that simply has no CSS in it.
 *
 * WHAT THIS WILL NOT CATCH — same weak claims as the gate it extends, for the
 * same reasons; read that file's header for the argument:
 *
 *  - a reset scoped to an ancestor the subject's own selector does not name;
 *  - the VALUE (the expectation is read from the declaration under test, so this
 *    asserts "the declared value is what the cascade resolves", never "the icon
 *    is 24px");
 *  - layout, and markup that no page emits.
 *  - A value written as a custom property is compared as the literal string
 *    `var(--ic-size)`, because jsdom substitutes no custom properties at all.
 *    The contest is still decided correctly — a reset that won would compute to
 *    `1.1em` and not match — but nothing here proves what --ic-size holds.
 *  - an icon sized by a clamp. `min-width` / `max-width` / `min-height` /
 *    `max-height` and their logical spellings never enter `width`'s cascade, so
 *    the reset still wins `width` and the clamp applies to the used value
 *    afterwards — there is no contest here to measure, and no layout in jsdom to
 *    apply the clamp in. No surface clamps an icon today, and the test named
 *    `no surface the kit renders sizes an icon with a clamp` is what keeps that
 *    true rather than merely current.
 *
 * A rule written with `inline-size` or `block-size` IS measured, on the same
 * terms as its physical twin and named the way the file spells it. Both gates
 * fold the declaration onto its physical counterpart first, because jsdom would
 * otherwise let it win contests a browser makes it lose; the argument, and the
 * writing-mode precondition the fold rests on, are in the header of
 * src/styles/icon-size.test.js.
 *
 * DELIBERATELY OUT OF SCOPE, both decided rather than overlooked:
 *
 *  - the Grant story in stories/apps/Consent.stories.js sizes its icons by
 *    putting a font-size on the wrapper — 23px on the plug, 18px on the
 *    arrow, 12.5px on the lock — and letting the reset's 1.1em do the rest.
 *    There is no rule here that can stop applying, because the
 *    mechanism IS the reset — and the reset is already gated, by the test named
 *    `the reset still sizes a bare icon that no component rule claims` in
 *    src/styles/icon-size.test.js. Covered indirectly; nothing to add.
 *  - fitH / fitBox in stories/foundations/Brand.stories.js strip the
 *    width/height attributes off a brand SVG and substitute an INLINE style.
 *    An inline style cannot lose a specificity contest to a stylesheet rule, so
 *    there is no contest to measure.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  CLAMP_REFUSAL,
  DIMS,
  SIZING_PROPS,
  clampsOn,
  foldLogicalDims,
  isSvgSubject,
  kitSheetNames,
  kitStyleHtml,
  mount,
  resolve,
  rulesOf,
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
const rel = (p) => path.relative(root, p);

// Same tripwire as EXPECTED_SUBJECTS in src/styles/icon-size.test.js, and the
// same deliberate inconvenience: a rule that quietly leaves coverage looks
// exactly like a rule that passes, so the number is the real count with no slack
// in it. Seven rules across five files, width and height apiece. Raise it when
// you add one; lower it in the same commit as the removal, and say why there.
const EXPECTED_SUBJECTS = 14;

/* An interpolation this file could not resolve becomes this token. It is a valid
 * CSS identifier on purpose: substituting something invalid would make jsdom
 * drop the declaration, and a dropped icon rule is indistinguishable from a rule
 * that was never there. Kept as a marker so the assertion below can refuse it. */
const UNRESOLVED = 'ui-unresolved-interpolation';

/* A sizing declaration as the file writes it, anchored on `;` or `{` so that
 * `min-width` cannot read as `width`. Built from SIZING_PROPS rather than
 * spelled out, because this has to ask about `inline-size` too: jsdom drops a
 * declaration whose value it cannot parse, so `inline-size: ${X}px` never
 * reaches the CSSOM the loop above reads and the raw text is the only place it
 * still exists. */
const SIZING_DECL = new RegExp(`(?:^|[;{])\\s*(${SIZING_PROPS.join('|')})\\s*:\\s*([^;}]*)`, 'g');

/* Resolve `${NAME}` against a `const NAME = \`…\`` in the same file — the shape
 * Iconography.stories.js uses. Anything else (a call, an expression) becomes
 * UNRESOLVED, which is a failure only if it lands inside an icon-sizing rule. */
function resolveInterpolations(body, source, depth = 0) {
  return body.replace(/\$\{([^}]*)\}/g, (_whole, expr) => {
    const name = expr.trim();
    if (depth < 4 && /^[A-Za-z_$][\w$]*$/.test(name)) {
      const m = source.match(new RegExp(`\\bconst\\s+${name}\\s*=\\s*\`([^\`]*)\``));
      if (m) return resolveInterpolations(m[1], source, depth + 1);
    }
    return UNRESOLVED;
  });
}

/* Every file Storybook can render, plus everything under stories/ they reach.
 * The roots are the glob .storybook/main.js declares; the closure is what makes
 * a shared shell like _appShell.js a surface without being named as one. */
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

/* One entry per FILE the kit renders, carrying that file's <style> blocks in
 * document order.
 *
 * Grouped by file, not one entry per block, and that is a correctness point
 * rather than bookkeeping. Two <style> blocks on one page are one cascade and
 * have to compete, exactly as they do in a browser. Giving each block its own
 * document put every rule somewhere nothing could out-rank it: a second block
 * carrying `.bento .bIcon svg { width: 8px }` and the `.bIcon svg { width:
 * 24px }` it overrides would both report they decide the icon's width, and the
 * only red would be the count — whose own message tells you to raise
 * EXPECTED_SUBJECTS and go green. That is the defect this gate exists to end,
 * reintroduced inside the gate.
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
    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
      add(rel(file), resolveInterpolations(m[1], source));
    }
  }
  for (const { from, html } of sitePages()) {
    // Parsed rather than regexed: the pages are real documents, and <style> in
    // one is worth finding wherever the markup puts it.
    const page = new JSDOM(html);
    for (const el of page.window.document.querySelectorAll('style')) add(from, el.textContent);
  }
  return [...byFile].map(([from, blocks]) => ({ from, blocks }));
}

const CHUNKS = chunks();
const BLOCKS = CHUNKS.reduce((n, c) => n + c.blocks.length, 0);

// The classes the kit puts on an <svg>, derived from the source the way the
// other gate derives them — over the surfaces too, because
// `.term__copy .ic { width: 15px }` in site/index.html is a rule on a class
// written onto the svg tag itself, and a leaf-is-`svg` test alone would take it
// out of coverage in silence.
const SVG_CLASSES = svgClassSet([src, siteDir, storiesDir], ['.js', '.mjs', '.html']);

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
      for (const raw of rule.selectorText.split(',')) {
        const sel = raw.trim().replace(/\s+/g, ' ');
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

test('no sizing rule is hidden behind an interpolation this gate cannot read', () => {
  /* Every rule that sets width or height, not only the ones that survived
   * isSvgSubject — because an interpolation in the SELECTOR is exactly what
   * would stop a rule looking like an icon rule. `.a${X} svg` reads as
   * `.aui-unresolved-interpolation svg` and is still caught by shape, but a bare
   * `${X} { width: … }` reads as an element selector and would not be. */
  const blind = [];
  CHUNKS.forEach(({ from, blocks }, i) => {
    ownSheets(i).forEach((sheet, j) => {
      const css = blocks[j];
      for (const rule of sheet.cssRules) {
        if (!rule.selectorText) continue;
        const dims = DIMS.filter((d) => rule.style.getPropertyValue(d));
        if (!dims.length) continue;
        const values = dims.map((d) => rule.style.getPropertyValue(d));
        if (rule.selectorText.includes(UNRESOLVED) || values.some((v) => v.includes(UNRESOLVED))) {
          blind.push(`${from}: ${rule.selectorText} { ${dims.join(', ')} }`);
        }
      }
      /* A block whose WHOLE body was one interpolation this file could not
       * resolve. `<style>${SHELL_CSS}</style>` becomes the bare identifier
       * UNRESOLVED — no braces, no declarations — so the loop above sees no
       * rules, and both text guards below need a `{` or a literal width/height
       * to fire. Nothing was dropped from a count either, because the count
       * never rose. The block reads as a surface with no CSS in it, and this
       * gate would swear it had measured the page. Two ordinary shapes land
       * here: a single-quoted `const STYLE = '…'` (the lookup in
       * resolveInterpolations only reads a backtick literal) and an imported
       * `const` — which is precisely the shared-shell refactor this file's
       * header advertises as covered. */
      if (css.includes(UNRESOLVED) && sheet.cssRules.length === 0) {
        blind.push(`${from}: a <style> block whose entire body is an unresolved interpolation`);
      }
      /* And the same question of the raw text, because the parsed sheet cannot
       * answer it alone: `width: ${sizeOf(1)}px` becomes a value jsdom rejects, so
       * the declaration is simply gone from the CSSOM above. The subject count
       * catches that too, one rule later — this says which rule and why. */
      for (const m of css.matchAll(SIZING_DECL)) {
        if (m[2].includes(UNRESOLVED)) blind.push(`${from}: ${m[1]}: ${m[2].trim()}`);
      }
      for (const m of css.matchAll(/(?:^|[}])([^{}]*)\{/g)) {
        if (m[1].includes(UNRESOLVED)) blind.push(`${from}: selector ${m[1].trim()}`);
      }
      /* An interpolated PROPERTY NAME — `${DIM}: 21px`. jsdom drops the whole
       * declaration as an unknown property, so it never reaches the CSSOM, and
       * the value guard above only ever looks for a literal `width` or
       * `height`, which is the one thing this shape does not write. Anchored on
       * `;` or `{` so a selector such as `a:hover` cannot read as a property. */
      for (const m of css.matchAll(/[;{]\s*([^;{}:]*)\s*:/g)) {
        if (m[1].includes(UNRESOLVED)) blind.push(`${from}: property ${m[1].trim()}`);
      }
    });
  });
  assert.deepEqual(blind, [],
    'a surface writes a sizing rule whose selector or value is computed at render time. This gate '
    + 'substituted a placeholder for it, so it cannot tell whether it sizes an icon and cannot '
    + 'measure it if it does. Teach resolveInterpolations().');
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
