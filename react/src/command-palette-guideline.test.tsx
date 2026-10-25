// The command-palette guideline page, held against the React <CommandPalette> it
// describes (#429 moves the subject from the vanilla palette): the keyboard contract the
// page lists, and every palette row a React story renders.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain JS story module shared with the guideline page.
import { KEYS } from '../../stories/guidelines/_command-palette.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(path.join(here, rel), 'utf8');

// A single letter is the same key however the browser cases it.
const fold = (key: string) => (key.length === 1 ? key.toLowerCase() : key);
/** Every key `file` compares an event against, folded; `.key.toLowerCase()` counts. */
const keysHandled = (file: string) => new Set([...read(file).replace(/\/\/[^\n]*/g, '')
  .matchAll(/\.key(?:\.toLowerCase\(\))?\s*[!=]==\s*'([^']+)'/g)].map((m) => fold(m[1])));

// The palette's keys, the dialog behaviour it shares, and the band that opens it.
const SOURCES = ['./CommandPalette.tsx', './dialog.ts', './AppShell.tsx'];

describe('the command palette keyboard contract', () => {
  it('the page lists every key the React palette answers, and no key it does not', () => {
    const handled = new Set(SOURCES.flatMap((f) => [...keysHandled(f)]));
    const declared = new Set((KEYS as { key: string }[]).map((k) => fold(k.key)));
    expect(handled.size, 'the sweep is broken, not the palette').toBeGreaterThanOrEqual(5);
    expect([...declared].sort()).toEqual([...handled].sort());
  });

  it('the reading sees a key the code answers and the page does not list', () => {
    const extra = new Set([...keysHandled('./CommandPalette.tsx'), 'Home']);
    expect(extra.has('Home')).toBe(true);
    expect([...extra].sort()).not.toEqual([...new Set((KEYS as { key: string }[]).map((k) => fold(k.key)))].sort());
  });
});

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
