// The touch-zoom net over the React workspace: same rule as
// stories/field-zoom.test.js, same arithmetic, this workspace's own mounting.
// A React story's render fn calls hooks, so it is mounted rather than called.
//
// This workspace publishes its own stylesheet and react/src/index.ts imports the
// net into it, so the question here is also whether a consumer who takes that
// sheet alone gets a net at all. Blind spots are on the floor page, beside this
// gate's name; the vanilla gate's apply here unchanged.
//
// why: CONTRIBUTING.md#one-gate-per-workspace-over-one-shared-implementation
// why: docs/specification.md#a-field-is-16px-on-a-touch-screen

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';
import {
  FIELDS, NET, netCss, netSelector, reaches, readRepo, sizingRules, typeable, distinct,
  // stories/lib/field-zoom.js is plain JS outside this workspace's tsconfig, and
  // is shared for its arithmetic exactly as stories/lib/contrast.js is.
  // @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
} from '../../stories/lib/field-zoom.js';
// The floor itself is stated once, on the guidelines page that publishes it.
// @ts-expect-error -- untyped JS module, the same borrow the line above makes.
import { FIELD_MIN } from '../../stories/guidelines/_accessibility-floor.js';

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: { render?: Story['render']; args?: Story['args'] } } & Record<string, unknown>;

// The same glob a11y.test.tsx and react/.storybook/main.ts use, so a new story
// file is in the gate the moment it exists.
const modules = import.meta.glob<StoryModule>('./**/*.stories.tsx', { eager: true });
const files = Object.keys(modules).sort();

// KEYS only, the way contrast.test.tsx discovers them: this workspace's own
// stylesheets, whatever they are called.
const cssFiles = Object.keys(import.meta.glob('./**/*.css'))
  .map((f) => `react/src/${f.replace('./', '')}`)
  .sort();
const localRules = cssFiles.flatMap((f) => sizingRules(readRepo(f), f));

afterEach(cleanup);

const fields: { id: string; path: string; tag: string; inNet: boolean | null }[] = [];
const rendered: string[] = [];

describe('field zoom: React stories', () => {
  for (const file of files) {
    const mod = modules[file];
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const renderStory = (story as Story).render || def.render;
      if (typeof renderStory !== 'function') continue;
      const id = `${file}:${name}`;

      it(`${file} → ${name}`, () => {
        const args = { ...def.args, ...(story as Story).args };
        const Story = () => renderStory(args, { globals: { theme: 'dark', accent: 'default' }, args });
        render(<Story />);
        rendered.push(id);
        // document.body, not the render container: Modal portals out of it.
        for (const el of document.body.querySelectorAll(FIELDS)) {
          if (!typeable(el)) continue;
          fields.push({
            id,
            path: `${el.tagName.toLowerCase()}${[...el.classList].map((c) => `.${c}`).join('')}`,
            tag: el.tagName.toLowerCase(),
            inNet: reaches(el, netSelector),
          });
        }
      });
    }
  }
});

describe('field zoom: what the workspace ships', () => {
  it('mounted every story, and found fields in them', () => {
    expect(rendered.length).toBeGreaterThan(10);
    expect(fields.length).toBeGreaterThan(0);
  });

  it('the net reaches every field a React story renders', () => {
    expect(fields.filter((f) => f.inNet === null).map((f) => `${f.path} (${f.id})`)).toEqual([]);
    expect(distinct(fields.filter((f) => f.inNet === false).map((f) => `${f.path} (${f.id})`))).toEqual([]);
  });

  // The kit's sheet is not on the page for a consumer who takes only
  // apliteni-ui/react/css, so the net has to be in this bundle's own entry.
  it('the published React stylesheet carries the net', () => {
    expect(readRepo('react/src/index.ts')).toContain(`import '../../${NET}'`);
    expect(netCss).toMatch(/font-size:\s*16px\s*!important/);
  });

  // This workspace's own sheets must not size a field at all: one that did would
  // be a second answer to the question the net settles, and an important one
  // would outrank it.
  it('no stylesheet in this workspace sizes a field', () => {
    const loud = localRules.filter((r: { important: boolean }) => r.important)
      .map((r: { where: string; selector: string; raw: string }) => `${r.where} — ${r.selector} { ${r.raw} }`);
    expect(loud).toEqual([]);
    const tall = localRules
      .filter((r: { px: number | null }) => r.px != null && r.px > FIELD_MIN)
      .map((r: { where: string; selector: string; raw: string }) => `${r.where} — ${r.selector} { ${r.raw} }`);
    expect(tall).toEqual([]);
  });
});
