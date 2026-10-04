// Rule: a field this workspace's catalogue renders is shown on a painted surface,
// never on the page ground. The React half; stories/field-ground.test.js is the
// other, over the same reading in stories/lib/field-ground.js.
//
// Cause and numbers: docs/specification.md#colour-and-contrast. Raised by Artur in
// round r28 of #551 — "Disabled fields almost invisible because of that." #556 moved
// the vanilla galleries onto the card and left this catalogue unwalked; #568 is that
// gap.
//
// Share the calculation but check each workspace separately.
//
// Limits, read before trusting a green run:
//  - Every *.stories.tsx under react/src, which is the whole published catalogue.
//    A vanilla gallery is the other gate's subject and is not reached from here.
//  - Winning declarations in JSDOM, not pixels: a rule inside a media query is
//    unmeasured, and so is anything that depends on layout.
//  - At rest, dark and light, default accent. Hover, focus and active grounds
//    belong to react/src/contrast.test.tsx.
//  - DOM ancestry stands in for visual stacking, so a field positioned over a
//    non-ancestor reads the ground it descends from, not the one under it.
//  - A story's `render` is called, so a DECORATOR is not applied — the same
//    mounting react/src/contrast.test.tsx and field-zoom.test.tsx use. A surface a
//    decorator paints is therefore unmeasured, which is why #568 put the kit's Card
//    inside each render instead, File drop's included: the card is the story.
//  - The `fade` in the shared reading is not asserted here: nothing installs a
//    user-agent sheet, so every control reads 1. FIELD_PAINT=1 owns that.
//  - Storybook's own `args` rendering is reproduced, not the real renderer: a story
//    with no render fn is mounted as `<component {...args} />`, which is what CSF3
//    does with one. A loader, a play fn and the argTypes machinery are not run, so a
//    field a play fn puts on the page is unmeasured.
//  - Discovery is every story export, CSF2's function form included, and asks
//    nothing about renderability: an export CSF leaves without a render is named
//    rather than skipped, so what the gate reports is a hole and not a pass.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ComponentType, ReactElement } from 'react';
// SearchField is a forwardRef object, not a function. The mutation below mounts an
// args-only story of it, which is the case the args fallback used to miss.
import { SearchField } from './SearchField';
import {
  AA_TEXT, desugar, kitCssFor, parseColour, substitute, tokensFor,
  // stories/lib/contrast.js is plain JS outside this workspace's tsconfig. It is
  // imported for its arithmetic, which is unit-tested in stories/lib/contrast.test.js.
  // @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
} from '../../stories/lib/contrast.js';
import {
  FIELD, hex, readField, stranded,
  // @ts-expect-error -- untyped JS module, the same borrow the line above makes.
} from '../../stories/lib/field-ground.js';

const THEMES = ['dark', 'light'] as const;
const FIELD_COUNT = 57;

// Measured in this workspace by the test at the foot of this file, not borrowed
// from the vanilla gate's table. The two agree, which is what says both halves read
// one set of tokens rather than two.
const DISABLED: Record<string, unknown> = {
  dark: { ground: '#211e2d', fill: '#211e2d', border: '#2d293c', edge: 1.16, ink: 6.24 },
  light: { ground: '#ffffff', fill: '#ffffff', border: '#e4e7ee', edge: 1.24, ink: 6.11 },
};

type Theme = (typeof THEMES)[number];

type Reading = {
  story: string; path: string; leaf: string; disabled: boolean; onPage: boolean;
  ground: string; fill: string | null; border: string | null;
  edge: number | null; ink: number | null;
};

// ---- the stylesheet -------------------------------------------------------
//
// The kit's sheet and this workspace's, exactly as react/src/contrast.test.tsx
// assembles them: a field's paint comes from the kit, the surfaces around it from
// both, so a walk over one sheet alone would read grounds nobody ships.
const cssFiles = Object.keys(import.meta.glob('./**/*.css')).sort();
const readLocal = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

