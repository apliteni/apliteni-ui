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
//    inside each render instead: the card is the story, and the gate sees it.
//  - Storybook's own `args` rendering is reproduced, not the real renderer: a story
//    with no render fn is mounted as `<component {...args} />`, which is what CSF3
//    does with one. A loader, a play fn and the argTypes machinery are not run, so a
//    field a play fn puts on the page is unmeasured.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ComponentType, ReactElement } from 'react';
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
const FIELD_COUNT = 56;

// Measured in this workspace by the test at the foot of this file, not borrowed
// from the vanilla gate's table. The two agree, which is what says both halves read
// one set of tokens rather than two.
const DISABLED: Record<string, unknown> = {
  dark: { ground: '#211e2d', fill: '#211e2d', border: '#332f45', edge: 1.27, ink: 6.24 },
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

type Meta_ = { render?: Story['render']; args?: Story['args']; component?: ComponentType<never> };
type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Meta_ } & Record<string, unknown>;

// The same glob a11y.test.tsx and react/.storybook/main.ts use, so a new story
// file is in the gate the moment it exists. Subjects are discovered, not listed.
const modules = import.meta.glob<StoryModule>('./**/*.stories.tsx', { eager: true });
const files = Object.keys(modules).sort();

/**
 * Every story, with the render CSF3 would give it: its own, the meta's, or — for a
 * story that is nothing but `args` — `<component {...args} />`, which is what
 * Storybook renders for one. Ten stories in this catalogue reach the walk only this
 * way — Callout's six and FilterBar's four — and without the fallback all ten would
 * leave it without being measured and without saying so. Thirteen did before #568
 * gave SearchField's meta a render of its own.
 */
const found = files.flatMap((file) => {
  const mod = modules[file];
  const def = mod.default || {};
  const Component = def.component;
  const fallback = typeof Component === 'function'
    ? (args: unknown) => <Component {...(args as never)} />
    : undefined;
  return Object.entries(mod)
    .filter(([name, s]) => name !== 'default' && s && typeof s === 'object')
    .map(([name, s]) => ({
      id: `${file}:${name}`,
      render: (s as Story).render || def.render || fallback,
      args: { ...def.args, ...(s as Story).args },
    }))
    .filter((s) => typeof s.render === 'function');
});

/** Every story export, reachable or not, so the walk can be held to the catalogue. */
const exported = files.flatMap((file) => Object.entries(modules[file])
  .filter(([name, s]) => name !== 'default' && s && typeof s === 'object')
  .map(([name]) => `${file}:${name}`));

afterEach(cleanup);

// ---- the walk -------------------------------------------------------------

/** One entry per (story × theme) cell, so a cell that measured nothing is visible. */
const cells: { id: string; fields: number }[] = [];
const readings: Record<Theme, Reading[]> = { dark: [], light: [] };
const bodyPaint: Record<string, string> = {};

describe('field ground: React stories', () => {
  for (const theme of THEMES) {
    for (const story of found) {
      it(`${story.id} [${theme}]`, () => {
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
        readings[theme].push(...mine);
        cells.push({ id: `${id} [${theme}]`, fields: mine.length });

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
    console.log(`field-ground[react]: ${files.length} files, ${found.length} stories × ${THEMES.length} themes`
      + ` = ${cells.length} cells; fields ${THEMES.map((t) => `${t} ${readings[t].length}`).join(', ')}`);
    expect(files.length, 'story files discovered').toBeGreaterThan(0);
    expect(found.length, 'stories discovered').toBeGreaterThan(0);
    expect(cells.length, `${found.length} stories × ${THEMES.length} themes`)
      .toBe(found.length * THEMES.length);
    // Not a floor: every story the catalogue exports. A story the walk cannot
    // render is a hole in the measurement, and before #568 added the `args`
    // fallback above there were thirteen such holes.
    expect(found.map((s) => s.id).sort(), 'a story the walk could not render')
      .toEqual(exported.sort());
  });

  // An exact count, as the vanilla gate asserts one: a selector that stopped
  // matching, or a story that stopped rendering its field, would otherwise leave
  // the gate green over nothing. Move the number with the specimens that moved.
  //
  // Fields 25, Switch & Checkbox 16, Pagination 5, SearchField 4, Modal 3,
  // Drawer 2, DataTable 1.
  it('found the fields the catalogue renders, in both themes', () => {
    for (const theme of THEMES) {
      expect(readings[theme].length, `${theme}: field discovery changed; update the count`
        + ' with the specimens that moved').toBe(FIELD_COUNT);
      expect(readings[theme].some((f) => f.disabled), `${theme}: no disabled field reached the walk`)
        .toBe(true);
    }
  });

  // The net names five control kinds and a walk that renders four proves nothing
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
   * that is the part a reader has to read.
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
