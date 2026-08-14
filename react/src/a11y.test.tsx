// Accessibility gate for the React workspace.
//
// The vanilla gate discovers `*.stories.js` and React's stories are
// `*.stories.tsx`, so this workspace shipped with no axe gate at all — the only
// `axe` under react/ was the addon's browser panel, a thing you look at rather
// than a thing that fails a build.
//
// It cannot share the vanilla file: that one eval's axe into a raw JSDOM and
// feeds it HTML strings, while React stories have to actually mount. So this is
// the same CONTRACT through vitest + @testing-library/react.
//
// Same two rules the vanilla gate follows: color-contrast stays off, because
// axe cannot resolve var() in a headless DOM and react/src/contrast.test.tsx
// owns that question; and a story that will not render is a failure, not a skip.
//
// why: CONTRIBUTING.md#the-react-workspace-gets-its-own-walk-over-the-same-arithmetic
// why: CONTRIBUTING.md#a-gate-that-skips-is-worse-than-a-gate-that-is-absent
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactElement } from 'react';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const AXE_OPTS: axe.RunOptions = {
  runOnly: { type: 'tag', values: WCAG },
  resultTypes: ['violations'],
  rules: { 'color-contrast': { enabled: false } },
};
const THEMES = ['dark', 'light'];

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: { render?: Story['render']; args?: Story['args'] } } & Record<string, unknown>;

// Same glob Storybook uses (react/.storybook/main.ts), so a new story file is in
// the gate the moment it exists — nobody has to remember to register it here.
const modules = import.meta.glob<StoryModule>('./**/*.stories.tsx', { eager: true });
const files = Object.keys(modules).sort();

afterEach(cleanup);

const found: string[] = [];
const checked: string[] = [];

describe('a11y: React stories', () => {
  for (const file of files) {
    const mod = modules[file];
    const def = mod.default || {};

    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const renderStory = (story as Story).render || def.render;
      if (typeof renderStory !== 'function') continue;
      found.push(`${file}:${name}`);

      for (const theme of THEMES) {
        it(`${file} → ${name} [${theme}]`, async () => {
          document.documentElement.setAttribute('data-theme', theme);
          const args = { ...def.args, ...(story as Story).args };
          // Stories use hooks, so the render fn has to BE a component, not be
          // called as a plain function.
          const Story = () => renderStory(args, { globals: { theme, accent: 'default' }, args });
          render(<Story />);
          // document.body, not the render container: Modal portals out of it.
          const res = await axe.run(document.body, AXE_OPTS);
          checked.push(`${file}:${name}:${theme}`);
          const report = res.violations.map(
            (v) => `[${v.impact}] ${v.id}: ${v.help}\n     ${(v.nodes[0]?.html || '').slice(0, 160)}`,
          );
          expect(report, `${name} [${theme}]`).toEqual([]);
        });
      }
    }
  }
});

// The gate's own gate: coverage you can count. If a story stops rendering, or a
// story file stops being discovered, these numbers move and this fails.
describe('a11y: React coverage', () => {
  it('checked every discovered story in every theme', () => {
    expect(files.length, 'story files discovered').toBeGreaterThan(0);
    expect(found.length, 'stories discovered').toBeGreaterThan(0);
    expect(checked.length, `${found.length} stories × ${THEMES.length} themes`)
      .toBe(found.length * THEMES.length);
  });
});
