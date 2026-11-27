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
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent, render } from '@testing-library/react';
import { storyNameFromExport, toId } from 'storybook/internal/csf';
import { afterAll, describe, expect, it } from 'vitest';
// @ts-expect-error -- plain JS module
import { splitSelectorList } from '../../scripts/lib/selector-list.js';
// @ts-expect-error -- plain JS story module
import { LINKS } from '../../stories/guidelines/_overview.js';
// @ts-expect-error -- plain JS story module
import { GROUND_CSS, SPEC_CSS } from '../../stories/guidelines/_layout.js';
import { ConfirmPicture, DrawerPicture, TONE_GLYPH } from '../../stories/_guideline';

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
// Mounting the pages is this file's slowest part, and four checks only read every page.
// They share one mount of each page, outside the document, so a check that clicks or
// focuses still mounts its own.
const unmounts: (() => void)[] = [];
const mounted = new Map<string, Element>();
const view = (page: typeof pages[number]) => {
  if (!mounted.has(page.file)) {
    const host = document.createElement('div');
    const root = createRoot(host);
    act(() => root.render(page.story.render({}, {})));
    unmounts.push(() => act(() => root.unmount()));
    mounted.set(page.file, host);
  }
  return mounted.get(page.file)!;
};
afterAll(() => unmounts.forEach(unmount => unmount()));

// The words a page shows, without its sheets.
const prose = (root: Element) => {
  const copy = root.cloneNode(true) as Element;
  copy.querySelectorAll('style').forEach(el => el.remove());
  return copy.textContent ?? '';
};

describe('guideline pages in React: the collection', () => {
  it('finds every guideline page, the Overview included', () => {
    expect(files.length, 'update the count when a guideline page is added').toBe(34); // 34: Task list and Notification email added (#866).
  });

  // Stands in for stories/guidelines/overview.test.js: every page keeps the id its
  // links were built on, and the Overview links each one.
  it('keeps the id of every page the Overview links, and adds none', () => {
    const linked = (LINKS as { href: string }[]).map(link => link.href.split('/story/')[1]);
    const ids = pages.map(page => page.id).filter(id => id !== 'guidelines-overview--overview');
    expect([...ids].sort()).toEqual([...linked].sort());
  });

});

