/* Rule: react/dist/index.css must not change what the kit's own sheets already decided.
 * The React half of the measured claim in stories/react-bundle-cascade.test.js (#429):
 * every React story is mounted, its markup goes into two documents, the kit's sheets with
 * the React bundle after them and the same without the re-emitted kit copies, and every
 * element a re-emitted rule reaches is compared, over stories/lib/bundle-cascade.js. The
 * reconstruction of the bundle and the pager's own reading stay in the node gate.
 *
 * Limits are the walk's: winning declarations, not pixels; a var() no token file declares
 * stays unresolved in both documents; state rules match nothing in either. */
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- shared, independently tested JS module.
import { BUNDLE, KIT, THEMES, sweepTheme } from '../../stories/lib/bundle-cascade.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });

const subjects: { where: string; html: string }[] = [];
for (const file of Object.keys(modules).sort()) {
  const mod = modules[file];
  const def = mod.default || {};
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || !story || typeof story !== 'object') continue;
    const render = (story as Story).render || def.render;
    if (typeof render !== 'function') continue;
    const args = { ...def.args, ...(story as Story).args };
    const StoryRender = () => render(args, { globals: { theme: 'dark' }, args });
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    act(() => root.render(<StoryRender />));
    subjects.push({ where: `${file}:${name}`, html: document.body.innerHTML });
    act(() => root.unmount());
    host.remove();
  }
}

// The mutation: put input.css back where tsup used to emit it.
const MUTATION_SHEET = 'src/styles/input.css';
const MUTATED_BUNDLE = [...BUNDLE];
MUTATED_BUNDLE.splice(Math.max(-1, ...BUNDLE.map((rel: string, i: number) => (KIT.has(rel) ? i : -1))) + 1, 0, MUTATION_SHEET);
/** The two themes' sweeps, added up the way sweep() adds them, in this process: vitest
 *  rewrites the module's URL, so sweep()'s worker threads cannot load it here. */
async function sweepAll(bundle: string[]) {
  const out = { findings: [] as string[], problems: [] as string[], stories: new Set<string>(), stats: { compared: 0, reached: new Map<string, number>() } };
  for (const theme of THEMES as string[]) {
    const part: Any = await sweepTheme(bundle, theme, subjects);
    out.findings.push(...part.findings);
    out.problems.push(...part.problems);
    for (const s of part.stories) out.stories.add(s);
    out.stats.compared += part.compared;
    for (const [sheet, n] of part.reached) out.stats.reached.set(sheet, (out.stats.reached.get(sheet) ?? 0) + n);
  }
  return out;
}
const SWEEP: Any = await sweepAll(BUNDLE);
const MUTATED: Any = await sweepAll(MUTATED_BUNDLE);

// Measured when this gate was written: every React story mounts.
const STORIES_FLOOR = 352;

describe('the React bundle over the kit: React stories', () => {
  it('every re-emitted kit sheet a cascade can rank is exercised by the walk', () => {
    expect([...SWEEP.stats.reached].filter(([, n]: [string, number]) => n === 0).map(([sheet]: [string]) => sheet)).toEqual([]);
  });

  it('no re-emitted kit rule moves a property in the document a consumer gets', () => {
    expect(SWEEP.problems).toEqual([]);
    expect(SWEEP.stories.size, 'stories mounted').toBeGreaterThanOrEqual(STORIES_FLOOR);
    expect(SWEEP.stats.compared, 'elements compared').toBeGreaterThan(0);
    expect(SWEEP.findings).toEqual([]);
  });

  it('tooltip.css is re-emitted, reached by the walk, and moves nothing', () => {
    expect(BUNDLE).toContain('src/styles/tooltip.css');
    expect(SWEEP.stats.reached.get('src/styles/tooltip.css')).toBeGreaterThan(0);
    expect(SWEEP.findings.filter((f: string) => f.includes('ui-tip'))).toEqual([]);
  });

  it('putting input.css back where tsup emitted it is caught on the pager size control', () => {
    expect(BUNDLE).not.toContain(MUTATION_SHEET);
    expect(MUTATED.problems).toEqual([]);
    const pager = MUTATED.findings.filter((f: string) => f.includes('ui-pager__size-select'));
    expect(pager.length, `the walk reported: ${MUTATED.findings.slice(0, 8).join(' | ') || '(nothing)'}`).toBeGreaterThan(0);
  });
});
