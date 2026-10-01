// React Snippet takes display content as `children` and copies `code`, so a
// caller holds two references to the same text. Nothing in the component can
// check they agree, which makes "displays one thing, copies another" its one
// silent failure mode. This gate holds the kit's own stories to the guarantee
// the specification places on callers.
//
// Limits: jsdom, so this measures text and not rendering. It says nothing about
// token colours (contrast.test.tsx) or layout (browser captures). It also cannot
// exercise the vanilla copy button, because wireTopbar() reads `innerText`,
// which jsdom does not implement.
import type { ReactElement } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: { render?: Story['render']; args?: Story['args'] } } & Record<string, unknown>;

// Same glob the other story gates use, so a new Snippet story file joins this one
// the moment it exists.
const modules = import.meta.glob<StoryModule>('./**/Snippet.stories.tsx', { eager: true });
const files = Object.keys(modules).sort();

afterEach(cleanup);

/** React's copy button; the vanilla factory's carries data-orig, React's does not. */
const reactCopyButtons = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('.ui-snippet__copy:not([data-orig])'));

function renderStory(story: Story, def: StoryModule['default']) {
  const args = { ...def?.args, ...story.args };
  const run = story.render || def?.render;
  // Stories use hooks, so the render fn has to BE a component.
  const Mounted = () => (run ? run(args, { globals: { theme: 'light', accent: 'default' }, args }) : null);
  return render(<Mounted />);
}

const measured: string[] = [];

describe('React Snippet stories copy what they display', () => {
  expect(files).toEqual(['./Snippet.stories.tsx']);

  for (const file of files) {
    const mod = modules[file];
    const def = mod.default;

    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      if (!(story as Story).render && !def?.render) continue;

      it(`${file} → ${name}`, async () => {
        const write = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText: write } });
        try {
          const { container } = renderStory(story as Story, def);
          const buttons = reactCopyButtons(container);
          expect(buttons.length).toBeGreaterThan(0);
          for (const button of buttons) {
            const shown = button.closest('.ui-snippet')!.querySelector('pre')!.textContent;
            write.mockClear();
            await act(async () => { fireEvent.click(button); });
            expect(write).toHaveBeenCalledWith(shown);
            measured.push(`${file}:${name}`);
          }
        } finally {
          vi.unstubAllGlobals();
        }
      });
    }
  }

  // The count is the coverage check: a story added with a Copy button and no
  // measurement, or one quietly dropped, changes this number.
  it('measures every React copy button in the story file', () => {
    expect(measured).toHaveLength(10);
    expect(new Set(measured).size).toBe(8);
  });

  // Comparison is the only story that renders both implementations, and
  // copy={false} snippets have no button to click. Pairing the columns' code
  // text covers those: the vanilla side is highlighted by hlShell from the
  // source string, so matching text proves the React side shows that source.
  it('shows the same code text in both Comparison columns', () => {
    const story = modules['./Snippet.stories.tsx'].Comparison as Story;
    const { container } = renderStory(story, modules['./Snippet.stories.tsx'].default);
    const column = (label: string) => Array.from(
      container.querySelectorAll(`section[aria-label="${label}"] .ui-snippet pre`),
      pre => pre.textContent,
    );
    const vanilla = column('Vanilla');
    expect(vanilla).toHaveLength(3);
    expect(column('React')).toEqual(vanilla);
  });
});

// Proof the comparison above rejects the failure it exists for: a caller whose
// children drift from `code` passes every other test in this suite.
it('rejects a snippet that displays text it does not copy', async () => {
  const { Snippet } = await import('./Snippet');
  const write = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText: write } });
  try {
    const { container } = render(<Snippet code="npm install example"><span className="k">npm install exmaple</span></Snippet>);
    const button = reactCopyButtons(container)[0];
    const shown = container.querySelector('pre')!.textContent;
    await act(async () => { fireEvent.click(button); });
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).not.toHaveBeenCalledWith(shown);
  } finally {
    vi.unstubAllGlobals();
  }
});
