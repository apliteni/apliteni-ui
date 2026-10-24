// The demo-image reading shared by the two demo-image gates: stories/demo-images.test.js,
// which walks the vanilla story files until the vanilla kit is removed, and
// react/src/demo-images.test.tsx, which walks every story the one Storybook serves.
// Why each rule is what it is: the header of stories/demo-images.test.js.
import { readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import mainConfig from '../../.storybook/main.js';
import { safeUrl } from '../../src/html.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const configDir = path.join(root, '.storybook');

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

// A failed-photo specimen needs a src that does not load: the Avatar's letters are what
// must show then. Each such path is named here, with the reason, and must stay absent
// from every served root, so the entry cannot hide a real image that stopped decoding.
export const MISSING_ON_PURPOSE = {
  'demo-assets/photo-not-found.png': 'the Avatar failed-photo specimen: a photo that does not load leaves the letters',
  'photo-not-found.png': 'the React Avatar failed-photo specimen, for the same reason',
};

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
  if (!patterns.length) throw new Error('no story globs, so this gate would walk nothing');
  const dirs = new Set(patterns.map((p) => {
    const segments = patternFromRoot(p).split('/');
    const magic = segments.findIndex((s) => /[*?@]/.test(s));
    return (magic === -1 ? segments.slice(0, -1) : segments.slice(0, magic)).join('/');
  }));
  return matchStoryFiles(patterns, [...dirs].flatMap(filesUnder));
}

