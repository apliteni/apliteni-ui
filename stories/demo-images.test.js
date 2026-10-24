// Demo-image gate — every <img> a story draws must name bytes that decode.
//
// #583: the Finance cells "Values" story asked rowIdentity for a company logo
// as a `data:` URI. `safeUrl` (src/html.js) replaces a `data:` URL with its
// fallback, which rowIdentity passes as the empty string, so the story shipped
// `<img src="">` — and a browser resolves an empty src to the story's own
// document, fails to read it as an image, and draws the broken-image mark over
// the letter underneath. Nothing failed, because no gate had ever read what a
// story's images point at.
//
// So this gate reads them. It renders every story file the Storybook config's
// `stories` globs serve — both `.js` and `.mjs`, asked of .storybook/main.js
// rather than spelled again here — collects every <img> in the markup, and
// resolves each src the way the server that hands the story to a browser would:
//
//   - an empty src is the boundary above having rejected the URL, and fails;
//   - a scheme that boundary rejects fails even if it reaches the attribute by
//     some other route;
//   - a root-absolute path fails: site/build.mjs folds the built Storybook into
//     public/storybook/, so `/demo-assets/x.svg` points above it and 404s on
//     the deployed site while working perfectly in `storybook dev`;
//   - a relative path has to land inside a root Storybook actually serves. The
//     roots are asked of .storybook/main.js, not repeated here, and the file
//     each one names must exist and decode as the type its own bytes claim.
//
// Limits. This is node, not a browser: it reads the bytes an <img> would fetch
// and parses their header, it does not rasterise them, so an SVG that parses
// and declares the SVG namespace but paints nothing — a transparent fill, a
// path outside the viewBox — passes here. What it does read is what decides
// whether a browser decodes the bytes at all: well-formed XML, an <svg> root in
// the SVG namespace, and a size. A remote src cannot be read offline, so one
// fails rather than being skipped. A CSS background-image is not an <img> and
// no story's images are drawn by script after render, so neither is covered.
// It renders stories in jsdom in one theme, because an image URL is the same
// in both. The JSDOM window and the globals handed to story modules repeat
// stories/a11y.test.js on purpose: each gate counts its own subjects.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  MISSING_ON_PURPOSE, configuredStoryFiles, decodeImage, globToRegExp, matchStoryFiles, resolveSrc, servedRoots,
} from './lib/demo-images.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const quietConsole = new VirtualConsole();
quietConsole.on('jsdomError', () => {});
const dom = new JSDOM('<!doctype html><html lang="en"><head><title>kit</title></head><body></body></html>', {
  pretendToBeVisual: true,
  virtualConsole: quietConsole,
});
after(() => dom.window.close());

// Stories that build their markup with document.createElement need a real DOM
// to build in, or they throw and vanish from the count.
for (const key of [
  'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'matchMedia', 'getSelection',
  'Node', 'Element', 'HTMLElement', 'SVGElement', 'DocumentFragment', 'Event', 'CustomEvent',
  'MutationObserver', 'DOMParser', 'NodeFilter',
]) {
  let value;
  try { value = dom.window[key]; } catch { continue; }
  if (value === undefined) continue;
  const bound = typeof value === 'function' && /^[a-z]/.test(key) ? value.bind(dom.window) : value;
  Object.defineProperty(globalThis, key, { value: bound, configurable: true, writable: true });
}

// Storybook's HTML renderer accepts a string or a DOM node. Anything else is a
// gap in coverage and has to be loud rather than silently unread.
function serialize(out) {
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') {
    if (typeof out.outerHTML === 'string') return out.outerHTML;
    if (out.nodeType === 11) return [...out.childNodes].map((n) => n.outerHTML ?? n.textContent).join('');
    if (out.nodeType === 3) return out.textContent;
  }
  return null;
}

// The vanilla story files, which the one Storybook no longer serves but which stay on
// disk until the vanilla kit is removed. The stories the Storybook does serve are walked
// by react/src/demo-images.test.tsx, with the same reading.
const VANILLA_STORIES = ['../stories/**/*.stories.@(js|mjs)'];

// ---- the sweep -------------------------------------------------------------

const storyFiles = configuredStoryFiles(VANILLA_STORIES);

const tally = { files: 0, stories: 0, images: 0 };
const measured = [];

