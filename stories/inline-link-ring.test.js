// Every link the kit renders answers the keyboard with the kit's own ring.
//
// A link in running text is the one control a consumer writes with no class on
// it at all, and until #587 `src/styles/base.css` styled a bare `a` without
// giving it a focus rule. So a reader who reached one with Tab got Chrome's
// outline — black in both themes and blind to the accent — which Artur refused
// on #457. stories/focus-ring.test.js named this gap in its own header and left
// it open: it walks three named surfaces, and a prose link is everywhere else.
// This file is that walk, over every story the vanilla catalogue exports.
//
// Subjects are discovered, never listed: every `*.stories.js` under stories/ is
// rendered and every anchor a story draws is judged. The reading is the shared
// one — stories/lib/focus-walk.js, unit-tested in stories/lib/focus-walk.test.js
// — so this gate and the two keyboard walks cannot drift apart on what counts as
// the ring.
//
// WHAT THIS GATE WILL NOT CATCH.
//
//  - It reads the CSS source, not a browser. JSDOM computes neither box-shadow
//    nor :focus-visible, so the cascade is resolved here by specificity and
//    document order instead. What the resolver does not model is listed in
//    stories/lib/focus-walk.js: !important, inline style, a query's condition, a
//    state the static DOM is not in, and var() expansion.
//  - It says nothing about the ring's colour, its shape on screen, or whether an
//    ancestor clips it. The band's contrast against every ground it lands on is
//    measured in stories/guidelines/accessibility-floor.test.js, and the pixels
//    are read from Chromium captures.
//  - Scripts do not run, so a link a story adds after render is not walked, and
//    a story that renders no markup contributes none.
//  - Only the vanilla catalogue. React's anchors are walked by
//    react/src/focus-ring.test.tsx, which mounts every React story.
//  - It reads a rule, not a shape, so it cannot see that a link is the first
//    ringed control in this kit that can WRAP. A link broken across two lines
//    draws a closed rectangle per line — one focus, two indicators — and an
//    `outline` does the same in this Chromium, so #578 does not change it. None
//    of the links this walk judges wraps, so nothing here would notice if a
//    wrapped one ever looked wrong.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { STYLE_FILES, storyFiles, installDomGlobals } from './lib/contrast.js';
import {
  focusRules, judgeStops, failures, focusPaint, cascadeFailures, sheetText,
} from './lib/focus-walk.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

/** The kit's sheets, in the order a page loads them. */
const KIT = STYLE_FILES.map((file) => ({ file, css: read(file) }));

/** A story's own <style> blocks, which load after the kit's. */
const styleOf = (html) => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
  .map((m) => m[1]).join('\n');

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});

const serialize = (out) => (typeof out === 'string' ? out : (out && out.outerHTML) || null);

/**
 * One window for the whole walk, its globals installed BEFORE any story runs:
 * several stories reach for `requestAnimationFrame` or `document` while they
 * render, and a window made after the fact would turn each of them into a
 * problem rather than a subject. The body is replaced per story — the same
 * treatment the contrast walk measured as identical to a fresh window each time,
 * and much cheaper.
 */
const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>',
  { pretendToBeVisual: true, virtualConsole: quiet });
installDomGlobals(dom.window);
const body = dom.window.document.body;

/** Judge the anchors in one story's markup against one set of sheets. */
const judgeLinks = (markup, sheets) => {
  body.innerHTML = markup;
  const rules = sheets.flatMap(({ file, css }) => focusRules(css, file));
  const judged = judgeStops(body, rules);
  return {
    links: judged.stops.filter((stop) => stop.el.tagName === 'A'),
    unmatchable: judged.unmatchable,
    paint: focusPaint(body, sheets),
  };
};

/**
 * Render every story once and keep the ones that draw a link.
 *
 * A story that will not render is a problem, never a skip — the rule the
 * contrast walk runs under too: an unrenderable story is an unmeasured story.
 */
const walked = await (async () => {
  const problems = [];
  const subjects = [];
  let stories = 0;
  for (const rel of storyFiles) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      let out;
      try {
        out = render({ ...def.args, ...story.args }, { globals: {}, args: {} });
      } catch (err) {
        problems.push(`${rel}:${name} → render threw: ${err && err.message}`);
        continue;
      }
      const markup = serialize(out);
      if (markup == null) {
        problems.push(`${rel}:${name} → render returned ${Object.prototype.toString.call(out)}`);
        continue;
      }
      stories += 1;
      if (!/<a[\s>]/i.test(markup)) continue;
      const id = `${rel}:${name}`;
      const own = styleOf(markup);
      const sheets = own.trim() ? [...KIT, { file: `${id} <style>`, css: own }] : KIT;
      const judged = judgeLinks(markup, sheets);
      if (!judged.links.length) continue;
      subjects.push({ id, markup, sheets, ...judged });
    }
  }
  return { problems, subjects, stories };
})();

/** Every anchor stop, across every story that draws one. */
const LINKS = walked.subjects.flatMap(({ id, links }) => links.map((stop) => ({ id, stop })));

