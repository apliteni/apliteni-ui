// The guideline pages in React (#429, PR 4): the checks the vanilla guideline gates
// make of the page itself, made of the TSX page. Each one names the vanilla gate it
// stands in for, which keeps reading the vanilla page until that page is removed.
//
// Discover subjects from source and check the coverage count.
// Weaken the rule and confirm that its test fails.
//
// Limits, read before trusting a green run:
//  - JSDOM lays nothing out, so where a specimen lands on screen is the pixel
//    comparison's question, recorded on the pull request, and not this file's.
//  - The page's own sheets are read as text. Which colour stands behind the prose
//    is the vanilla reading-surface gate's measurement; this file holds the
//    structure that measurement depends on: the prose is inside the ground, and
//    the ground's sheet paints the surface.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { storyNameFromExport, toId } from 'storybook/internal/csf';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain JS module
import { splitSelectorList } from '../../scripts/lib/selector-list.js';
// @ts-expect-error -- plain JS story module
import { LINKS } from '../../stories/guidelines/_overview.js';
// @ts-expect-error -- plain JS story module
import { GROUND_CSS } from '../../stories/guidelines/_layout.js';
import { ConfirmPicture, TONE_GLYPH } from '../../stories/_guideline';

type Meta_ = { id?: string; title: string };
type StoryModule = { default: Meta_ } & Record<string, { render: (args: unknown, ctx: unknown) => ReactElement }>;

const modules = import.meta.glob<StoryModule>('../../stories/guidelines/*.stories.tsx', { eager: true });
const files = Object.keys(modules).sort();
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const pages = files.map(file => {
  const mod = modules[file];
  const [name, story] = Object.entries(mod).find(([key]) => key !== 'default')!;
  return { file, id: toId(mod.default.id ?? mod.default.title, storyNameFromExport(name)), story };
});
// Every element a page uses as a stage for its specimens.
const STAGE = '.gl-stage, .gp-stage, .gs-stage, .gda-stage, .gc-stage, .gd-frame, .gf-panel, .gf-frame';
const mount = (page: typeof pages[number]) => render(page.story.render({}, {})).container;

// The words a page shows, without its sheets.
const prose = (root: Element) => {
  const copy = root.cloneNode(true) as Element;
  copy.querySelectorAll('style').forEach(el => el.remove());
  return copy.textContent ?? '';
};

describe('guideline pages in React: the collection', () => {
  it('finds every guideline page, the Overview included', () => {
    expect(files.length, 'update the count when a guideline page is added').toBe(27);
  });

  // Stands in for stories/guidelines/overview.test.js: every page keeps the id its
  // links were built on, and the Overview links each one.
  it('keeps the id of every page the Overview links, and adds none', () => {
    const linked = (LINKS as { href: string }[]).map(link => link.href.split('/story/')[1]);
    const ids = pages.map(page => page.id).filter(id => id !== 'guidelines-overview--overview');
    expect([...ids].sort()).toEqual([...linked].sort());
  });

  // Stands in for refs.test.js "Storybook renders each Markdown page title".
  it('renders the title of its Markdown document as the one h1', () => {
    const titles = new Set(Object.values(import.meta.glob<string>('../../guidelines/*.md', { eager: true, query: '?raw', import: 'default' }))
      .map(text => /^# (.+)$/m.exec(text)![1]));
    for (const page of pages) {
      const root = mount(page);
      // A specimen may draw a screen's own h1, as the hero success does; the page's is outside every stage.
      const h1s = [...root.querySelectorAll('h1')].filter(h1 => !h1.parentElement?.closest(STAGE));
      expect(h1s.length, `${page.file}: one h1`).toBe(1);
      expect(titles.has(h1s[0].textContent!), `${page.file}: no Markdown has the title "${h1s[0].textContent}"`).toBe(true);
    }
  });
});

// Stands in for refs.test.js "all Storybook guideline prose is free of source references".
const SOURCE_REFERENCE = /(?:\b(?:src|stories|react|docs)\/|\b[\w-]+\.(?:css|[cm]?js|tsx?|md)(?::\d+)?\b)/;
describe('guideline pages in React: no source references in what a page shows', () => {
  it.each(pages.map(page => [page.file, page] as const))('%s', (_, page) => {
    expect(prose(mount(page))).not.toMatch(SOURCE_REFERENCE);
  });
  it('the check reports a path written into the prose', () => {
    const { container } = render(<p>Read src/styles/confirm.css first.</p>);
    expect(prose(container)).toMatch(SOURCE_REFERENCE);
  });
});

/* Stands in for destructive-actions.test.js "no page-layout rule reaches inside a
 * specimen", and for every page rather than one. The page's own layout lives in the
 * `.gc` namespace and the `.gl` namespace is the specimen furniture, so nothing
 * named `.gc` may match an element inside a stage: `.gc h2` once did, and the page
 * showed its own heading type where it claimed to show the component's. */
const selectorsIn = (css: string) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{[^{}]*\}/g)]
  .flatMap(m => splitSelectorList(m[1]) as string[])
  .map(s => s.trim().replace(/::?(?:before|after|placeholder|marker)\b/g, ''))
  .filter(Boolean);