for (const rel of storyFiles) {
  test(`demo images: ${rel}`, async () => {
    const mod = await import(path.join(root, rel));
    const def = mod.default || {};
    const problems = [];
    let discovered = 0;
    let images = 0;

    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      discovered += 1;
      const args = { ...def.args, ...story.args };
      let out;
      try {
        out = render(args, { globals: { theme: 'light', accent: 'default' }, args });
      } catch (err) {
        problems.push(`  ${name} → render threw: ${err && err.message}`);
        continue;
      }
      const html = serialize(out);
      if (html == null) {
        problems.push(`  ${name} → render returned ${Object.prototype.toString.call(out)}; the gate can read a string or a DOM node`);
        continue;
      }
      dom.window.document.body.innerHTML = html;
      for (const img of dom.window.document.querySelectorAll('img')) {
        images += 1;
        const src = img.getAttribute('src');
        if (Object.hasOwn(MISSING_ON_PURPOSE, src)) {
          const at = new URL(src, 'file:///').pathname;
          const there = servedRoots().some((r) => at.startsWith(r.url) && existsSync(path.join(r.dir, at.slice(r.url.length))));
          if (there) problems.push(`  ${name} → src="${src}" is listed as missing on purpose but a served file has that name`);
          else measured.push(`${rel} ${name} → ${src} (missing on purpose)`);
          continue;
        }
        try {
          const file = resolveSrc(src);
          const read = decodeImage(readFileSync(file));
          measured.push(`${rel} ${name} → ${src} (${read.type}, ${read.size})`);
        } catch (err) {
          problems.push(`  ${name} → src="${src}": ${err.message}`);
        }
      }
    }

    tally.files += 1;
    tally.stories += discovered;
    tally.images += images;
    assert.ok(discovered > 0, `no stories found in ${rel} — did the export shape change?`);
    assert.equal(problems.length, 0, `\nImages that would not load:\n${problems.join('\n')}\n`);
  });
}

// The gate's own gate: a story file that stops exporting stories, or a repo
// that stops drawing any image at all, must move these numbers rather than
// quietly checking nothing.
test('demo images: every story file was rendered, and the images found were read', () => {
  assert.equal(tally.files, storyFiles.length, 'every story file ran');
  assert.ok(tally.stories > 0, 'stories were discovered');
  assert.equal(measured.length, tally.images, `${tally.images} images found, ${measured.length} read`);
  assert.ok(tally.images > 0, 'no story draws an <img>; this gate is measuring nothing and should be removed');
});

// The story files this gate walks are the ones Storybook serves, both formats
// of them. The repository holds only `.js` stories today, so the `.mjs` half of
// the config is stated against a listing rather than against the disk: narrow
// either the config or this discovery back to one suffix and this fails.
test('demo images: the sweep walks every vanilla story file', () => {
  assert.deepEqual(storyFiles, configuredStoryFiles(VANILLA_STORIES), 'the sweep walks the vanilla set');
  assert.equal(tally.files, storyFiles.length, `${storyFiles.length} story files configured, ${tally.files} walked`);
  assert.deepEqual(
    matchStoryFiles(VANILLA_STORIES, [
      'stories/components/Demo.stories.js',
      'stories/components/Demo.stories.mjs',
      'stories/deep/down/Demo.stories.mjs',
      'stories/Demo.stories.js',
    ]),
    [
      'stories/Demo.stories.js',
      'stories/components/Demo.stories.js',
      'stories/components/Demo.stories.mjs',
      'stories/deep/down/Demo.stories.mjs',
    ],
    'the vanilla globs take .mjs stories at any depth, so this gate reads them',
  );
  assert.deepEqual(
    matchStoryFiles(VANILLA_STORIES, [
      'stories/demo-images.test.js',
      'stories/components/Demo.js',
      'stories/components/Demo.stories.ts',
      'src/components/Demo.stories.js',
      'stories/assets/demo-logo.svg',
    ]),
    [],
    'and nothing the config does not serve',
  );
  // `**/` has to span directories without leaking across one segment, and an
  // unreadable pattern has to be loud rather than silently matching nothing.
  assert.ok(globToRegExp('stories/**/*.stories.js').test('stories/deep/down/Demo.stories.js'));
  assert.ok(globToRegExp('stories/*.stories.js').test('stories/Demo.stories.js'));
  assert.ok(!globToRegExp('stories/*.stories.js').test('stories/deep/Demo.stories.js'));
  assert.throws(() => globToRegExp('stories/+(a|b).stories.js'), /syntax this gate does not read/);
  assert.throws(() => globToRegExp('stories/{a,b}.stories.js'), /syntax this gate does not read/);
  assert.throws(() => configuredStoryFiles(['../../elsewhere/**/*.stories.js']), /outside the repository/);
});