// Anti-vacuity. The floors are the measured catalogue less room for a story to
// be retired, not a target: a refactor that stops rendering half the links would
// otherwise leave this gate green over nothing. Raise them when the catalogue
// grows; a drop below one means a story stopped drawing links, which is a change
// to look at rather than to paper over.
test('links: every story renders, and the catalogue still draws links to judge', () => {
  assert.deepEqual(walked.problems, [], 'a story this gate cannot render is a story it cannot judge');
  assert.ok(walked.stories >= 180, `only ${walked.stories} stories rendered`);
  assert.ok(walked.subjects.length >= 60, `only ${walked.subjects.length} stories draw a link`);
  assert.ok(LINKS.length >= 380, `only ${LINKS.length} links judged`);
  const broken = walked.subjects.flatMap(({ id, unmatchable }) => unmatchable.map((u) => `${id}: ${u}`));
  assert.deepEqual(broken, [], 'a focus rule this parser cannot match is a rule it never applied');
});

// The rule itself. `native` is the browser's own outline — no focus rule reaches
// the link at all; `outline` is a visible outline of the story's or component's
// own, beside the ring or instead of it; `shadow` is some other box-shadow.
test('links: none falls back to the browser\'s outline, and none draws one of its own', () => {
  const bad = walked.subjects.flatMap(({ id, links }) => failures(links).map((f) => `${id} → ${f}`));
  assert.deepEqual(
    bad, [],
    `${bad.length} links do not draw the kit ring on :focus-visible:\n  ${bad.join('\n  ')}`,
  );
});

// Presence is not paint. A link can match a rule that asks for `var(--ring)` and
// still lose `box-shadow` to a rule that outranks it, which is how #487's review
// found a swatch that painted nothing new when focused.
test('links: the ring a link asks for is the one that paints', () => {
  const broken = walked.subjects.flatMap(({ id, paint }) => paint.unmatchable.map((u) => `${id}: ${u}`));
  assert.deepEqual(broken, [], 'a painting rule this resolver cannot match is a rule it never ranked');
  const anchors = ({ stops }) => ({ stops: stops.filter((stop) => stop.el.tagName === 'A') });
  const lost = walked.subjects.flatMap(({ id, paint }) => cascadeFailures(anchors(paint))
    .map((f) => `${id} → ${f}`));
  assert.deepEqual(
    lost, [],
    `${lost.length} links ask for the ring and lose it to the cascade:\n  ${lost.join('\n  ')}`,
  );
});

// The mutation. Take the element-wide rule out of the sheet it lives in and this
// gate has to go red — otherwise the net over a bare `a` is held by nothing here
// and could be deleted unnoticed. The rule is found by reading it out of the
// sheet, so renaming the file or reshaping the selector list cannot leave the
// mutation silently matching nothing.
test('links: deleting the element-wide rule turns this gate red', () => {
  const sel = 'a:focus-visible';
  const carrier = KIT.find(({ css }) => sheetText(css).includes(`${sel},`));
  assert.ok(carrier, `no kit sheet claims the ring for ${sel}`);
  const mutate = ({ file, css }) => ({
    file,
    css: file === carrier.file ? sheetText(css).split(`${sel},\n`).join('') : css,
  });
  const after = walked.subjects.map(({ id, markup, sheets }) => ({
    id, bad: failures(judgeLinks(markup, sheets.map(mutate)).links),
  }));
  const silent = after.filter(({ bad }) => !bad.length).map(({ id }) => id);
  const natives = after.flatMap(({ bad }) => bad.filter((f) => f.startsWith('native:')));
  assert.ok(natives.length >= 30, `only ${natives.length} links fall back without the rule`);
  assert.ok(
    silent.length < walked.subjects.length,
    'every story stayed green with the rule gone, so this gate holds nothing',
  );
});

// The judgement, on a fixture rather than on the catalogue, so each verdict is
// one declaration apart from the next.
test('links: a native fallback and a flat outline on a link are both rejected', () => {
  const dom = new JSDOM('<!doctype html><html><body><a href="#x">Read the notes</a></body></html>',
    { virtualConsole: quiet });
  const body = dom.window.document.body;
  const judge = (css) => judgeStops(body, focusRules(css, 'fixture')).stops[0];
  assert.equal(judge('a{color:red}').status, 'native', 'a link no focus rule reaches is native');
  assert.equal(judge('a:focus-visible{outline:2px solid var(--accent)}').status, 'outline',
    'a flat accent outline is not the ring');
  assert.equal(judge('a:focus-visible{box-shadow:0 0 0 2px blue}').status,
    'shadow', 'a box-shadow is never the ring since #578');
  assert.equal(judge('a:focus-visible{outline:var(--ring);outline-offset:var(--ring-offset)}').status,
    'ring', 'the shared ring passes');
  assert.equal(
    judge('a:focus-visible{outline:var(--ring);outline-offset:var(--ring-offset)} '
      + 'a:focus-visible{outline:2px solid var(--accent)}').status,
    'outline', 'a visible outline beside the ring is two indicators, not one');
  dom.window.close();
});
