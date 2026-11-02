// The command-palette guideline page, held against the React <CommandPalette> it
// describes (#429 moves the subject from the vanilla palette): every palette row a React
// story renders.
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });

const rows: { where: string; el: Element; dont: boolean }[] = [];
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
    act(() => root.render(<StoryRender />));
    for (const el of document.body.querySelectorAll('.ui-cmdk__item')) {
      rows.push({ where: `${file}:${name}`, el: el.cloneNode(true) as Element, dont: !!el.closest('[data-specimen="dont"]') });
    }
    act(() => root.unmount());
    host.remove();
  }
}

// Measured when this gate was written.
const ROWS_FLOOR = 58;

describe('every palette row a React story renders', () => {
  it('the sweep found the palettes the stories render', () => {
    expect(rows.length, 'palette rows rendered').toBeGreaterThanOrEqual(ROWS_FLOOR);
  });

  it('every row says what it is', () => {
    expect(rows.filter(({ el }) => !el.querySelector('.ui-cmdk__label')?.textContent?.trim()).map(({ where }) => where),
      'a row with no name cannot be typed, and cannot be read out').toEqual([]);
  });

  // A guideline page may draw a fault on purpose in its "don't" half, so the rule holds
  // every other row; a fixture row shows the reading can see the fault at all.
  it('a destructive row either asks a question or is disabled', () => {
    const asks = (el: Element) => !el.classList.contains('is-danger')
      || el.getAttribute('aria-haspopup') === 'dialog' || el.getAttribute('aria-disabled') === 'true';
    const fault = document.createElement('div');
    fault.innerHTML = '<div class="ui-cmdk__item is-danger" role="option"><span class="ui-cmdk__label">Delete</span></div>';
    expect(asks(fault.firstElementChild!), 'the reading cannot see a destructive row that runs at once').toBe(false);
    const loose = rows.filter((row) => !row.dont).filter(({ el }) => el.classList.contains('is-danger')
      && el.getAttribute('aria-haspopup') !== 'dialog' && el.getAttribute('aria-disabled') !== 'true')
      .map(({ where, el }) => `${where} — ${el.textContent!.trim().slice(0, 40)}`);
    expect(loose).toEqual([]);
  });
});