const reachingIn = (root: Element) => {
  const css = [...root.querySelectorAll('style')].map(el => el.textContent).join('\n');
  const pageRules = selectorsIn(css).filter(sel => /\.gc(?![\w-])|\.gc-(?!stage)[\w-]+/.test(sel));
  const problems: string[] = [];
  for (const sel of pageRules) {
    let found: Element[] = [];
    try { found = [...root.querySelectorAll(sel)]; } catch { continue; }
    // Strictly inside: a page rule may place the stage itself, not what it holds.
    for (const el of found) if (el.parentElement?.closest(STAGE)) problems.push(`${sel} → <${el.localName} class="${el.className}">`);
  }
  return { pageRules, problems };
};
describe('guideline pages in React: page layout stays out of the specimens', () => {
  // The Overview is an index with no rule layout, so it has no .gc rules to hold.
  it.each(pages.filter(page => !page.file.endsWith('/Overview.stories.tsx')).map(page => [page.file, page] as const))('%s', (_, page) => {
    const { pageRules, problems } = reachingIn(mount(page));
    expect(pageRules.length, 'no .gc rules found: has the page namespace been renamed?').toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });
  it('the check reports a page rule that styles a heading inside a stage', () => {
    const { container } = render(<div>
      <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: '<style>.gc h2 { color: red; }</style>' }} />
      <div className="gc"><div className="gl-stage"><h2>Inside</h2></div></div>
    </div>);
    expect(reachingIn(container).problems).toHaveLength(1);
  });
});

/* Stands in for destructive-actions.test.js "the specimen measure is the confirm
 * component's own declared width", which pins the vanilla confirm. The React page
 * draws the React Confirm, which is a Modal, so what is held here is that the
 * picture is drawn from the Modal's own classes: rename one there and this fails. */
describe('guideline pages in React: the confirm picture is the Modal', () => {
  const modal = read('./Modal.tsx');
  const declared = new Set([...modal.matchAll(/\brx-modal(?:__[\w-]+)?\b/g)].map(m => m[0]));
  it('reads the Modal parts it compares against', () => {
    expect([...declared].sort()).toEqual(['rx-modal', 'rx-modal__body', 'rx-modal__foot', 'rx-modal__head', 'rx-modal__title']);
  });
  it('draws only classes the Modal writes, and all of them', () => {
    const { container } = render(<ConfirmPicture title="Delete?" body="It goes." cancelLabel="Keep" confirmLabel="Delete" />);
    const drawn = new Set([...container.querySelectorAll('[class]')].flatMap(el => [...el.classList]).filter(name => name.startsWith('rx-')));
    expect([...drawn].sort()).toEqual([...declared].sort());
  });
});

// The notice picture has no component to read, so its glyphs are held to the Toast's own table.
describe('guideline pages in React: the notice picture is the Toast', () => {
  it('draws each tone with the glyph the Toast draws it with', () => {
    const table = /const glyphs = (\{[^}]*\})/.exec(read('./Toast.tsx'));
    expect(table, 'Toast.tsx no longer names its glyphs in one table').toBeTruthy();
    expect(Object.fromEntries([...table![1].matchAll(/(\w+): '(\w+)'/g)].map(m => [m[1], m[2]]))).toEqual(TONE_GLYPH);
  });
});

/* Stands in for density-and-accents.test.js: the Follow-the-consequence pair keeps
 * one card order and moves only the emphasis. Found by its rule id, so a renamed or
 * removed rule fails here instead of passing by finding nothing. */
describe('guideline pages in React: Density and accents', () => {
  const page = pages.find(p => p.file.endsWith('/DensityAndAccents.stories.tsx'))!;
  const panels = () => {
    const section = mount(page).querySelector('[data-rule="follow-the-consequence"]');
    expect(section, 'no rule "follow-the-consequence" on the page: the gate is checking nothing').toBeTruthy();
    return [...section!.querySelectorAll('[data-specimen]')].map(cell => {
      const grid = cell.querySelector('.gda-panes')!;
      return {
        kind: cell.getAttribute('data-specimen'),
        wide: [...grid.classList].find(c => c.endsWith('-wide')),
        cards: [...grid.children].map(card => ({
          title: card.querySelector('.ui-card__title')?.textContent?.trim(),
          accent: card.classList.contains('gda-pane--accent'),
        })),
      };
    });
  };
  it('the Do accents the saved pane and the Dont accents the source, in one card order', () => {
    const [doSide, dontSide] = panels();
    for (const side of [doSide, dontSide]) {
      expect(side.cards.map(c => c.title)).toEqual(['Extracted fields', 'Source document']);
      expect(side.cards.filter(c => c.accent)).toHaveLength(1);
    }
    expect([doSide.kind, doSide.wide, doSide.cards.find(c => c.accent)!.title]).toEqual(['do', 'gda-panes--saved-wide', 'Extracted fields']);
    expect([dontSide.kind, dontSide.wide, dontSide.cards.find(c => c.accent)!.title]).toEqual(['dont', 'gda-panes--source-wide', 'Source document']);
  });
});