test('demo images: the served roots come from the Storybook config', () => {
  const roots = servedRoots();
  assert.ok(roots.length > 0, '.storybook/main.js declares no staticDirs, so no story asset can be served');
  for (const r of roots) {
    assert.ok(existsSync(r.dir) && statSync(r.dir).isDirectory(), `${r.url} is served from ${r.dir}, which is not a directory`);
  }
  assert.deepEqual(
    servedRoots(['../stories/assets']),
    [{ url: '/', dir: path.join(root, 'stories/assets') }],
    'a bare staticDirs string serves at the root',
  );
});

// Rejection, stated as cases rather than claimed. Each of these is a shape the
// repository has actually shipped or could ship tomorrow.
test('demo images: a src the browser cannot load is rejected', () => {
  const roots = [{ url: '/demo-assets/', dir: path.join(root, 'stories/assets') }];
  const rejects = (src, why) => assert.throws(() => resolveSrc(src, roots), why, `accepted ${JSON.stringify(src)}`);
  rejects('', /src is empty/);
  rejects(null, /no src attribute/);
  rejects('data:image/svg+xml,%3Csvg%3E%3C/svg%3E', /scheme the kit's HTML boundary rejects/);
  rejects('https://example.com/logo.svg', /remote/);
  rejects('/demo-assets/demo-logo.svg', /root-absolute/);
  rejects('assets/demo-logo.svg', /nothing serves/);
  rejects('demo-assets/not-here.svg', /not there/);
  assert.equal(resolveSrc('demo-assets/demo-logo.svg', roots), path.join(root, 'stories/assets/demo-logo.svg'));
});

test('demo images: bytes that are not a readable image are rejected', () => {
  assert.throws(() => decodeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"')), /not well-formed XML/);
  assert.throws(() => decodeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), /no viewBox/);
  assert.throws(() => decodeImage(Buffer.from('<html><body>not an image</body></html>')), /no reader here recognises/);
  assert.throws(() => decodeImage(Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(16)])), /no IHDR/);
  assert.throws(() => decodeImage(Buffer.from([0xff, 0xd8, 0x00])), /no start-of-frame/);
  assert.equal(decodeImage(readFileSync(path.join(root, 'stories/assets/demo-logo.svg'))).type, 'image/svg+xml');
});

// The namespace, stated on the bytes this repository actually ships rather than
// on a sample: take the demo logo, take the namespace off it, and the gate has
// to refuse it — that mutation is what a browser refuses too.
test('demo images: an SVG a browser cannot decode is rejected, namespace included', () => {
  const file = path.join(root, 'stories/assets/demo-logo.svg');
  const shipped = readFileSync(file, 'utf8');
  assert.match(shipped, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, 'the demo logo declares the SVG namespace');
  assert.equal(decodeImage(Buffer.from(shipped)).size, 'viewBox 0 0 24 24');

  const withoutNamespace = shipped.replace(' xmlns="http://www.w3.org/2000/svg"', '');
  assert.notEqual(withoutNamespace, shipped, 'the mutation changed the bytes');
  assert.throws(() => decodeImage(Buffer.from(withoutNamespace)), /in no namespace rather than/);

  const otherNamespace = shipped.replace('http://www.w3.org/2000/svg', 'http://example.com/not-svg');
  assert.throws(() => decodeImage(Buffer.from(otherNamespace)), /in http:\/\/example\.com\/not-svg rather than/);

  // Chromium decodes a prefixed root at full size, so the prefix alone is not a
  // reason to refuse: the namespace it binds is what counts.
  const prefixed = shipped
    .replace('<svg xmlns=', '<s:svg xmlns:s=')
    .replace('</svg>', '</s:svg>')
    .replace(/<(rect|path) /g, '<s:$1 ');
  assert.equal(decodeImage(Buffer.from(prefixed)).size, 'viewBox 0 0 24 24');
});
