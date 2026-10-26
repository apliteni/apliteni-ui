/* Rule: a label or a chip renders the case its author wrote, and an author writes a
 * capital. The React half of the rendered sweep in stories/guidelines/letter-case.test.js
 * (#429): the selectors are every rule that claims `rank: label` or `rank: chip`, read
 * off the kit's sheets; the text is whatever every React story renders into one, in both
 * themes. The stylesheet sweep and the site pages stay in the node gate.
 *
 * What it does not reach: a label no rule ranks, a word past the first, and a name a
 * first word spells in its own case (stories/lib/letter-case.js says how it tells them).
 * why: docs/foundations.md#labels-and-titles */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- shared, independently tested JS module.
import { labelCase, rankedSelectors } from '../../stories/lib/letter-case.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const selectors: { selector: string; rank: string; where: string }[] = rankedSelectors(path.join(root, 'src'));

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });

// A label's own words, not the words of anything nested in it.
const ownText = (el: Element) => {
  const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  return own || el.textContent!.trim();
};

// Found when #429 gave the React stories this gate; none of it comes from the vanilla
// removal. Listed rather than skipped: a label not listed here fails, and a listed one
// that is written with its capital fails until it is taken off. Writing the capital
// changes what the story shows, so it waits for the owner.
const KNOWN_LOWER: Record<string, string[]> = {
  './DataTable.stories.tsx': ['live', 'paused'],
};

const sweep = { bad: [] as string[], read: 0, stories: 0, renders: 0 };
const knownSeen = new Set<string>();
for (const file of Object.keys(modules).sort()) {
  const mod = modules[file];
  const def = mod.default || {};
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || !story || typeof story !== 'object') continue;
    const render = (story as Story).render || def.render;
    if (typeof render !== 'function') continue;
    sweep.stories += 1;
    const args = { ...def.args, ...(story as Story).args };
    const seen = new Set<string>();
    for (const theme of ['dark', 'light']) {
      document.documentElement.setAttribute('data-theme', theme);
      const StoryRender = () => render(args, { globals: { theme, accent: 'default' }, args });
      const host = document.body.appendChild(document.createElement('div'));
      const reactRoot = createRoot(host);
      try { act(() => reactRoot.render(<StoryRender />)); } catch { act(() => reactRoot.unmount()); host.remove(); continue; }
      const html = document.body.innerHTML;
      if (!seen.has(html)) {
        seen.add(html);
        sweep.renders += 1;
        for (const { selector, rank, where } of selectors) {
          for (const el of document.body.querySelectorAll(selector)) {
            const text = ownText(el);
            if (!text) continue;
            sweep.read += 1;
            if (labelCase(text) === 'bad' && KNOWN_LOWER[file]?.includes(text)) { knownSeen.add(`${file}|${text}`); continue; }
            if (labelCase(text) === 'bad') sweep.bad.push(`${file}:${name} [${theme}] — ${selector} (${rank}, ${where}) renders ${JSON.stringify(text)}`);
          }
        }
      }
      act(() => reactRoot.unmount());
      host.remove();
    }
  }
}

// Measured when this gate was written: 1458 labels and chips in 353 stories; the
// AccentPicker Comparison story left with #429 PR 5b, taking six of them.
const READ_FLOOR = 1452;

describe('letter case: React stories', () => {
  it('the ranks the sweep reads are in the sheets', () => {
    expect(selectors.length, 'no rule claims rank: label or rank: chip').toBeGreaterThan(0);
  });

  it('every label and chip a React story renders starts with a capital', () => {
    expect(sweep.read, `read ${sweep.read} labels in ${sweep.stories} stories (${sweep.renders} renders); the walk stopped finding them`).toBeGreaterThanOrEqual(READ_FLOOR);
    expect(sweep.bad, 'Write the label in sentence case. A key is not a label: write the word for it.').toEqual([]);
    expect(Object.entries(KNOWN_LOWER).flatMap(([file, texts]) => texts.map((t) => `${file}|${t}`)).filter((k) => !knownSeen.has(k)),
      'it is written with its capital now: take it off the list').toEqual([]);
  });
});