function sheetFor(theme: Theme): { page: number[]; text: string } {
  const vars = tokensFor(theme);
  const kit = kitCssFor(theme);
  const local = cssFiles.map((f) => desugar(substitute(readLocal(f), vars))).join('\n');
  return {
    page: parseColour(kit.vars.get('--bg')),
    text: `${kit.css}\n/* --- react/src --- */\n${local}`,
  };
}
const SHEETS = Object.fromEntries(THEMES.map((t) => [t, sheetFor(t)])) as Record<
  Theme, { page: number[]; text: string }>;

const styleEl = document.createElement('style');
document.head.appendChild(styleEl);

// ---- discovery ------------------------------------------------------------

type Meta_ = {
  render?: Story['render']; args?: Story['args']; component?: unknown;
  includeStories?: string[] | RegExp; excludeStories?: string[] | RegExp;
};
type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Meta_ } & Record<string, unknown>;
type Discovered = {
  id: string;
  /** Undefined when nothing in CSF gives this export a render. That is the hole. */
  render?: (args: unknown, ctx: unknown) => ReactElement;
  args: Record<string, unknown>;
};

// The same glob a11y.test.tsx and react/.storybook/main.ts use, so a new story
// file is in the gate the moment it exists. Subjects are discovered, not listed.
const modules = import.meta.glob<StoryModule>('./**/*.stories.tsx', { eager: true });
const files = Object.keys(modules).sort();

/**
 * A type React can mount: a function component, or the object `forwardRef` and
 * `memo` return. `typeof c === 'function'` alone sees only the first kind, and
 * `SearchField` is of the second — which is how three of its args-only stories
 * left this walk unmeasured until #570's review named it.
 */
const isComponent = (c: unknown): c is ComponentType<Record<string, unknown>> =>
  typeof c === 'function' || (typeof c === 'object' && c !== null && '$$typeof' in c);

const named = (filter: string[] | RegExp, name: string) =>
  (Array.isArray(filter) ? filter.includes(name) : filter.test(name));

/** Storybook's own rule for which named exports of a story file are stories. */
const isStory = (def: Meta_, name: string) => {
  if (name === 'default' || name === '__namedExportsOrder') return false;
  if (def.includeStories) return named(def.includeStories, name);
  if (def.excludeStories) return !named(def.excludeStories, name);
  return true;
};

/**
 * The render CSF gives one export. In CSF2 the export IS the render fn; in CSF3
 * it is the story's own `render`, the meta's, or — for a story that is nothing
 * but `args` — `<component {...args} />`, which is what Storybook renders for
 * one. Ten stories in this catalogue reach the walk only through that fallback:
 * Callout's six and FilterBar's four.
 */
function renderOf(def: Meta_, story: unknown, fallback?: Discovered['render']) {
  if (typeof story === 'function') return story as Discovered['render'];
  if (!story || typeof story !== 'object') return undefined;
  return (story as Story).render || def.render || fallback;
}

/**
 * Every story export, whether or not the walk can mount it. Renderability is NOT
 * a discovery filter: a story the walk cannot render is a hole in the
 * measurement, so it arrives here with no `render` and the coverage check below
 * names it. Filtering it out of BOTH the walk and its oracle is what let a
 * function-style story carrying a bare field pass this gate — the mutation at
 * the foot of this file is that story.
 */
const discover = (mods: Record<string, StoryModule>): Discovered[] =>
  Object.keys(mods).sort().flatMap((file) => {
    const mod = mods[file];
    const def = mod.default || {};
    const Component = def.component;
    const fallback = isComponent(Component)
      ? (args: unknown) => <Component {...(args as Record<string, unknown>)} />
      : undefined;
    return Object.entries(mod)
      .filter(([name]) => isStory(def, name))
      .map(([name, story]) => ({
        id: `${file}:${name}`,
        render: renderOf(def, story, fallback),
        args: { ...def.args, ...(story as Story)?.args },
      }));
  });

