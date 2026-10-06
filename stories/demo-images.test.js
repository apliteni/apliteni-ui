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
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import mainConfig from '../.storybook/main.js';
import { safeUrl } from '../src/html.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const configDir = path.join(root, '.storybook');

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

// ---- the roots Storybook serves -------------------------------------------
//
// staticDirs is spelled relative to the config directory, the way Storybook
// reads it, and may be a bare string ("../x" serves at /) or {from, to}.
export function servedRoots(dirs = mainConfig.staticDirs ?? []) {
  return dirs.map((entry) => {
    const { from, to } = typeof entry === 'string' ? { from: entry, to: '/' } : entry;
    return { url: (to ?? '/').replace(/^\/?/, '/').replace(/\/?$/, '/'), dir: path.resolve(configDir, from) };
  });
}

// ---- decoding --------------------------------------------------------------
//
// Each reader answers for the bytes it claims: the type, and the pixel or user
// size the header declares. A file whose header does not parse has no size to
// report, which is what "does not decode" means here.
const SVG_NS = 'http://www.w3.org/2000/svg';
function decodeSvg(bytes) {
  const text = bytes.toString('utf8');
  // An SVG that is not well-formed XML does not paint. jsdom parses an XML
  // content type strictly, and throws on what a browser's XML parser refuses.
  let doc;
  try {
    doc = new JSDOM(text, { contentType: 'image/svg+xml' }).window.document;
  } catch (err) {
    throw new Error(`not well-formed XML: ${err.message}`);
  }
  const svg = doc.documentElement;
  if (svg.localName !== 'svg') throw new Error(`root element is <${svg.localName}>, not <svg>`);
  if (doc.querySelector('parsererror')) throw new Error('the XML parser reported an error');
  // The namespace is what makes those bytes an image rather than well-formed XML
  // that happens to spell "svg". Measured in Chromium through <img>.decode():
  // this file decodes at 24×24, the same bytes with `xmlns` removed and the same
  // bytes under another namespace both fail with "The source image cannot be
  // decoded" and naturalWidth 0. A prefixed root (`<s:svg xmlns:s="…2000/svg">`)
  // carries the namespace and decodes, so this reads the namespace, not the
  // spelling.
  if (svg.namespaceURI !== SVG_NS) {
    throw new Error(
      `root <svg> is in ${svg.namespaceURI === null ? 'no namespace' : svg.namespaceURI} rather than ${SVG_NS}, `
      + 'so a browser refuses to decode it',
    );
  }
  const box = svg.getAttribute('viewBox');
  const size = svg.getAttribute('width') && svg.getAttribute('height');
  if (!box && !size) throw new Error('no viewBox and no width/height, so it has no size to paint at');
  return { type: 'image/svg+xml', size: box ? `viewBox ${box}` : `${svg.getAttribute('width')}×${svg.getAttribute('height')}` };
}

function decodePng(bytes) {
  // IHDR is the first chunk, and its width and height are the two big-endian
  // words after the chunk type.
  if (bytes.length < 24 || bytes.toString('latin1', 12, 16) !== 'IHDR') throw new Error('no IHDR chunk');
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height) throw new Error(`IHDR declares ${width}×${height}`);
  return { type: 'image/png', size: `${width}×${height}` };
}

function decodeJpeg(bytes) {
  // Walk the markers to a start-of-frame, which is where the size lives.
  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) throw new Error(`expected a marker at byte ${at}`);
    const marker = bytes[at + 1];
    const length = bytes.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const height = bytes.readUInt16BE(at + 5);
      const width = bytes.readUInt16BE(at + 7);
      if (!width || !height) throw new Error(`frame declares ${width}×${height}`);
      return { type: 'image/jpeg', size: `${width}×${height}` };
    }
    at += 2 + length;
  }
  throw new Error('no start-of-frame marker');
}

const MAGIC = [
  { type: 'image/png', is: (b) => b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')), decode: decodePng },
  { type: 'image/jpeg', is: (b) => b[0] === 0xff && b[1] === 0xd8, decode: decodeJpeg },
  // Sniffed last: an SVG is text, so it has no magic number to lead with. The
  // root may carry a namespace prefix — Chromium decodes `<s:svg xmlns:s="…">`
  // at full size — so the prefix is part of what counts as an SVG here, and the
  // namespace itself is checked while decoding.
  { type: 'image/svg+xml', is: (b) => /<(?:[a-z][\w.-]*:)?svg[\s>]/i.test(b.toString('utf8', 0, 2048)), decode: decodeSvg },
];

export function decodeImage(bytes) {
  const reader = MAGIC.find((m) => m.is(bytes));
  // An unreadable type is not a pass. Teach the gate the format rather than
  // letting a story draw bytes nothing here has checked.
  if (!reader) throw new Error('no reader here recognises these bytes as an image');
  return reader.decode(bytes);
}

// ---- resolving one src -----------------------------------------------------
//
// Returns the file the browser would fetch, or throws with the reason it could
// not. `roots` is injectable so the gate's own gate can state cases without
// touching the real config.
export function resolveSrc(src, roots = servedRoots()) {
  if (src === null) throw new Error('the <img> carries no src attribute at all');
  if (src.trim() === '') {
    throw new Error(
      'src is empty, which is what safeUrl() leaves behind when it rejects a URL — '
      + 'a browser resolves it to the page itself and draws a broken image',
    );
  }
  if (safeUrl(src, '') === '') throw new Error(`src uses a scheme the kit's HTML boundary rejects: ${src}`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) {
    throw new Error(`src is remote (${src}); a story has to draw bytes this repository ships`);
  }
  if (src.startsWith('/')) {
    throw new Error(
      `src is root-absolute (${src}); the built Storybook is served from public/storybook/, `
      + 'so this resolves above it. Spell it relative to iframe.html instead',
    );
  }
  // Relative to the page that draws it, which for a story is iframe.html at the
  // served root.
  const url = new URL(src, 'file:///');
  const root = roots.find((r) => url.pathname.startsWith(r.url));
  if (!root) {
    throw new Error(
      `nothing serves ${url.pathname}: the roots .storybook/main.js declares are `
      + `${roots.map((r) => r.url).join(', ') || '(none)'}`,
    );
  }
  const file = path.join(root.dir, decodeURIComponent(url.pathname.slice(root.url.length)));
  if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`${url.pathname} is served from a file that is not there`);
  return file;
}