/* The Chart and Table switch replaces one view with the other, so it is a tab strip:
 * each tab controls a panel that names it back, and only the chosen panel shows.
 * Found by its rule id. JSDOM applies no sheet, so the underline look is the
 * pixel comparison's question, not this file's. */
describe('guideline pages in React: Dashboards and reports', () => {
  const page = pages.find(p => p.file.endsWith('/DashboardsAndReports.stories.tsx'))!;
  const block = () => {
    const section = mount(page).querySelector('[data-rule="chart-table-switch"]');
    expect(section, 'no rule "chart-table-switch" on the page: the gate is checking nothing').toBeTruthy();
    return section!.querySelector('[data-specimen="do"] .ui-card')!;
  };
  const state = (card: Element) => [...card.querySelectorAll('[role="tab"]')].map(tab => {
    const panel = card.querySelector(`#${CSS.escape(tab.getAttribute('aria-controls') ?? '')}`);
    return {
      tab: tab.textContent, selected: tab.getAttribute('aria-selected'),
      panel: panel?.getAttribute('role'), labelledBy: panel?.getAttribute('aria-labelledby') === tab.id,
      shown: panel ? !panel.hidden : null, table: !!panel?.querySelector('table'), chart: !!panel?.querySelector('svg'),
    };
  });
  it('each tab controls a panel labelled by it, and Chart opens first', () => {
    const card = block();
    expect(card.querySelectorAll('[role="tablist"]')).toHaveLength(1);
    expect(state(card)).toEqual([
      { tab: 'Chart', selected: 'true', panel: 'tabpanel', labelledBy: true, shown: true, table: false, chart: true },
      { tab: 'Table', selected: 'false', panel: 'tabpanel', labelledBy: true, shown: false, table: false, chart: false },
    ]);
  });
  it('choosing Table shows the table panel and hides the chart', () => {
    const card = block();
    fireEvent.click(card.querySelectorAll('[role="tab"]')[1]);
    expect(state(card).map(s => [s.tab, s.selected, s.shown, s.table, s.chart])).toEqual([
      ['Chart', 'false', false, false, false], ['Table', 'true', true, true, false]]);
  });
  it('the arrow key moves the choice and the focus to the next tab', () => {
    const card = block();
    const [chart, table] = card.querySelectorAll<HTMLElement>('[role="tab"]');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect([table.getAttribute('aria-selected'), document.activeElement === table, table.tabIndex, chart.tabIndex]).toEqual(['true', true, 0, -1]);
  });
});

/* Stands in for the structure reading-surface.test.js measures: every carrier of
 * the page's own prose stands inside the reading surface, and that surface's sheet
 * is on the page and paints it. */
const PROSE = 'h1, .gc-imperative, .gc-why, .gc-cell__cap, .gc-except, .gc-unmet, .gi-list';
const offGround = (root: Element) => [...root.querySelectorAll(PROSE)]
  .filter(el => !el.closest('.gl-page')).map(el => `<${el.localName} class="${el.className}">`);
describe('guideline pages in React: the prose stands on the reading surface', () => {
  it('the ground sheet paints the reading surface', () => {
    expect(GROUND_CSS).toMatch(/\.gl-page\s*\{[^}]*background:\s*var\(--surface\)/);
  });
  it.each(pages.map(page => [page.file, page] as const))('%s', (_, page) => {
    const root = mount(page);
    expect(root.querySelectorAll(PROSE).length, 'the page writes no prose this gate knows').toBeGreaterThan(0);
    expect(offGround(root)).toEqual([]);
    expect([...root.querySelectorAll('style')].some(el => el.textContent === GROUND_CSS.trim() || el.textContent!.includes('.gl-page {')),
      'the ground sheet is not on the page').toBe(true);
  });
  it('the check reports prose that leaves the ground', () => {
    const { container } = render(<div><div className="gl-page" /><h2 className="gc-imperative">Loose</h2></div>);
    expect(offGround(container)).toHaveLength(1);
  });
});
