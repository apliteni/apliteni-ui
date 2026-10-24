// Demo-image gate for the one Storybook (#429, PR 4): every <img> a story draws must
// name bytes that decode. The reading and its reasons are stories/demo-images.test.js's,
// shared through stories/lib/demo-images.js; that gate walks the vanilla story files
// until they are removed, and this one walks the stories .storybook/main.js serves.
//
// Discover subjects from source and check the coverage count.
//
// Limits: jsdom, not a browser, as on the vanilla side. A story is rendered through its
// `render` or as its meta component with its args; a play function is not run, so an
// image a play function adds is unread.
import { readFileSync, existsSync } from 'node:fs';
import { createElement, type ComponentType, type ReactElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error -- plain JS modules
import mainConfig from '../../.storybook/main.js';
// @ts-expect-error -- plain JS modules
import { MISSING_ON_PURPOSE, configuredStoryFiles, decodeImage, resolveSrc, servedRoots } from '../../stories/lib/demo-images.js';

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> } | ((args: unknown) => ReactElement);
type Meta_ = { component?: ComponentType<Record<string, unknown>>; render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown>; includeStories?: string[]; excludeStories?: string[] };
type StoryModule = { default?: Meta_ } & Record<string, unknown>;

// The globs .storybook/main.js gives Storybook, held to the config below.
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', './**/*.stories.ts', '../../stories/**/*.stories.tsx', '../../stories/**/*.stories.ts'], { eager: true });
const repoPath = (key: string) => key.startsWith('../../') ? key.slice(6) : `react/src/${key.slice(2)}`;
const files = Object.keys(modules).sort((a, b) => (repoPath(a) < repoPath(b) ? -1 : 1));

const isStory = (meta: Meta_, name: string) => name !== 'default' && name !== '__namedExportsOrder'
  && (!meta.includeStories || meta.includeStories.includes(name)) && !(meta.excludeStories ?? []).includes(name);
const renderOf = (meta: Meta_, story: Story): (() => ReactElement) | null => {
  if (typeof story === 'function') return () => story({ ...meta.args });
  const args = { ...meta.args, ...story.args };
  const fn = story.render ?? meta.render;
  // Rendered as a component, as Storybook renders it, because a render may call hooks.
  if (fn) return () => createElement(function StoryRender() { return fn(args, { args, globals: { theme: 'light', accent: 'default' } }); });
  if (meta.component) return () => createElement(meta.component!, args);
  return null;
};

const tally = { files: 0, stories: 0, images: 0, read: 0 };
afterEach(() => cleanup());

describe('demo images: every story the one Storybook serves', () => {
  it.each(files)('%s', (file) => {
    const mod = modules[file];
    const meta = mod.default ?? {};
    const problems: string[] = [];
    let stories = 0;
    for (const [name, story] of Object.entries(mod)) {
      if (!isStory(meta, name) || !story) continue;
      const draw = renderOf(meta, story as Story);
      if (!draw) { problems.push(`${name} → no render and no meta component`); continue; }
      stories += 1;
      let container: HTMLElement;
      try { container = render(draw()).container; } catch (err) { problems.push(`${name} → render threw: ${(err as Error).message}`); continue; }
      for (const img of [...container.ownerDocument.querySelectorAll('img')]) {
        tally.images += 1;
        const src = img.getAttribute('src');
        if (src !== null && Object.hasOwn(MISSING_ON_PURPOSE, src)) {
          const at = new URL(src, 'file:///').pathname;
          const there = servedRoots().some((r: { url: string; dir: string }) => at.startsWith(r.url) && existsSync(`${r.dir}/${at.slice(r.url.length)}`));
          if (there) problems.push(`${name} → src="${src}" is listed as missing on purpose but a served file has that name`);
          else tally.read += 1;
          continue;
        }
        // An asset a story imports is served by Vite from the file itself, and emitted
        // beside the build with a relative URL, so its bytes are read where they live.
        const imported = src?.startsWith('/@fs/') ? decodeURIComponent(src.slice(4)) : null;
        try { decodeImage(readFileSync(imported ?? resolveSrc(src))); tally.read += 1; } catch (err) { problems.push(`${name} → src="${src}": ${(err as Error).message}`); }
      }
      cleanup();
    }
    tally.files += 1;
    tally.stories += stories;
    expect(stories, `no stories found in ${file}`).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });
});

describe('demo images: coverage', () => {
  it('walks exactly the story files the Storybook config serves', () => {
    expect(files.map(repoPath)).toEqual(configuredStoryFiles(mainConfig.stories));
  });
  it('rendered every file and read every image it found', () => {
    expect(tally.files).toBe(files.length);
    expect(tally.read).toBe(tally.images);
    expect(tally.images, 'no story draws an <img>; this gate is measuring nothing').toBeGreaterThan(0);
  });
});
