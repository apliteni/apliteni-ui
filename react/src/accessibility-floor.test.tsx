/* The Accessibility minimums walks on the React stories (#429): the minimum target size,
 * the ring against every ground it lands on in every accent, and the legibility of a
 * disabled control. The same walks as the vanilla gate (stories/lib/accessibility-walks.js)
 * over every React story, mounted with its portals, and with the React components' own
 * sheets added to the kit's. The thresholds are the page's own
 * (stories/guidelines/_accessibility-floor.js).
 *
 * Limits are the walks': JSDOM lays nothing out, so geometry is read through the probes
 * in stories/lib/target-geometry.js, and colours are composited from the source cascade. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- shared, independently tested JS modules.
import { THEMES, CELLS, targetRun, ringCell, disabledCell } from '../../stories/lib/accessibility-walks.js';
// @ts-expect-error -- plain JS story module.
import { TARGET_MIN, RING_MIN, RING_FLOOR, DISABLED_MIN, DISABLED_FLOOR, TARGET_EXEMPT } from '../../stories/guidelines/_accessibility-floor.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
const here = path.dirname(fileURLToPath(import.meta.url));
const EXTRA = Object.keys(import.meta.glob('./**/*.css')).sort()
  .map((rel) => readFileSync(path.join(here, rel), 'utf8')).join('\n');

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });

/** Every React story, mounted once, as the whole document it leaves. */
const subjects: { where: string; html: string }[] = [];
const problems: string[] = [];
for (const file of Object.keys(modules).sort()) {
  const mod = modules[file];
  const def = mod.default || {};
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || !story || typeof story !== 'object') continue;
    const render = (story as Story).render || def.render;
    if (typeof render !== 'function') continue;
    const args = { ...def.args, ...(story as Story).args };
    const StoryRender = () => render(args, { globals: {}, args });
    const host = document.body.appendChild(document.createElement('div'));
    const reactRoot = createRoot(host);
    try {
      act(() => reactRoot.render(<StoryRender />));
      subjects.push({ where: `${file}:${name}`, html: document.body.innerHTML });
    } catch (err) {
      problems.push(`${file}:${name} → render threw: ${(err as Error)?.message}`);
    }
    act(() => reactRoot.unmount());
    host.remove();
  }
}

// Found when #429 gave the React stories these walks; none of it comes from the vanilla
// removal, and each part is one only React draws. Listed rather than skipped: a control
// not listed here fails, and a listed one that comes clean fails until it is taken off.
// Each fix changes how the part looks, so it waits for the owner.
const KNOWN_SHORT: Record<string, string> = {
  'button.rx-sort': 'the DataTable column sort button is 21px high',
  // The chart's own 44px table summary shared this key and hid it until #742.
  'summary.ui-focusable': 'the Modal CollapsedForm story\'s disclosure is 23.5px high',
};
const KNOWN_SAME: Record<string, string> = {
  '.ui-check-item:has(input:disabled) .ui-check__hint': 'a disabled checkbox hint paints what the enabled hint paints',
  '.ui-drop.is-disabled .ui-drop__row': 'a disabled file drop row paints what the enabled row paints',
};

const target: Any = await targetRun({ subjects, extraCss: EXTRA });
const rings: Any[] = [];
for (const { theme, accent } of CELLS as { theme: string; accent: string }[]) rings.push(await ringCell(theme, accent, { subjects, extraCss: EXTRA }));
const disabled: Record<string, Any> = {};
for (const theme of THEMES as string[]) disabled[theme] = await disabledCell(theme, { subjects, extraCss: EXTRA });