// ---- the story files Storybook serves --------------------------------------
//
// The sweep walks what Storybook walks, which is the `stories` globs in
// .storybook/main.js — not one hard-coded suffix. The config has served
// `*.stories.@(js|mjs)` since the repository's first commit, so a gate reading
// only `.stories.js` would hand a free pass to an .mjs story.

const UNREADABLE_GLOB = /[+!]\(|[{}[\]]/;

const escapeLiteral = (s) => s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');

// Only the pattern syntax Storybook's config actually uses is translated: `*`,
// `?`, `**/` and `@(a|b)`. Anything else throws, because a glob this cannot
// read would match nothing and report full coverage of an empty set.
export function globToRegExp(glob) {
  if (UNREADABLE_GLOB.test(glob)) {
    throw new Error(`pattern syntax this gate does not read: ${glob} — teach it rather than walking nothing`);
  }
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      // `**/` spans any number of directories, including none.
      if (glob[i + 2] === '/') { out += '(?:[^/]+/)*'; i += 2; } else { out += '[\\s\\S]*'; i += 1; }
    } else if (ch === '*') {
      out += '[^/]*';
    } else if (ch === '?') {
      out += '[^/]';
    } else if (ch === '@' && glob[i + 1] === '(') {
      const close = glob.indexOf(')', i);
      if (close === -1) throw new Error(`unclosed @( in ${glob}`);
      const alternatives = glob.slice(i + 2, close).split('|');
      out += `(?:${alternatives.map(escapeLiteral).join('|')})`;
      i = close;
    } else {
      out += escapeLiteral(ch);
    }
  }
  return new RegExp(`^${out}$`);
}

// A config pattern is spelled relative to .storybook/; the sweep names files
// relative to the repository root, so patterns are moved to the same ground.
function patternFromRoot(pattern) {
  const rel = path.relative(root, path.resolve(configDir, pattern)).split(path.sep).join('/');
  if (rel.startsWith('../')) throw new Error(`${pattern} points outside the repository, so nothing here can walk it`);
  return rel;
}

/** Which of `files` (repo-relative) the config's globs serve. */
export function matchStoryFiles(patterns, files) {
  const matchers = patterns.map((p) => globToRegExp(patternFromRoot(p)));
  return [...new Set(files.filter((f) => matchers.some((re) => re.test(f))))].sort();
}

// Walk from each pattern's literal prefix, so a config that moves its stories
// moves this sweep with it.
function filesUnder(dir) {
  const at = path.join(root, dir);
  if (!existsSync(at)) return [];
  return readdirSync(at, { recursive: true })
    .map((p) => `${dir}/${String(p).split(path.sep).join('/')}`)
    .filter((p) => statSync(path.join(root, p)).isFile());
}

export function configuredStoryFiles(patterns = mainConfig.stories ?? []) {
  assert.ok(patterns.length > 0, '.storybook/main.js declares no story globs, so this gate would walk nothing');
  const dirs = new Set(patterns.map((p) => {
    const segments = patternFromRoot(p).split('/');
    const magic = segments.findIndex((s) => /[*?@]/.test(s));
    return (magic === -1 ? segments.slice(0, -1) : segments.slice(0, magic)).join('/');
  }));
  return matchStoryFiles(patterns, [...dirs].flatMap(filesUnder));
}

// ---- the sweep -------------------------------------------------------------

const storyFiles = configuredStoryFiles();

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
test('demo images: the sweep walks every story file the Storybook config serves', () => {
  assert.deepEqual(storyFiles, configuredStoryFiles(), 'the sweep walks the configured set');
  assert.equal(tally.files, storyFiles.length, `${storyFiles.length} story files configured, ${tally.files} walked`);
  assert.deepEqual(
    matchStoryFiles(mainConfig.stories, [
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
    'the repository\'s own globs serve .mjs stories at any depth, so this gate reads them',
  );
  assert.deepEqual(
    matchStoryFiles(mainConfig.stories, [
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
