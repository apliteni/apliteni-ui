// The React kit's markup for the Node gates (#429, PR 5): a gate that once took its
// subject from a vanilla factory takes it from the React component that replaced it,
// rendered to static HTML the way a server renders it. No effect runs and no portal
// mounts, which is what the factory's string gave the gate too.
//
// The subject is the BUILT workspace, react/dist, because Node cannot read TSX. `npm ci`
// builds it (the root `prepare`), so CI always has a fresh one; a local build older than
// its source is refused below, so a gate never measures yesterday's component.
//
// react/dist imports the kit by its package name, and Node resolves that name only from a
// file whose nearest package.json is the kit's own. react/ has its own, so the name is
// mapped here to the export the root package.json gives it.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const DIST = join(ROOT, 'react/dist/index.js');

/** The file the root package.json exports a specifier of this package as, or null. */
export function kitTarget(specifier) {
  if (specifier !== MANIFEST.name && !specifier.startsWith(`${MANIFEST.name}/`)) return null;
  const sub = `.${specifier.slice(MANIFEST.name.length)}`;
  const entry = MANIFEST.exports[sub];
  if (!entry) return null;
  const target = typeof entry === 'string' ? entry : entry.import ?? entry.default;
  return target ? join(ROOT, target) : null;
}

let hooked = false;
function hook() {
  if (hooked) return;
  hooked = true;
  registerHooks({
    resolve(specifier, context, next) {
      const target = kitTarget(specifier);
      return target ? { url: pathToFileURL(target).href, shortCircuit: true } : next(specifier, context);
    },
  });
}

const newest = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((latest, entry) => {
  const full = join(dir, entry.name);
  if (entry.isDirectory()) return Math.max(latest, newest(full));
  if (!/\.(tsx?|css)$/.test(entry.name) || /\.(test|stories)\.tsx?$/.test(entry.name)) return latest;
  return Math.max(latest, statSync(full).mtimeMs);
}, 0);

/** Why react/dist cannot stand for the source now, or null when it can. */
export function staleBuild() {
  let built;
  try { built = statSync(DIST).mtimeMs; } catch { return 'react/dist is not built: run `npm run build`.'; }
  return newest(join(ROOT, 'react/src')) > built
    ? 'react/dist is older than react/src: run `npm run build`, so the gate reads the component as it is now.'
    : null;
}

let loaded;
/** React, the server renderer and the built kit, loaded once. */
export async function reactKit() {
  if (!loaded) {
    const stale = staleBuild();
    if (stale) throw new Error(stale);
    hook();
    loaded = Promise.all([import('react'), import('react-dom/server'), import(pathToFileURL(DIST).href)])
      .then(([react, server, kit]) => ({ h: react.createElement, Fragment: react.Fragment, render: server.renderToStaticMarkup, kit }));
  }
  return loaded;
}

/** The static HTML of one React element. */
export async function markup(build) {
  const { h, Fragment, render, kit } = await reactKit();
  return render(build({ h, Fragment, kit }));
}

let live;
/** One live window with React and the built kit in it, made once: its globals are the
 *  window's, so a component mounted here runs its effects and takes events. */
export async function liveKit() {
  if (!live) {
    const stale = staleBuild();
    if (stale) throw new Error(stale);
    hook();
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
    for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'Event',
      'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'MutationObserver', 'getComputedStyle',
      'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'localStorage']) {
      let value;
      try { value = dom.window[key]; } catch { continue; }
      if (value === undefined) continue;
      Object.defineProperty(globalThis, key, { value: typeof value === 'function' && /^[a-z]/.test(key) ? value.bind(dom.window) : value, configurable: true, writable: true });
    }
    if (!dom.window.matchMedia) globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const [react, client] = await Promise.all([import('react'), import('react-dom/client')]);
    const kit = await import(pathToFileURL(DIST).href);
    live = { dom, react, h: react.createElement, act: react.act, createRoot: client.createRoot, kit };
  }
  return live;
}

/** The markup a React element leaves in a whole document once it has mounted: effects run
 *  and a portal lands in <body>, which a server render cannot draw. */
export async function liveMarkup(build) {
  const { dom, h, act, createRoot, kit } = await liveKit();
  const host = dom.window.document.body.appendChild(dom.window.document.createElement('div'));
  const root = createRoot(host);
  act(() => root.render(build({ h, kit })));
  const html = dom.window.document.body.innerHTML;
  act(() => root.unmount());
  host.remove();
  return html;
}
