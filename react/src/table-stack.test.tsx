/* Rule: a table that stacks names its own roles, keeps its clipped header free of
 * focus stops, and announces no order it gives no control for. The React half of
 * stories/table-stack.test.js (#429), over the same reading in stories/lib/table-stack.js.
 * Every React story is mounted, and every stacked table it draws is read; a stacked table
 * a story writes by hand is held as well as the one DataTable writes.
 * Limit: this reads markup. It proves the roles are there, not that a screen reader
 * announces the table. */
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- shared, independently tested JS module.
import { MODIFIER, stackedTables } from '../../stories/lib/table-stack.js';

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });

// Measured when this gate was written: three stacked tables, in one story file.
const FOUND_FLOOR = 3, FILES_FLOOR = 1;

describe('stacked tables: React stories', () => {
  // One `it` per story file, so a slow file shows as itself and no single test
  // carries the whole walk past the 5 s budget.
  const sweep = { found: 0, drawers: new Set<string>(), problems: [] as string[] };

  for (const file of Object.keys(modules).sort()) {
    it(`every stacked table in ${file} names its own roles`, () => {
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
          sweep.problems.push(`${file} → ${name}: render threw: ${(err as Error)?.message}`);
          act(() => root.unmount()); host.remove();
          continue;
        }
        const result = stackedTables(document.body.innerHTML, `${file} → ${name}`);
        if (result.tables) sweep.drawers.add(file);
        sweep.found += result.tables;
        sweep.problems.push(...result.problems);
        act(() => root.unmount());
        host.remove();
      }
    });
  }

  it('the walk found the stacked tables and every one names its roles', () => {
    expect(sweep.problems).toEqual([]);
    // The stories that show the modifier today; a drop means one stopped drawing it.
    expect(sweep.found, `stacked tables found in what the stories rendered (${MODIFIER})`).toBeGreaterThanOrEqual(FOUND_FLOOR);
    expect(sweep.drawers.size, 'story files that draw a stacked table').toBeGreaterThanOrEqual(FILES_FLOOR);
  });

  it('the reading rejects a stacked table that leans on the implicit roles', () => {
    const bare = '<table class="ui-table ui-table--stack"><thead><tr><th>Who</th></tr></thead><tbody><tr><td>t.quill</td></tr></tbody></table>';
    expect(stackedTables(bare, 'fixture').problems.length).toBeGreaterThan(0);
  });
});