describe('target size: React stories', () => {
  it('every control the stories render is measured, none skipped', () => {
    expect(problems, 'a story that will not render is a hole in the measurement').toEqual([]);
    expect(target.problems).toEqual([]);
    expect(target.controls.length).toBeGreaterThan(40);
  });

  it(`no control is shorter or narrower than ${TARGET_MIN}px unless it is named exempt`, () => {
    const exempt = new Set([...(TARGET_EXEMPT as { control: string }[]).map((e) => e.control), ...Object.keys(KNOWN_SHORT)]);
    expect(Object.keys(KNOWN_SHORT).filter((key) => !target.controls.some((c: Any) => c.key === key && (c.height < TARGET_MIN || (c.width != null && c.width < TARGET_MIN)))),
      'it clears the floor now, or no story draws it: take it off the list').toEqual([]);
    expect(target.controls.filter((c: Any) => c.height < TARGET_MIN && !exempt.has(c.key)).map((c: Any) => `${c.key} — ${c.height}px high (${c.where})`)).toEqual([]);
    expect(target.controls.filter((c: Any) => c.width != null && c.width < TARGET_MIN && !exempt.has(c.key)).map((c: Any) => `${c.key} — ${c.width}px wide (${c.where})`)).toEqual([]);
  });

  it('no control carries an overlay this gate cannot measure', () => {
    expect(target.controls.filter((c: Any) => c.unreadable.length).map((c: Any) => `${c.key} — ${c.unreadable.join(', ')} (${c.where})`)).toEqual([]);
  });
});

describe('ring: React stories', () => {
  it(`${RING_MIN}:1 against every ground it lands on, in every accent, and nothing below the ${RING_FLOOR}:1 ratchet`, () => {
    const all = rings.flatMap((run) => run.landings.map((l: Any) => ({ ...l, cell: `${run.theme}/${run.accent}` })));
    expect(all.length, 'no ring landed anywhere').toBeGreaterThan(0);
    expect(all.filter((l: Any) => l.ratio != null && l.ratio < RING_MIN).map((l: Any) => `${l.cell}: ${l.selector} on ${l.ground} — ${l.ratio.toFixed(2)}:1`)).toEqual([]);
    expect(all.filter((l: Any) => l.ratio != null && Math.round(l.ratio * 100) / 100 < RING_FLOOR).map((l: Any) => `${l.cell}: ${l.selector} on ${l.ground} — ${l.ratio.toFixed(2)}:1`)).toEqual([]);
  });
});

describe('disabled: React stories', () => {
  it(`every label a disabled control shows clears ${DISABLED_MIN}:1, and nothing is below the ${DISABLED_FLOOR}:1 ratchet`, () => {
    for (const theme of THEMES as string[]) expect(disabled[theme].found.length, `${theme}: no disabled text measured`).toBeGreaterThan(0);
    const all = (THEMES as string[]).flatMap((theme) => disabled[theme].found.map((f: Any) => ({ ...f, theme })));
    expect(all.filter((f: Any) => f.labelled && f.ratio < DISABLED_MIN).map((f: Any) => `${f.theme} ${f.path} — ${f.ratio.toFixed(2)}:1`)).toEqual([]);
    expect(all.filter((f: Any) => f.labelled && Math.round(f.ratio * 100) / 100 < DISABLED_FLOOR).map((f: Any) => `${f.theme} ${f.path} — ${f.ratio.toFixed(2)}:1`)).toEqual([]);
  });

  it('the state repaints, and a rule that fades with opacity has no label under it', () => {
    const all = (THEMES as string[]).flatMap((theme) => disabled[theme].found.map((f: Any) => ({ ...f, theme })));
    expect(all.filter((f: Any) => !f.repaints && !KNOWN_SAME[f.selector]).map((f: Any) => `${f.theme} ${f.path} — ${f.selector}`)).toEqual([]);
    expect(Object.keys(KNOWN_SAME).filter((sel) => !all.some((f: Any) => !f.repaints && f.selector === sel)), 'it repaints now: take it off the list').toEqual([]);
    expect(all.filter((f: Any) => f.opacity < 1 && f.labelled).map((f: Any) => `${f.theme} ${f.path} — ${f.selector} at opacity ${f.opacity}`)).toEqual([]);
  });
});
