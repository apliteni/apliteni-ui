// Every link the kit renders answers the keyboard with the kit's own ring.
//
// A link in running text is the one control a consumer writes with no class on it at
// all, and until #587 `src/styles/base.css` styled a bare `a` without giving it a focus
// rule, so a reader who reached one with Tab got Chrome's outline, which Artur refused
// on #457. focus-ring.test.tsx judges every stop; this file holds the element-wide net
// over a bare `a`: take it out of the sheet and the links fall back. #429 moved it here
// from stories/inline-link-ring.test.js, which walked the vanilla stories, over the same
// reading in stories/lib/focus-walk.js.
//
// Limits: the reading resolves the source CSS for :focus-visible; it paints nothing.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- untyped JS module, deliberately shared across the gates.
import { STYLE_FILES } from '../../stories/lib/contrast.js';
// @ts-expect-error -- untyped JS module, deliberately shared across the gates.
import { focusRules, judgeStops, failures, focusPaint, cascadeFailures, sheetText } from '../../stories/lib/focus-walk.js';

function repositoryRoot(): string {
  let dir = process.cwd();
  for (let up = 0; up < 4; up++) {
    if (existsSync(path.join(dir, 'src/index.css'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error(`cannot find the kit's stylesheets from ${process.cwd()}`);
}
const ROOT = repositoryRoot();
type Sheet = { file: string; css: string };
const KIT: Sheet[] = (STYLE_FILES as string[]).map((file) => ({ file, css: readFileSync(path.join(ROOT, file), 'utf8') }));
const LOCAL: Sheet[] = Object.keys(import.meta.glob('./**/*.css')).sort().map((rel) => ({
  file: `react/src/${rel.slice(2)}`, css: readFileSync(path.join(ROOT, 'react/src', rel.slice(2)), 'utf8'),
}));

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });

type Stop = { el: HTMLElement };
/** Judge the anchors in the mounted story against one set of sheets. */
const judgeLinks = (sheets: Sheet[]) => {
  const rules = sheets.flatMap(({ file, css }) => focusRules(css, file));
  const judged = judgeStops(document.body, rules);
  return {
    links: (judged.stops as Stop[]).filter((stop) => stop.el.tagName === 'A'),
    unmatchable: judged.unmatchable as string[],
    paint: focusPaint(document.body, sheets),
  };
};

/* Mount every story once and keep the ones that draw a link, with what the page loads. */
const problems: string[] = [];
const subjects: { id: string; html: string; sheets: Sheet[]; links: Stop[]; unmatchable: string[]; paint: ReturnType<typeof focusPaint> }[] = [];
let stories = 0;
for (const file of Object.keys(modules).sort()) {
  const mod = modules[file];
  const def = mod.default || {};
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || !story || typeof story !== 'object') continue;
    const render = (story as Story).render || def.render;
    if (typeof render !== 'function') continue;
    const args = { ...def.args, ...(story as Story).args };
    const StoryRender = () => render(args, { globals: { theme: 'dark', accent: 'default' }, args });
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    try {
      act(() => root.render(<StoryRender />));
    } catch (err) {
      problems.push(`${file}:${name} → render threw: ${(err as Error)?.message}`);
      act(() => root.unmount()); host.remove();
      continue;
    }
    stories += 1;
    if (document.body.querySelector('a[href]')) {
      const id = `${file}:${name}`;
      const own = [...document.body.querySelectorAll('style')].map((s) => s.textContent ?? '').join('\n');
      const sheets = own.trim() ? [...KIT, ...LOCAL, { file: `${id} <style>`, css: own }] : [...KIT, ...LOCAL];
      const judged = judgeLinks(sheets);
      if (judged.links.length) subjects.push({ id, html: document.body.innerHTML, sheets, ...judged });
    }
    act(() => root.unmount());
    host.remove();
  }
}
const LINKS = subjects.flatMap(({ id, links }) => links.map((stop) => ({ id, stop })));

/** Judge stored markup again, against other sheets: the mutation's reading. */
const rejudge = (html: string, sheets: Sheet[]) => {
  document.body.innerHTML = html;
  const out = judgeLinks(sheets);
  document.body.innerHTML = '';
  return out;
};

// The catalogue as measured when this gate was written, less nothing: raise them when it
// grows; a drop means a story stopped drawing links, which is a change to look at.
const STORIES_FLOOR = 352, SUBJECTS_FLOOR = 102, LINKS_FLOOR = 579, NATIVES_FLOOR = 49;
const sel = 'a:focus-visible';
const carrier = KIT.find(({ css }) => sheetText(css).includes(`${sel},`));
const mutate = ({ file, css }: Sheet) => ({ file, css: file === carrier?.file ? sheetText(css).split(`${sel},\n`).join('') : css });

describe('links: React stories', () => {
  // Floors: the measured catalogue, so a refactor that stops rendering links cannot
  // leave this gate green over nothing.
  it('every story renders, and the catalogue still draws links to judge', () => {
    expect(problems, 'a story this gate cannot render is a story it cannot judge').toEqual([]);
    expect(stories).toBeGreaterThanOrEqual(STORIES_FLOOR);
    expect(subjects.length).toBeGreaterThanOrEqual(SUBJECTS_FLOOR);
    expect(LINKS.length).toBeGreaterThanOrEqual(LINKS_FLOOR);
    expect(subjects.flatMap(({ id, unmatchable }) => unmatchable.map((u) => `${id}: ${u}`)),
      'a focus rule this parser cannot match is a rule it never applied').toEqual([]);
  });

  it('none falls back to the browser\'s outline, and none draws one of its own', () => {
    expect(subjects.flatMap(({ id, links }) => (failures(links) as string[]).map((f) => `${id} → ${f}`))).toEqual([]);
  });

  it('the ring a link asks for is the one that paints', () => {
    expect(subjects.flatMap(({ id, paint }) => (paint.unmatchable as string[]).map((u) => `${id}: ${u}`))).toEqual([]);
    const anchors = ({ stops }: { stops: Stop[] }) => ({ stops: stops.filter((stop) => stop.el.tagName === 'A') });
    expect(subjects.flatMap(({ id, paint }) => (cascadeFailures(anchors(paint)) as string[]).map((f) => `${id} → ${f}`))).toEqual([]);
  });

  // The stories are dealt over eight tests so none judges them all; the last reads their results.
  const after: { id: string; bad: string[] }[] = [];
  const PARTS = 8;
  for (let part = 0; part < PARTS; part++) {
    it(`deleting the element-wide rule is judged on its share of stories, part ${part + 1} of ${PARTS}`, () => {
      expect(carrier, `no kit sheet claims the ring for ${sel}`).toBeTruthy();
      subjects.forEach(({ id, html, sheets }, i) => {
        if (i % PARTS === part) after.push({ id, bad: failures(rejudge(html, sheets.map(mutate)).links) as string[] });
      });
    });
  }

  it('deleting the element-wide rule turns this gate red', () => {
    expect(after.length, 'every story must be judged without the rule').toBe(subjects.length);
    const natives = after.flatMap(({ bad }) => bad.filter((f) => f.startsWith('native:')));
    expect(natives.length, 'links that fall back without the rule').toBeGreaterThanOrEqual(NATIVES_FLOOR);
    expect(after.filter(({ bad }) => !bad.length).length, 'every story stayed green with the rule gone').toBeLessThan(subjects.length);
  });
});
