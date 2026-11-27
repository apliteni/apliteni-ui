// Gate: a link in running text is underlined at rest, and a link in a table cell is not.
// why: docs/foundations.md#text-ink
//
// Every story in both workspaces is mounted once, under the light theme, with the kit's sheet
// and this workspace's. Each `a[href]` is sorted by where it stands, not by its class:
//
//  - table: inside a `td` or `th` of a `.ui-table`. Docs/components.md "Links in cells" promises
//    the underline on hover only, so the gate fails on one at rest.
//  - text: an inline link in a block whose own words go on around it, through inline elements
//    such as `strong`. A badge, a button or a field beside the link is not words around it.
//  - control: everything else, such as a nav row, a button, a menu row, a tab or a card.
//    One drawn as a box (flex, grid or inline-block) fails when it has an underline at rest.
//    A link alone in its block, such as a lone link in a dialog, is not asserted.
//
// WHAT THIS GATE WILL NOT CATCH.
//  - JSDOM draws nothing. It reads the cascaded `text-decoration-line`, so an underline that
//    a colour, a clip or a zero thickness hides passes.
//  - Hover and focus are not walked. The at-rest look is the promise for both kinds.
//  - A link that a story adds only after a click, a timer or a fetch is never mounted.
//  - A link whose words around it sit in a `display: inline-block` element counts as a
//    control, because the gate cannot tell that box from a badge.
//  - One theme only. No theme rule writes `text-decoration`.
//  - A control drawn as `display: block` is not asserted, because a flex parent gives a plain
//    link the same value.
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
// @ts-expect-error -- untyped JS module, shared with the contrast walk.
import { STYLE_FILES } from '../../stories/lib/contrast.js';

type Kind = 'text' | 'table' | 'control';

// The sheets as the browser gets them. kitCssFor() is not used: its expandAnchors() lifts the
// bare `a` rule to (0,1,0) for colour, and that would outrank the (0,0,1) underline rule.
const readLocal = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const KIT = (STYLE_FILES as string[]).map((f) => readLocal(`../../${f}`)).join('\n');
const LOCAL = Object.keys(import.meta.glob('./**/*.css')).sort().map(readLocal).join('\n');

const styleEl = document.createElement('style');
document.head.appendChild(styleEl);
const useSheet = (kit: string) => { styleEl.textContent = `${kit}\n${LOCAL}`; };

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });
const stories = Object.keys(modules).sort().flatMap((file) => {
  const def = modules[file].default || {};
  return Object.entries(modules[file])
    .filter(([name, s]) => name !== 'default' && s && typeof s === 'object')
    .map(([name, s]) => ({ id: `${file}:${name}`, render: (s as Story).render || def.render,
      args: { ...def.args, ...(s as Story).args } }))
    .filter((s) => typeof s.render === 'function');
});

const display = (el: Element) => window.getComputedStyle(el).display;
const words = /[\p{L}\p{N}]/u;

/** The words of `node` that read on the same line as its inline content, leaving out `skip`. */
function inlineText(node: Node, skip: Element): string {
  let text = '';
  for (const child of node.childNodes) {
    if (child === skip) continue;
    if (child.nodeType === Node.TEXT_NODE) text += child.textContent;
    else if (child instanceof Element && display(child) === 'inline') text += inlineText(child, skip);
  }
  return text;
}

export function kindOf(a: Element): Kind {
  if (a.closest('.ui-table') && a.closest('td, th')) return 'table';
  if (display(a) !== 'inline') return 'control';
  let block: Element | null = a.parentElement;
  while (block && display(block) === 'inline') block = block.parentElement;
  return block && words.test(inlineText(block, a)) ? 'text' : 'control';
}

// `block` is left out: a flex parent turns a plain inline link into a block item.
const box = /flex|grid|inline-block/;
const underlined = (a: Element) => window.getComputedStyle(a).textDecorationLine.split(' ').includes('underline');

/** Each link in the body that breaks its kind's promise, with its kind count. */
function walk(): { wrong: string[]; seen: Record<Kind, number> } {
  const wrong: string[] = [];
  const seen: Record<Kind, number> = { text: 0, table: 0, control: 0 };
  for (const a of document.body.querySelectorAll('a[href]')) {
    const kind = kindOf(a);
    seen[kind] += 1;
    if (kind === 'text' && !underlined(a)) wrong.push(`text link without an underline: "${a.textContent}"`);
    if (kind === 'table' && underlined(a)) wrong.push(`table cell link with an underline at rest: "${a.textContent}"`);
    if (kind === 'control' && box.test(display(a)) && underlined(a)) wrong.push(`control with an underline at rest: "${a.textContent}"`);
  }
  return { wrong, seen };
}

function mount(story: (typeof stories)[number]) {
  const Story = () => story.render!(story.args, { globals: { theme: 'light', accent: 'default' }, args: story.args });
  document.documentElement.setAttribute('data-theme', 'light');
  render(<Story />);
}

afterEach(cleanup);

const total: Record<Kind, number> = { text: 0, table: 0, control: 0 };

describe('link underline: every story', () => {
  beforeAll(() => useSheet(KIT));
  for (const story of stories) {
    it(story.id, () => {
      mount(story);
      const { wrong, seen } = walk();
      for (const kind of Object.keys(seen) as Kind[]) total[kind] += seen[kind];
      expect(wrong, story.id).toEqual([]);
    }, 30_000);
  }
  // A walk that found no links passes and proves nothing. These floors are under the counts the
  // walk printed when it was written (0.222.0): 490 stories, text 8, table 92, control 1012.
  it('found links of each kind', () => {
    console.log(`link-underline: ${stories.length} stories; text ${total.text}, table ${total.table}, control ${total.control}`);
    expect(stories.length).toBeGreaterThanOrEqual(450);
    expect(total.text).toBeGreaterThanOrEqual(8);
    expect(total.table).toBeGreaterThanOrEqual(80);
    expect(total.control).toBeGreaterThanOrEqual(900);
  });
});

/* The two mutations each take away one half of the promise, and the walk must see it. */
const TEXT_STORY = '../../stories/guidelines/DensityAndAccents.stories.tsx:DensityAndAccents';
const TABLE_STORY = './showcases/Notifications.stories.tsx:SideNavPage';
const byId = (id: string) => stories.find((s) => s.id === id)!;

describe('link underline: the gate rejects', () => {
  afterEach(() => useSheet(KIT));

  it('a text link with no underline at rest', () => {
    const mutated = KIT.replace(/a:where\(:not\(\[class\]\)\)\s*\{\s*text-decoration:\s*underline;?\s*\}/, '');
    expect(mutated, 'the base rule for a link in text is not in the sheet').not.toBe(KIT);
    useSheet(mutated);
    mount(byId(TEXT_STORY));
    expect(walk().wrong.some((w) => w.startsWith('text link'))).toBe(true);
  });

  it('a table cell link with an underline at rest', () => {
    const mutated = KIT.replace(/(\.ui-table :where\(td, th\) a:not\(\.ui-btn\):not\(\.ui-identity\) \{\s*color: inherit;\s*)text-decoration: none;/, '$1');
    expect(mutated, 'the table rule for a link in a cell is not in the sheet').not.toBe(KIT);
    useSheet(mutated);
    mount(byId(TABLE_STORY));
    expect(walk().wrong.some((w) => w.startsWith('table cell link'))).toBe(true);
  });
});