const stories = discover(modules);
/** What the walk mounts, and the exports it could not — the second list is the hole. */
const found = stories.filter((s) => typeof s.render === 'function');
const unrenderable = stories.filter((s) => typeof s.render !== 'function').map((s) => s.id);

afterEach(cleanup);

// ---- the walk -------------------------------------------------------------

/** One entry per (story × theme) cell, so a cell that measured nothing is visible. */
const cells: { id: string; fields: number }[] = [];
const readings: Record<Theme, Reading[]> = { dark: [], light: [] };
const bodyPaint: Record<string, string> = {};

/**
 * Mount one story in one theme and read every field it draws. Named rather than
 * inlined in the walk so the mutation at the foot of this file runs the gate's
 * own mounting instead of a second spelling of it.
 */
function measure(story: Discovered, theme: Theme): Reading[] {
  // The walk's afterEach would do this, but measure() is also called twice in one
  // test below, and FIELD is read off document.body — so the previous mount has to
  // be gone or its fields are counted again.
  cleanup();
  // Theme-major: swapping <style> makes JSDOM re-parse the whole sheet and
  // drop its cascade cache, so it is swapped once per theme, not per cell.
  if (document.documentElement.getAttribute('data-theme') !== theme) {
    document.documentElement.setAttribute('data-theme', theme);
    styleEl.textContent = SHEETS[theme].text;
  }
  const { id, args } = story;
  // Stories use hooks, so the render fn has to BE a component.
  const Story = () => story.render!(args, { globals: { theme, accent: 'default' }, args });
  render(<Story />);
  bodyPaint[theme] = window.getComputedStyle(document.body).backgroundColor;

  const mine: Reading[] = [];
  // document.body, not the render container: Modal and Drawer portal out of it.
  for (const el of document.body.querySelectorAll(FIELD)) {
    const reading = readField(el, window, { page: SHEETS[theme].page, story: id });
    if (reading) mine.push(reading); // an image ground is nobody's to measure
  }
  return mine;
}

describe('field ground: React stories', () => {
  for (const theme of THEMES) {
    for (const story of found) {
      it(`${story.id} [${theme}]`, () => {
        const mine = measure(story, theme);
        readings[theme].push(...mine);
        cells.push({ id: `${story.id} [${theme}]`, fields: mine.length });

        expect(stranded(mine), `${theme}: a field is drawn on the page ground, where its own paint is`)
          .toEqual([]);
      // The first cell of a theme pays for that theme's stylesheet parse. The
      // ceiling is generous on purpose: it is there to catch a walk that stopped
      // terminating, not a loaded host.
      }, 30_000);
    }
  }
});

