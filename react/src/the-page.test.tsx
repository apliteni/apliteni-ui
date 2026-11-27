/* Rule: every screen the kit draws keeps the page rules — the head in one order, one
 * h1, one primary action, one density, nothing overlaying it at load. The React half of
 * stories/guidelines/the-page.test.js (#429): the subjects are the showcase screens the
 * one Storybook serves, the TSX files under stories/apps/ and the React landing page,
 * discovered rather than listed, and every rule owns one check in
 * stories/lib/the-page-checks.js, which both halves run.
 *
 * Each screen is mounted for real and read from a copy of the whole document, so an
 * overlay that opens at load and portals out of the story is on the page it covers. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain JS modules shared with the vanilla gate.
import { RULES, GATED_ELSEWHERE } from '../../stories/guidelines/_the-page.js';
// @ts-expect-error -- plain JS modules shared with the vanilla gate.
import { CHECKS, kindOf, text } from '../../stories/lib/the-page-checks.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;
const modules = {
  ...import.meta.glob<StoryModule>('../../stories/apps/*.stories.tsx', { eager: true }),
  ...import.meta.glob<StoryModule>('./Landing.stories.tsx', { eager: true }),
};
const files = Object.keys(modules).sort();
const repoPath = (file: string) => path.relative(root, path.resolve(path.dirname(fileURLToPath(import.meta.url)), file));

type Screen = { where: string; doc: Document; source: string; file: string; firstOfFile: boolean; kind: string };
const screens: Screen[] = [];
const unrenderable: string[] = [];
for (const file of files) {
  const rel = repoPath(file);
  const mod = modules[file];
  const def = mod.default || {};
  const source = readFileSync(path.join(root, rel), 'utf8');
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || story == null || typeof story !== 'object') continue;
    const render = (story as Story).render || def.render;
    if (typeof render !== 'function') { unrenderable.push(`${rel}:${name}`); continue; }
    const args = { ...def.args, ...(story as Story).args };
    const StoryRender = () => render(args, { globals: {}, args });
    const host = document.body.appendChild(document.createElement('div'));
    const reactRoot = createRoot(host);
    act(() => reactRoot.render(<StoryRender />));
    const doc = document.implementation.createHTMLDocument('screen');
    doc.documentElement.setAttribute('lang', 'en');
    doc.body.innerHTML = document.body.innerHTML;
    act(() => reactRoot.unmount());
    host.remove();
    const firstOfFile = !screens.some((x) => x.file === rel);
    screens.push({ where: `${rel}:${name}`, doc, source, file: rel, firstOfFile, kind: kindOf(doc) });
  }
}

const GATED: { id: string; says: string }[] = [
  ...RULES.map((r: { id: string; imperative: string }) => ({ id: r.id, says: r.imperative })),
  ...GATED_ELSEWHERE.map((r: { id: string; states: string }) => ({ id: r.id, says: r.states })),
];

// The floors are what the tree holds today, not a round number underneath it.
const FOUND = { files: 11, screens: 31, apps: 25, ledes: 15, sidebars: 29, bandEnds: 3 };

describe('the page: React screens', () => {
  it('found the kit’s own screens', () => {
    expect(files.length, 'story files').toBeGreaterThanOrEqual(FOUND.files);
    expect(screens.length, 'screens rendered').toBeGreaterThanOrEqual(FOUND.screens);
    expect(screens.filter((s) => s.kind === 'app').length, 'shell pages').toBeGreaterThanOrEqual(FOUND.apps);
    expect(unrenderable, 'an export beside the stories that publishes no render').toEqual([]);
  });

  it('every page rule owns a check', () => {
    expect(Object.keys(CHECKS).sort()).toEqual(GATED.map((r) => r.id).sort());
  });

  // `lede` only measures a screen that carries one, so this counts them.
  it('the lede checks still reach screens that carry one', () => {
    const carrying = screens.filter((s) => s.kind === 'app' && text(s.doc.querySelector('main.ui-app__main p.ui-app__sub')));
    expect(carrying.length, carrying.map((s) => s.where).join(', ')).toBeGreaterThanOrEqual(FOUND.ledes);
  });

  // `sidebar` only reads a screen that draws one, so this counts them, and a sidebar
  // with both a group label and a sub-item list must fail it.
  it('the sidebar check reaches sidebars and refuses the mix', () => {
    const drawn = screens.filter((s) => s.doc.querySelector('nav.ui-nav--side'));
    expect(drawn.length, 'screens with a sidebar').toBeGreaterThanOrEqual(FOUND.sidebars);
    const doc = document.implementation.createHTMLDocument('mixed');
    doc.body.innerHTML = '<nav class="ui-nav ui-nav--side" aria-label="Sections"><div class="ui-nav__section">'
      + '<div class="ui-nav__cap">Money</div><ul class="ui-nav__list"><li><ul class="ui-nav__sub"></ul></li></ul></div></nav>';
    expect(CHECKS.sidebar({ ...drawn[0], where: 'mixed', doc })).toHaveLength(1);
  });

  // `bar-end` only reads a band with actions, so this counts them, and a worded page
  // button or a third control at the band's end must fail it.
  it('the bar-end check reaches band actions and refuses a page button', () => {
    const drawn = screens.filter((s) => s.doc.querySelector('.ui-react-app__band-actions'));
    expect(drawn.length, 'screens with band actions').toBeGreaterThanOrEqual(FOUND.bandEnds);
    const doc = document.implementation.createHTMLDocument('worded');
    doc.body.innerHTML = '<header class="ui-app__bar"><div class="ui-react-app__band-actions">'
      + '<button aria-label="Notifications">3</button><button>New report</button><button aria-label="Help"></button></div></header>';
    expect(CHECKS['bar-end']({ ...drawn[0], where: 'worded', doc })).toHaveLength(2);
  });

  // `branded-background` also reads the split layout's brand half, so a control
  // standing on that branded ground must fail it.
  it('the branded-background check reaches the split brand pane and refuses a control', () => {
    const drawn = screens.filter((s) => s.kind === 'auth');
    const doc = document.implementation.createHTMLDocument('brand');
    doc.body.innerHTML = '<div class="ui-auth ui-auth--split">'
      + '<aside class="ui-auth__brand-pane"><div class="ui-auth__brand">Example</div><button>Sign in</button></aside>'
      + '<div class="ui-auth__pane"><h1>Sign in</h1></div></div>';
    expect(CHECKS['branded-background']({ ...drawn[0], where: 'brand', doc })).toHaveLength(1);
  });

  // `sign-in-note` reads the foot under the sign-in form, so a note that names
  // one domain must fail it.
  it('the sign-in-note check reaches the foot and refuses a product domain', () => {
    const drawn = screens.filter((s) => s.kind === 'auth');
    const doc = document.implementation.createHTMLDocument('named');
    doc.body.innerHTML = '<div class="ui-auth__card"><h1>Sign in</h1>'
      + '<div class="ui-auth__foot">Only apliteni.com accounts can sign in.</div></div>';
    expect(CHECKS['sign-in-note']({ ...drawn[0], where: 'named', doc })).toHaveLength(1);
  });

  // `sidebar-column` reads the rows of each sidebar, so a row with no icon must fail it.
  it('the sidebar-column check refuses a section row with no icon', () => {
    const drawn = screens.filter((s) => s.doc.querySelector('nav.ui-nav--side .ui-nav__ic'));
    expect(drawn.length, 'screens with sidebar icons').toBeGreaterThanOrEqual(FOUND.sidebars);
    const doc = document.implementation.createHTMLDocument('bare');
    doc.body.innerHTML = '<nav class="ui-nav ui-nav--side" aria-label="Sections"><ul class="ui-nav__list">'
      + '<li><a class="ui-nav__item"><span class="ui-nav__ic"></span><span class="ui-nav__label">Overview</span></a>'
      + '<ul class="ui-nav__sub"><li><a class="ui-nav__item ui-nav__item--sub">Pending</a></li></ul></li>'
      + '<li><a class="ui-nav__item"><span class="ui-nav__label">Orders</span></a></li></ul></nav>';
    expect(CHECKS['sidebar-column']({ ...drawn[0], where: 'bare', doc })).toEqual(['bare gives the sidebar row "Orders" no icon. Each section has one.']);
  });

  for (const rule of GATED) {
    it(`${rule.id}: ${rule.says}`, () => {
      expect(screens.flatMap((s) => CHECKS[rule.id](s))).toEqual([]);
    });
  }
});
