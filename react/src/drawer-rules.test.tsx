// Drawer separators without borders around content, on the React stories. The React
// half of stories/drawer-rules.test.js (#429), over the same reading in
// stories/lib/drawer-rules.js. Every React story is mounted for real, so a drawer that
// is open portals into the document and is measured with the rest; a guideline's static
// picture of the React Drawer is measured as the drawer it shows.
/* Coverage limits: consumer content outside this repository is not rendered here. Border
 * presence is checked; group spacing, line weight and colour are not. Shadows, outlines
 * and pseudo-elements are not read as lines. Logical borders assume horizontal,
 * left-to-right writing. */
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { DrawerPicture } from '../../stories/_guideline';
// @ts-expect-error -- shared, independently tested JS modules.
import { kitCssFor, substitute, desugar } from '../../stories/lib/contrast.js';
// @ts-expect-error -- shared, independently tested JS modules.
import { FAULTS, measure, physical } from '../../stories/lib/drawer-rules.js';

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
type Measured = { where: string; cards: string[]; ruledRows: string[]; footerCount: number; footerFills: string[]; unframed: string[]; strayEdges: string[]; unparted: string[] };
const modules = import.meta.glob<StoryModule>(['./**/*.stories.tsx', '../../stories/**/*.stories.tsx'], { eager: true });

const THEMES = ['dark', 'light'];
// The drawer panels the catalogue renders in each theme: set them to the count the failure
// prints once a change is meant. The shell draws the same drawer in every story that has a
// shell, so one of them stands for all.
const EXPECTED = { subjects: 9, donts: 3 };

function walk(theme: string) {
  const { vars, css } = kitCssFor(theme);
  const sheet = document.head.appendChild(document.createElement('style'));
  sheet.textContent = physical(css);
  document.documentElement.setAttribute('data-theme', theme);
  const subjects: Measured[] = [];
  const donts: Measured[] = [];
  const problems: string[] = [];
  let shellSeen = false;
  const measureAll = (where: string) => {
    for (const panel of document.querySelectorAll('.ui-drawer__panel')) {
      if (panel.closest('.ui-app__drawer')) {
        if (shellSeen) continue;
        shellSeen = true;
      }
      const m = measure(window, panel, where);
      (panel.closest('[data-specimen="dont"]') ? donts : subjects).push(m);
    }
  };
  for (const file of Object.keys(modules).sort()) {
    const mod = modules[file];
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = (story as Story).render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...(story as Story).args };
      const StoryRender = () => render(args, { globals: { theme }, args });
      const host = document.body.appendChild(document.createElement('div'));
      const reactRoot = createRoot(host);
      try {
        act(() => reactRoot.render(<StoryRender />));
      } catch (err) {
        problems.push(`${file}:${name} [${theme}] → render threw: ${(err as Error)?.message}`);
        act(() => reactRoot.unmount()); host.remove();
        continue;
      }
      // A story's own <style> rules are read with the kit's, logical borders made physical.
      for (const own of document.body.querySelectorAll('style')) own.textContent = desugar(physical(substitute(own.textContent ?? '', vars)));
      measureAll(`${file}:${name} [${theme}]`);
      act(() => reactRoot.unmount());
      host.remove();
    }
  }
  const faults = (FAULTS as { fault: string; kind: keyof Measured; css?: string; body?: string }[]).map(({ fault, kind, css: rule = '', body = '<p>Body</p>' }) => {
    const box = document.body.appendChild(document.createElement('div'));
    box.innerHTML = `<style>${desugar(physical(substitute(rule, vars)))}</style><div class="zz-fault">${renderToStaticMarkup(
      <DrawerPicture title="Fault" footer={<button type="button">Done</button>}><div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: desugar(physical(substitute(body, vars))) }} /></DrawerPicture>)}</div>`;
    const panels = [...box.querySelectorAll('.ui-drawer__panel')];
    const found = panels.length ? (measure(window, panels[0], fault)[kind] as unknown[]).length : 0;
    box.remove();
    return { fault, kind, panels: panels.length, found };
  });
  sheet.remove();
  return { subjects, donts, problems, faults };
}

for (const theme of THEMES) {
  describe(`drawers [${theme}]`, () => {
    const { subjects, donts, problems, faults } = walk(theme);

    it('every story renders, and every drawer in it is found', () => {
      expect(problems, 'a story could not be rendered, so its drawers were never measured').toEqual([]);
      expect(subjects.length, 'drawer panels measured as subjects').toBe(EXPECTED.subjects);
      expect(donts.length, 'drawer panels measured as don\'ts').toBe(EXPECTED.donts);
    });

    it('no drawer holds a card, or a box of its own', () => {
      expect(subjects.flatMap((s) => s.cards.map((p) => `${s.where}  ${p}`))).toEqual([]);
    });

    it('no row inside a drawer is ruled, and no drawer holds an <hr>', () => {
      expect(subjects.flatMap((s) => s.ruledRows.map((p) => `${s.where}  ${p}`))).toEqual([]);
    });

    it('drawer footers share the panel surface', () => {
      expect(subjects.reduce((n, s) => n + s.footerCount, 0), 'measured at least one footer').toBeGreaterThan(0);
      expect(subjects.flatMap((s) => s.footerFills.map((p) => `${s.where} ${p}`))).toEqual([]);
    });

    it('every drawer is framed: a header line, no footer or body rules', () => {
      expect(subjects.flatMap((s) => [...s.unframed, ...s.strayEdges].map((e) => `${s.where}  ${e}`))).toEqual([]);
    });

    it('one line parts each group from the group above it', () => {
      expect(subjects.flatMap((s) => s.unparted.map((p) => `${s.where}  ${p}`))).toEqual([]);
    });

    it('the gate can see every fault: the guideline don\'ts and one of each written on purpose', () => {
      expect(donts.some((d) => d.cards.length > 0), 'no don\'t specimen was measured holding a card').toBe(true);
      expect(donts.some((d) => d.ruledRows.length > 0), 'no don\'t specimen was measured with a ruled row').toBe(true);
      expect(faults.filter((f) => f.panels !== 1 || f.found === 0).map((f) => `${f.fault}: ${f.panels} panel(s) rendered, ${f.found} ${f.kind} found`)).toEqual([]);
    });
  });
}