// ---- the gate's own gate --------------------------------------------------
//
// This matters more than the pass. A walk that finds no field passes silently and
// forever, and buys a green tick with no coverage behind it.
describe('field ground: React coverage', () => {
  it('mounted every discovered story in every theme', () => {
    console.log(`field-ground[react]: ${files.length} files, ${stories.length} story exports,`
      + ` ${found.length} mounted × ${THEMES.length} themes = ${cells.length} cells;`
      + ` fields ${THEMES.map((t) => `${t} ${readings[t].length}`).join(', ')}`);
    expect(files.length, 'story files discovered').toBeGreaterThan(0);
    expect(stories.length, 'story exports discovered').toBeGreaterThan(0);
    // Fail closed. Discovery hands over every story export, so one CSF leaves
    // without a render is named here rather than quietly left out of the walk.
    expect(unrenderable, 'a story export the walk could not render').toEqual([]);
    expect(cells.length, `${found.length} stories × ${THEMES.length} themes`)
      .toBe(found.length * THEMES.length);
  });

  // An exact count, as the vanilla gate asserts one: a selector that stopped
  // matching, or a story that stopped rendering its field, would otherwise leave
  // the gate green over nothing. Move the number with the specimens that moved.
  //
  // Fields 25, Switch & Checkbox 16, Pagination 5, SearchField 4, Modal 3,
  // Drawer 2, DataTable 1, File drop 1.
  it('found the fields the catalogue renders, in both themes', () => {
    for (const theme of THEMES) {
      expect(readings[theme].length, `${theme}: field discovery changed; update the count`
        + ' with the specimens that moved').toBe(FIELD_COUNT);
      expect(readings[theme].some((f) => f.disabled), `${theme}: no disabled field reached the walk`)
        .toBe(true);
    }
  });

  // FIELD names five control kinds, and a walk that renders four proves nothing
  // about the fifth. Pinned so the catalogue cannot quietly stop covering one.
  it('the catalogue renders every control kind the rule names', () => {
    const kinds = (theme: Theme) => [...new Set(readings[theme].map((f) => {
      if (f.leaf.includes('ui-textarea')) return 'textarea';
      if (f.leaf.includes('ui-select')) return 'select';
      if (f.leaf.includes('ui-switch__track')) return 'switch';
      if (f.leaf.includes('ui-input')) return 'input';
      return 'check';
    }))].sort();
    for (const theme of THEMES) {
      expect(kinds(theme), `${theme}: control kinds reached`)
        .toEqual(['check', 'input', 'select', 'switch', 'textarea']);
    }
  });

  // The failure this catches: the sheet never reached the document. Then no field
  // paints, every ground falls back to JSDOM's white, and `onPage` is false
  // everywhere — the gate would pass for the wrong reason. The page colour the
  // walk compares against has to be the colour the body actually carries.
  it('the sheet reached the document, so the page ground is the one it compares against', () => {
    expect(cssFiles.length, 'component stylesheets discovered under react/src').toBeGreaterThan(0);
    for (const theme of THEMES) {
      expect(parseColour(bodyPaint[theme]), `${theme}: body background would not parse`).toBeTruthy();
      expect(hex(parseColour(bodyPaint[theme])), `${theme}: body does not carry --bg`)
        .toBe(hex(SHEETS[theme].page));
      expect(SHEETS[theme].text, `${theme}: react/src rules reached the sheet`)
        .toContain('.rx-modal__title');
    }
    // Every field read a ground that parsed, and painted something of its own.
    for (const theme of THEMES) {
      expect(readings[theme].filter((f) => f.fill === null).map((f) => `${f.story} → ${f.path}`),
        `${theme}: a field resolved no fill, so its sheet did not reach it`).toEqual([]);
    }
  });

  /* What a disabled field reads on the card in this workspace, per theme, so a token
   * move changes a number here and a person decides whether it is acceptable. The
   * vanilla gate keeps the same record for its own galleries; neither reads the
   * other's, which is the point of checking the workspaces separately.
   *
   * `edge` is --disabled-border against the card, below the 3:1 non-text floor that
   * WCAG 1.4.11 exempts a disabled control from, so it is recorded rather than held
   * to a bar. `ink` is --disabled-ink on the field's own paint and must clear AA:
   * that is the part a reader has to read. Dark reads 1.16:1 off --surface-3, not
   * the 1.27:1 one token gave both states until #564 made the off box the fainter.
   */
  it('reads a disabled field on the card, and its ink clears AA there', () => {
    for (const theme of THEMES) {
      const boxed = readings[theme].filter((f) => f.disabled && f.leaf.startsWith('input.ui-input'));
      expect(boxed.length, `${theme}: no disabled text field in the walk`).toBeGreaterThan(0);
      for (const f of boxed) {
        expect({ ground: f.ground, fill: f.fill, border: f.border, edge: f.edge, ink: f.ink },
          `${theme}: the disabled field's reading moved — review it by hand`)
          .toEqual(DISABLED[theme]);
        expect(f.ink, `${theme}: disabled ink ${f.ink}:1 is below AA on the field's own paint`)
          .toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it('rejects a field left on the page ground', () => {
    expect(stranded([{ story: 'fx:A', path: 'div > input.ui-input', onPage: false }])).toEqual([]);
    expect(stranded([{ story: 'fx:A', path: 'div > input.ui-input', onPage: true }]))
      .toEqual(['fx:A → div > input.ui-input']);
  });
});

// ---- the mutation ---------------------------------------------------------
//
// What a mutation has to prove here is that the GATE rejects a bad story, not
// that `stranded()` can filter a list — so these run discover() and measure(),
// the two the walk itself runs, over modules written for the purpose.
//
// The case is #570's review, verbatim: it appended
// `export const ReviewBareFunctionField = () => <input className="ui-input" …/>`
// to Field.stories.tsx, built React Storybook, and watched the real story render
// a white input on the grey page ground while all 340 tests passed. Discovery
// filtered story exports to objects, so CSF2's function form was invisible to
// the walk AND to the coverage check meant to catch a gap in it.
describe('field ground: React discovery, held to its claim', () => {
  const one = (mod: StoryModule) => {
    const fixture = discover({ './Mutation.stories.tsx': mod });
    expect(fixture.map((s) => s.id), 'the fixture has one story export; discovery found these')
      .toHaveLength(1);
    return fixture[0];
  };

  it('discovers a function-style story and reports the bare field in it', () => {
    const story = one({
      default: {},
      ReviewBareFunctionField: () => <input className="ui-input" aria-label="Review mutation" />,
    });
    expect(story.id).toBe('./Mutation.stories.tsx:ReviewBareFunctionField');
    for (const theme of THEMES) {
      const mine = measure(story, theme);
      expect(mine.length, `${theme}: the function-style story's field was not measured`).toBe(1);
      expect(mine[0].onPage, `${theme}: the bare field did not read the page ground`).toBe(true);
      expect(stranded(mine), `${theme}: the gate did not reject the bare field`)
        .toEqual([`${story.id} → ${mine[0].path}`]);
    }
  });

  // The args-only fallback over a forwardRef: `typeof component === 'function'`
  // was false for one, so SearchField's three args-only stories reached neither
  // the walk nor a render of their own. They were refused by the coverage check
  // rather than measured — safe, but not the general args rendering this gate
  // claims. The field below is on the page ground, so the walk also has to
  // reject it once it can mount it.
  it('mounts an args-only story whose meta component is a forwardRef', () => {
    const story = one({
      default: { component: SearchField, args: { ariaLabel: 'Search invoices' } },
      ArgsOnly: {},
    });
    expect(typeof story.render, 'a forwardRef component reached the args fallback').toBe('function');
    const mine = measure(story, 'light');
    expect(mine.length, "the forwardRef component's field was not measured").toBe(1);
    expect(stranded(mine), 'the gate did not reject the bare forwardRef field')
      .toEqual([`${story.id} → ${mine[0].path}`]);
  });

  // The other half of the same rule: what the fallback truly cannot render is
  // named, not dropped. This is the list the coverage check holds to empty.
  it('names a story export it cannot render instead of dropping it', () => {
    const story = one({ default: {}, ArgsOnly: { args: { value: 1 } } });
    expect(story.render, 'no render of its own, no meta render, no component').toBeUndefined();
    expect(discover({ './Mutation.stories.tsx': { default: {}, ArgsOnly: {} } })
      .filter((s) => typeof s.render !== 'function').map((s) => s.id),
    'the hole the coverage check reports').toEqual(['./Mutation.stories.tsx:ArgsOnly']);
  });

  // Storybook's own rule for what counts as a story export, so a meta that
  // excludes a helper export does not turn it into an unrenderable "story".
  it("keeps Storybook's include/exclude rule for story exports", () => {
    const bare = () => <input className="ui-input" aria-label="Review mutation" />;
    const mod = { HELPERS: { a: 1 }, Real: {} };
    expect(discover({
      './Mutation.stories.tsx': { ...mod, default: { excludeStories: ['HELPERS'], render: bare } },
    }).map((s) => s.id)).toEqual(['./Mutation.stories.tsx:Real']);
    expect(discover({
      './Mutation.stories.tsx': { ...mod, default: { includeStories: /^Real$/, render: bare } },
    }).map((s) => s.id)).toEqual(['./Mutation.stories.tsx:Real']);
  });
});