// Stands in for refs.test.js "Storybook renders each Markdown page title".
describe('guideline pages in React: the title of its Markdown document is the one h1', () => {
  const titles = new Set(Object.values(import.meta.glob<string>('../../guidelines/*.md', { eager: true, query: '?raw', import: 'default' }))
    .map(text => /^# (.+)$/m.exec(text)![1]));
  it.each(pages.map(page => [page.file, page] as const))('%s', (_, page) => {
    const root = view(page);
    // A specimen may draw a screen's own h1, as the hero success does; the page's is outside every stage.
    const h1s = [...root.querySelectorAll('h1')].filter(h1 => !h1.parentElement?.closest(STAGE));
    expect(h1s.length, 'one h1').toBe(1);
    expect(titles.has(h1s[0].textContent!), `no Markdown has the title "${h1s[0].textContent}"`).toBe(true);
    // A screen reader goes to the page's content by its main landmark.
    expect(root.querySelectorAll('main').length, 'one main').toBe(1);
    expect(h1s[0].closest('main'), 'the h1 is outside main').toBeTruthy();
  });
});

// Stands in for refs.test.js "all Storybook guideline prose is free of source references".
const SOURCE_REFERENCE = /(?:\b(?:src|stories|react|docs)\/|\b[\w-]+\.(?:css|[cm]?js|tsx?|md)(?::\d+)?\b)/;
describe('guideline pages in React: no source references in what a page shows', () => {
  it.each(pages.map(page => [page.file, page] as const))('%s', (_, page) => {
    expect(prose(view(page))).not.toMatch(SOURCE_REFERENCE);
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
    const { pageRules, problems } = reachingIn(view(page));
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

/* A readout under a specimen wraps at 390px, so its lines need leading and its dot
 * must sit on the first line. Limit: this reads the declarations, not layout. The
 * wrap itself was measured in a browser at 390px (#766). */
describe('guideline pages in React: a readout that wraps', () => {
  const block = (sel: string) => new RegExp(`${sel} \\{([^}]*)\\}`).exec(SPEC_CSS)?.[1] ?? '';
  it('keeps its dot centred on the first line', () => {
    const cursor = block('\\.gl-cursor'), dot = block('\\.gl-cursor::before');
    expect(cursor, 'no .gl-cursor rule found').not.toBe('');
    expect(cursor).toMatch(/align-items:\s*flex-start/);
    const leading = Number(/font:[^;]*\/([\d.]+)\s/.exec(cursor)?.[1]);
    expect(leading, 'a wrapped readout needs leading').toBeGreaterThan(1);
    expect(dot).toContain(`margin-top: calc((${leading}em - 7px) / 2)`);
  });
});

/* The clipped readout (Prefer above the mark) clamps to its clip's own width,
 * not to 100vw, which counts a vertical scrollbar the clip's box does not. The
 * clip is a size container, so 100cqw is the width behind its inset. Limit: this
 * reads the declarations, not layout; the clip itself was measured in a browser
 * at 360x800 with a classic 15px scrollbar. */
describe('guideline pages in React: the clipped readout clamps to its box', () => {
  const hover = read('../../stories/guidelines/_hover-readouts.js');
  it('makes the clip a size container and clamps the readout to its content width', () => {
    expect(hover).toMatch(/\.gh-clip\s*\{[^}]*container-type:\s*inline-size/);
    expect(hover).toMatch(/\.gh-clip\s+\.gh-host\s+\.ui-tip\s*\{[^}]*max-width:\s*100cqw/);
    expect(hover).toMatch(/calc\(100cqw\s*-\s*var\(--ui-tip-x\)\s*-\s*100%\)/);
  });
  it('rejects a clamp read from the viewport instead of the box', () => {
    const clamped = hover.replace(/\bmax-width:\s*100cqw\b/, 'max-width: calc(100vw - var(--space-10) * 2 - var(--space-3) * 2)');
    expect(clamped).not.toBe(hover);
    expect(clamped).not.toMatch(/max-width:\s*100cqw/);
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

/* The session-ended pair is a page fragment, not an application shell. The dialog
 * stays over that fragment, so the reader can see where work continues in a cell. */
describe('guideline pages in React: Session expired', () => {
  const page = pages.find(p => p.file.endsWith('/SessionExpired.stories.tsx'))!;
  it('keeps the sign-in dialog over a page-only picture', () => {
    const doSide = mount(page).querySelector('[data-rule="sign-in-same-page"] [data-specimen="do"]')!;
    const picture = doSide.querySelector('.se-page')!;
    const dialog = picture.querySelector('.se-page__dialog .rx-modal');
    expect(picture, 'the session picture has no page area').toBeTruthy();
    expect(picture).toHaveClass('se-page--dialog-tall');
    expect(doSide.querySelector('.ui-app'), 'a specimen must not compress the full application shell').toBeNull();
    expect(picture.querySelector('.se-page__title')?.textContent).toBe('Payouts');
    expect(picture.querySelectorAll('.ui-skel').length).toBeGreaterThan(1);
    expect(picture.querySelector('.se-page__scrim')).toBeTruthy();
    expect(dialog, 'the dialog must be inside the page picture').toBeTruthy();
    expect(dialog).toHaveClass('rx-modal--sm');
    expect([...dialog!.querySelectorAll('button')].some(button => button.textContent?.includes('Continue with Google'))).toBe(true);
    expect(dialog?.querySelector('input[type="email"]')).toBeTruthy();
    expect(dialog?.querySelector('input[type="password"]')).toBeTruthy();
  });
  it('keeps an empty page frame behind the shell-and-title Don\'t dialog', () => {
    const dontSide = mount(page).querySelector('[data-rule="skeleton-behind-dialog"] [data-specimen="dont"]')!;
    const picture = dontSide.querySelector('.se-page')!;
    expect(picture).toBeTruthy();
    expect(picture).toHaveClass('se-page--dialog-tall');
    expect(picture.querySelector('.se-page__scrim')).toBeTruthy();
    expect(picture.querySelector('.se-page__dialog .rx-modal')).toHaveClass('rx-modal--sm');
    expect(picture.querySelector('.se-page__title')).toBeNull();
    expect(picture.querySelector('.ui-skel')).toBeNull();
  });
});

/* The drawer picture's panel is the Drawer's own div: an aside with the group role is
 * a role axe refuses. A body that scrolls is a named keyboard stop, so End scrolls it,
 * and a body that fits is no stop.
 * Limits: JSDOM lays nothing out, so the heights are stubbed. Which bodies scroll at
 * which width is the browser measurement on the pull request. */
describe('guideline pages in React: the drawer picture', () => {
  const picture = () => render(<DrawerPicture title="Northwind Payments">Rows</DrawerPicture>).container;
  it('draws its panel as a div group named by the title', () => {
    const panel = picture().querySelector('.ui-drawer__panel')!;
    expect(panel.localName).toBe('div');
    expect(panel).toHaveAttribute('role', 'group');
    expect(panel).toHaveAccessibleName('Northwind Payments');
  });
  it('makes a body that scrolls a named stop, and a body that fits none', () => {
    const fits = picture().querySelector('.ui-drawer__body')!;
    expect(fits).not.toHaveAttribute('tabindex');
    expect(fits).not.toHaveAttribute('role');
    const proto = HTMLElement.prototype;
    Object.defineProperty(proto, 'scrollHeight', { configurable: true, get: () => 900 });
    Object.defineProperty(proto, 'clientHeight', { configurable: true, get: () => 300 });
    try {
      const scrolls = picture().querySelector('.ui-drawer__body')!;
      expect(scrolls).toHaveAttribute('tabindex', '0');
      expect(scrolls).toHaveAttribute('role', 'group');
      expect(scrolls).toHaveAccessibleName('Northwind Payments, body');
    } finally {
      Reflect.deleteProperty(proto, 'scrollHeight');
      Reflect.deleteProperty(proto, 'clientHeight');
    }
  });
});

/* The menu column in the Component choice drawer fills the panel, as the shell's own menu
 * drawer has it. At its own 216px it was wider than the panel at 360 and 390, and the
 * body scrolled sideways.
 * Limits: the sheets are read as text. The width in a browser is the measurement on the
 * pull request. */
describe('guideline pages in React: Component choice', () => {
  const page = pages.find(p => p.file.endsWith('/ComponentChoice.stories.tsx'))!;
  it('fills the drawer panel with the menu column, as the shell menu does', () => {
    const fill = /\.ui-nav--side\s*,\s*[^{]*\.ui-nav--side\s*>\s*\*\s*\{\s*width:\s*100%;?\s*\}/;
    expect(read('./AppShell.css'), 'the shell menu no longer fills its drawer this way').toMatch(fill);
    const root = mount(page);
    expect(root.querySelector('.gl-component-choice__under .ui-nav--side'), 'no menu in a drawer: the gate is checking nothing').toBeTruthy();
    const sheet = [...root.querySelectorAll('style')].map(el => el.textContent).join('\n');
    expect(sheet).toMatch(/\.gl-component-choice__under \.ui-nav--side,\.gl-component-choice__under \.ui-nav--side>\*\{width:100%;\}/);
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
      expect(side.cards.map(c => c.title)).toEqual(['Extracted fields', 'Document preview']);
      expect(side.cards.filter(c => c.accent)).toHaveLength(1);
    }
    expect([doSide.kind, doSide.wide, doSide.cards.find(c => c.accent)!.title]).toEqual(['do', 'gda-panes--saved-wide', 'Extracted fields']);
    expect([dontSide.kind, dontSide.wide, dontSide.cards.find(c => c.accent)!.title]).toEqual(['dont', 'gda-panes--source-wide', 'Document preview']);
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

  // #867: the block's Chart and Table switch keeps the neutral form, the way the
  // Chart component's own switch draws — the neutral form is the default, so a view
  // switch stays off the page's accent.
  it('the block switch keeps the neutral form, not the accent', () => {
    const strip = block().querySelector('[role="tablist"]');
    expect(strip).not.toHaveClass('ui-seg--accent');
  });

  // #863: the switch rule's cards sit inside the rule's own h2 section, so their
  // titles are h3, one level under it (Labels and titles, heading levels).
  it('the chart-table-switch card titles are headings one level under the rule', () => {
    const section = mount(page).querySelector('[data-rule="chart-table-switch"]');
    expect(section, 'no rule "chart-table-switch" on the page: the gate is checking nothing').toBeTruthy();
    const titles = [...section!.querySelectorAll('[data-specimen] .ui-card__title')];
    expect(titles.map(t => t.tagName.toLowerCase()), 'one card title per specimen block')
      .toEqual(['h3', 'h3', 'h3']);
  });

  // #863: the two new bar-label cards sit inside the rule's own h2 section, so
  // their titles are h3, one level under it (Labels and titles, heading levels).
  it('the bar-labels cards are headings one level under the rule', () => {
    const section = mount(page).querySelector('[data-rule="bar-labels-distinct"]');
    expect(section, 'no rule "bar-labels-distinct" on the page: the gate is checking nothing').toBeTruthy();
    const titles = [...section!.querySelectorAll('[data-specimen] .ui-card__title')];
    expect(titles.map(t => t.tagName.toLowerCase()), 'one card title per specimen half').toEqual(['h3', 'h3']);
  });

  // #863: the four wide ledgers scroll sideways, so each gets the kit's keyboard
  // stop: a named, focusable region (Accessibility minimums, keyboard first).
  // #863 P3: each region also carries a distinct name, so a reader listing the
  // landmarks can tell one Sales ledger from the next (landmark-unique).
  it('gives every wide ledger a distinct named keyboard stop', () => {
    const frames = [...mount(page).querySelectorAll('.ui-table-scroll')]
      .filter(frame => frame.querySelector('table thead th')?.textContent?.trim() === 'Reference');
    expect(frames.length, 'four ledger scroll regions on the page').toBe(4);
    for (const frame of frames) {
      expect(frame.getAttribute('role')).toBe('region');
      expect(frame.getAttribute('tabindex')).toBe('0');
    }
    expect(frames.map(frame => frame.getAttribute('aria-label')).sort(), 'each ledger names itself distinctly')
      .toEqual(['Sales ledger', 'Sales report rows', 'Sales with filters', 'Sales, 2026'].sort());
  });

  // #863 P3: the repeated bar-label, rows, line and months charts name themselves
  // distinctly, so a reader listing the landmarks can tell one specimen from the next.
  it('names every repeated specimen chart distinctly', () => {
    const names = [...mount(page).querySelectorAll('[role="group"][aria-label]')]
      .map(group => group.getAttribute('aria-label')!);
    const repeats = names.filter(name => /^(Spend against estimate|Revenue against expenses|Net by region, six (?:bars|rows)|Net settled by month, first (?:half of the year|four months of the year)), /.test(name));
    // Fifteen since the trend-in-head pair added two net-settled charts.
    expect(repeats.length, 'the repeated charts the page draws').toBe(15);
    expect(new Set(repeats).size, 'no two repeated charts share a name').toBe(15);
  });
});

/* The Hover readouts specimens stand inside each rule's own h2 section, so their
 * six card titles are h3, one level under it (Labels and titles, heading levels). */
describe('guideline pages in React: Hover readouts', () => {
  const page = pages.find(p => p.file.endsWith('/HoverReadouts.stories.tsx'))!;
  it('the specimen cards are headings one level under the rule', () => {
    const titles = [...mount(page).querySelectorAll('[data-specimen] .ui-card__title')];
    expect(titles.length, 'six specimen cards on the page').toBe(6);
    expect(titles.map(t => t.tagName.toLowerCase()), 'each card title is an h3')
      .toEqual(Array(6).fill('h3'));
  });
});

/* Stands in for the structure reading-surface.test.js measures: every carrier of
 * the page's own prose stands inside the reading surface, and that surface's sheet
 * is on the page and paints it. */
const PROSE = 'h1, .gc-imperative, .gc-why, .gc-cell__cap, .gc-except, .gc-unmet, .gi-pages';
const offGround = (root: Element) => [...root.querySelectorAll(PROSE)]
  .filter(el => !el.closest('.gl-page')).map(el => `<${el.localName} class="${el.className}">`);
describe('guideline pages in React: the prose stands on the reading surface', () => {
  it('the ground sheet paints the reading surface', () => {
    expect(GROUND_CSS).toMatch(/\.gl-page\s*\{[^}]*background:\s*var\(--surface\)/);
  });
  it.each(pages.map(page => [page.file, page] as const))('%s', (_, page) => {
    const root = view(page);
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

/* The overflow Do promises December in view. The web fonts widen the table after the
 * first scroll, so the frame scrolls to its end again once the fonts are ready.
 * Limits: JSDOM lays nothing out, so the widths are stubbed. Whether December is in
 * view in a real browser is the measurement on the pull request. */
describe('guideline pages in React: Dense tables', () => {
  const page = pages.find(p => p.file.endsWith('/DenseTables.stories.tsx'))!;
  it('scrolls the overflow Do to its end again after the fonts load', async () => {
    let width = 400;
    const left = new WeakMap<Element, number>();
    const proto = HTMLElement.prototype;
    const fonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    let loaded!: () => void;
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise<void>(r => { loaded = r; }) } });
    Object.defineProperty(proto, 'scrollWidth', { configurable: true, get: () => width });
    Object.defineProperty(proto, 'scrollLeft', { configurable: true,
      get() { return left.get(this) ?? 0; }, set(value: number) { left.set(this, value); } });
    try {
      const frame = mount(page).querySelector('[data-rule="overflow"] [data-specimen="do"] .ui-table-scroll');
      expect(frame, 'no scroll frame in the overflow Do: the gate is checking nothing').toBeTruthy();
      expect(frame!.scrollLeft).toBe(400);
      width = 463;
      loaded();
      await document.fonts.ready;
      await Promise.resolve();
      expect(frame!.scrollLeft).toBe(463);
    } finally {
      Reflect.deleteProperty(proto, 'scrollWidth');
      Reflect.deleteProperty(proto, 'scrollLeft');
      Reflect.deleteProperty(document, 'fonts');
      if (fonts) Object.defineProperty(document, 'fonts', fonts);
    }
  });
});

/* The easing pair plots each curve it names and draws the drawer at four times. A
 * plot's control points and a frame's offset are read against the brand values, so a
 * changed value fails here. Visibility is discrete: a frame reads hidden at 0 ms and
 * visible after it, never a part value.
 * Limits: JSDOM lays nothing out, so where the panel lands is the pixel comparison's
 * question. CSS `ease` is the spec's curve, not a kit value. */
describe('guideline pages in React: Motion', () => {
  const page = pages.find(p => p.file.endsWith('/Motion.stories.tsx'))!;
  const brand = read('../../src/tokens/brand.generated.css');
  const brandValue = (name: string) => brand.match(new RegExp(`${name}:\\s*([^;]+);`))![1].trim();
  const points = (value: string) => value.match(/cubic-bezier\(([^)]+)\)/)![1].match(/[\d.]+/g)!.map(Number);
  const curves: Record<string, number[]> = {
    '--ease': points(brandValue('--easing-ease-in-out')), '--ease-out': points(brandValue('--easing-ease-out')),
    ease: [0.25, 0.1, 0.25, 1],
  };
  const dur = parseFloat(brandValue('--duration-normal'));
  // Progress of a cubic-bezier at time x, 0 to 1, by bisection on the curve's own x.
  const at = ([x1, y1, x2, y2]: number[], x: number) => {
    const b = (a: number, c: number, t: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * c + t ** 3;
    let lo = 0, hi = 1;
    for (let i = 0; i < 60; i++) { const t = (lo + hi) / 2; if (b(x1, x2, t) < x) lo = t; else hi = t; }
    return b(y1, y2, (lo + hi) / 2);
  };
  const sides = () => {
    const section = mount(page).querySelector('[data-rule="easing"]');
    expect(section, 'no rule "easing" on the page: the gate is checking nothing').toBeTruthy();
    return [...section!.querySelectorAll('[data-specimen]')];
  };
  it('plots each curve it names at the kit value, and linear as a line', () => {
    const plots = sides().map(side => [...side.querySelectorAll('.gm-plot')].map(plot => ({
      name: plot.querySelector('.gm-plot__name')!.textContent!, d: plot.querySelector('path')!.getAttribute('d'),
    })));
    expect(plots.map(side => side.map(p => p.name))).toEqual([['--ease', '--ease-out', 'linear'], ['ease', 'ease']]);
    for (const { name, d } of plots.flat()) {
      const c = curves[name];
      expect(d, name).toBe(c ? `M0 100 C${c[0] * 100} ${100 - c[1] * 100} ${c[2] * 100} ${100 - c[3] * 100} 100 0` : 'M0 100 L100 0');
    }
  });
  it('draws the drawer where its curve has it at each time, and visibility only steps', () => {
    const [doSide, dontSide] = sides();
    for (const [side, curve] of [[doSide, curves['--ease']], [dontSide, curves.ease]] as const) {
      const shots = [...side.querySelectorAll('.gm-shot')].map(shot => {
        const [ms, vis] = [...shot.querySelectorAll('.gm-time')].map(el => el.textContent);
        return { ms: parseFloat(ms!), vis, left: parseFloat((shot.querySelector('.gm-mini') as HTMLElement).style.getPropertyValue('--gm-at')) };
      });
      expect(shots.map(s => s.ms)).toEqual([0, Math.round(dur / 3), Math.round(dur * 2 / 3), dur]);
      expect(shots.map(s => s.vis)).toEqual(['hidden', 'visible', 'visible', 'visible']);
      for (const s of shots) expect(Math.abs(s.left - (1 - at(curve, s.ms / dur)) * 100), `${s.ms} ms`).toBeLessThanOrEqual(1);
    }
  });
  // The hover pair draws the row itself: full in the next frame, or part way along a fade over
  // --dur-fast on --ease. Two tables of timings showed the same rows on both sides. #865 review
  it('fills the hovered row in the next frame, and the faded row part way at each printed time', () => {
    const section = mount(page).querySelector('[data-rule="hover-at-once"]');
    expect(section, 'no rule "hover-at-once" on the page: the gate is checking nothing').toBeTruthy();
    const fast = parseFloat(brandValue('--duration-fast'));
    const [doSide, dontSide] = [...section!.querySelectorAll('[data-specimen]')].map(side => {
      const times = [...side.querySelectorAll('.gm-film > p')].map(p => parseFloat(p.textContent!) || 0);
      const fills = [...side.querySelectorAll('tr.gm-hover')].map(row => Number((row as HTMLElement).style.getPropertyValue('--gm-fill')));
      expect(fills.length, 'a frame without its hovered row').toBe(times.length);
      return times.map((ms, i) => ({ ms, fill: fills[i] }));
    });
    // A frame is still: the live hover would paint over its timed fill under the pointer. #865 review
    const stages = [...section!.querySelectorAll('.gm-film > .gl-stage')];
    expect(stages.length, 'no frame stage found').toBeGreaterThan(0);
    for (const stage of stages) expect(getComputedStyle(stage).pointerEvents, 'a still frame answers the pointer').toBe('none');
    expect(doSide).toEqual([{ ms: 0, fill: 0 }, { ms: 16, fill: 1 }]);
    expect(dontSide.some(f => f.fill > 0 && f.fill < 1), 'the fade shows no frame part way').toBe(true);
    for (const f of dontSide) expect(Math.abs(f.fill - at(curves['--ease'], Math.min(f.ms / fast, 1))), `${f.ms} ms`).toBeLessThanOrEqual(0.01);
  });
});
