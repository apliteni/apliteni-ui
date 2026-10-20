/* The accessibility walk's parts: one JSDOM window with axe-core in it, and the check of one story
 * file in both themes. The gate deals story files to threads of stories/lib/job-pool.js, so every
 * thread builds its own window, once, the first time it is asked for one.
 * why: #562
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const AXE_OPTS = {
  runOnly: { type: 'tag', values: WCAG },
  resultTypes: ['violations'],
  rules: { 'color-contrast': { enabled: false } },
};
// Both deck themes. The theme lives on <html data-theme>, exactly as
// .storybook/preview.js applies it, so stories that branch on it see the truth.
export const THEMES = ['dark', 'light'];
const ACCENT = 'default';

// Recursive, Node-20-safe story discovery (no fs.globSync).
export const storyFiles = readdirSync(path.join(root, 'stories'), { recursive: true })
  .map((p) => String(p))
  .filter((p) => p.endsWith('.stories.js'))
  .sort();

let dom;

/**
 * One window per thread: axe is a ~1MB script and evaluating it per story is what made the old
 * single-theme run expensive. The window's members become globals, because plenty of stories
 * build their markup with document.createElement and would otherwise throw and vanish.
 */
export function getDom() {
  if (dom) return dom;
  const axeSrc = readFileSync(path.join(path.dirname(require.resolve('axe-core')), 'axe.min.js'), 'utf8');
  // Swallow jsdom's "Not implemented: HTMLCanvasElement" chatter so CI logs stay clean.
  const quietConsole = new VirtualConsole();
  quietConsole.on('jsdomError', () => {});
  dom = new JSDOM(
    '<!doctype html><html lang="en"><head><title>kit</title></head><body></body></html>',
    { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: quietConsole },
  );
  dom.window.eval(axeSrc);
  for (const key of [
    'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
    'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'matchMedia', 'getSelection',
    'Node', 'Element', 'HTMLElement', 'SVGElement', 'DocumentFragment', 'Event', 'CustomEvent',
    'MutationObserver', 'DOMParser', 'NodeFilter',
  ]) {
    let value;
    // Some of these (localStorage on an opaque origin) throw on read — the kit
    // already guards those call sites, so just don't hand the global over.
    try { value = dom.window[key]; } catch { continue; }
    if (value === undefined) continue;
    // Methods need the window as their receiver; constructors must stay unbound.
    const bound = typeof value === 'function' && /^[a-z]/.test(key) ? value.bind(dom.window) : value;
    // defineProperty, not assignment: Node ships some of these (navigator) as
    // getter-only globals that a plain `=` would throw on.
    Object.defineProperty(globalThis, key, { value: bound, configurable: true, writable: true });
  }
  return dom;
}

// Storybook's HTML renderer accepts a string or a DOM node. Accept exactly those
// two; anything else is a gap in coverage and must be loud.
function serialize(out) {
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') {
    if (typeof out.outerHTML === 'string') return out.outerHTML;
    if (out.nodeType === 11) return [...out.childNodes].map((n) => n.outerHTML ?? n.textContent).join('');
    if (out.nodeType === 3) return out.textContent;
  }
  return null;
}

export async function violationsFor(html, theme) {
  const { document: doc, axe } = getDom().window;
  doc.documentElement.setAttribute('data-theme', theme);
  if (ACCENT === 'default') doc.documentElement.removeAttribute('data-accent');
  else doc.documentElement.setAttribute('data-accent', ACCENT);
  doc.body.innerHTML = html;
  const res = await axe.run(doc.body, AXE_OPTS);
  return res.violations;
}

export const fmt = (story, theme, v) =>
  `  ${story} [${theme}] → [${v.impact}] ${v.id}: ${v.help}\n     ${(v.nodes[0]?.html || '').slice(0, 140)}`;

/** Render every story of one file in both themes and run axe over it. */
export async function a11yFile(rel) {
  getDom(); // stories build markup with document.*, so the globals exist before the first import
  const mod = await import(path.join(root, 'stories', rel));
  const def = mod.default || {};
  const problems = [];
  let discovered = 0;
  let checked = 0;

  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || !story || typeof story !== 'object') continue;
    const render = story.render || def.render;
    if (typeof render !== 'function') continue;
    discovered += 1;
    const args = { ...def.args, ...story.args };

    for (const theme of THEMES) {
      let out;
      try {
        out = render(args, { globals: { theme, accent: ACCENT }, args });
      } catch (err) {
        // A story that won't render is not covered. Say so instead of skipping.
        problems.push(`  ${name} [${theme}] → render threw: ${err && err.message}`);
        continue;
      }
      const html = serialize(out);
      if (html == null) {
        problems.push(
          `  ${name} [${theme}] → render returned ${Object.prototype.toString.call(out)};`
          + ' the gate can only check a string or a DOM node',
        );
        continue;
      }
      checked += 1;
      for (const v of await violationsFor(html, theme)) problems.push(fmt(name, theme, v));
    }
  }
  return { discovered, checked, problems };
}
