/* Rule: every screen the kit draws keeps the page rules — the head in one
 * order, one h1, one primary action, one density, nothing overlaying it at
 * load. The subjects are the screens under stories/apps/, discovered rather
 * than listed. Each rule on the page owns one check here, keyed by its `id`,
 * and the first test holds the two lists in step.
 *
 * What it cannot see is stated on the floor page, which lists this gate.
 *
 * why: docs/specification.md#the-page
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

import { RULES, LIMITS } from './_the-page.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const appsDir = path.join(root, 'stories/apps');

// ---- the subjects --------------------------------------------------------

const storyFiles = readdirSync(appsDir).filter((f) => f.endsWith('.stories.js')).sort();

/** Every exported story in stories/apps/, rendered once and parsed. */
const screens = [];
for (const file of storyFiles) {
  const mod = await import(path.join(appsDir, file));
  const def = mod.default || {};
  for (const [name, story] of Object.entries(mod)) {
    if (name === 'default' || !story || typeof story !== 'object') continue;
    const render = story.render || def.render;
    if (typeof render !== 'function') continue;
    const html = render({ ...def.args, ...story.args }, { globals: {}, args: {} });
    const doc = new JSDOM(`<!doctype html><html lang="en"><body>${html}</body></html>`).window.document;
    screens.push({ where: `stories/apps/${file}:${name}`, doc, source: readFileSync(path.join(appsDir, file), 'utf8') });
  }
}

// An application page is the shell's <main>; an auth card is the one screen
// kind with no rail to sit beside; a marketing page is not a screen of an
// application at all. Anything else has built chrome of its own, which is the
// `shell` rule's whole subject.
const kindOf = (doc) => (doc.querySelector('main.ui-app__main') ? 'app'
  : doc.querySelector('.ui-auth__card') ? 'auth'
    : doc.querySelector('.ui-hero') ? 'marketing' : 'none');

for (const s of screens) s.kind = kindOf(s.doc);

const apps = () => screens.filter((s) => s.kind === 'app');
const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

// An overlay is anything drawn over the page rather than in it. The palette and
// the drawer each own a root class; a confirm and a dialog own a role.
const OVERLAYS = ['.ui-confirm', '.ui-drawer', '.ui-toast', '.ui-tooltip', '.ui-palette', '[role="dialog"]'];
const inOverlay = (el) => OVERLAYS.some((sel) => el.closest(sel));

// ---- one check per rule --------------------------------------------------
//
// A check returns the lines it objects to. Empty is a pass, and the lines are
// what a reader sees when it is not, so each names the screen and the fault.

const CHECKS = {
  shell(s) {
    if (s.kind === 'none') {
      return [`${s.where} is none of the three page kinds — it draws neither the shell's <main>, `
        + 'nor an auth card, nor a hero. A screen that lays out its own page keeps none of the '
        + 'rules below by accident.'];
    }
    if (s.kind !== 'app') return [];
    const mains = s.doc.querySelectorAll('main');
    return mains.length === 1 ? []
      : [`${s.where} emits ${mains.length} <main> landmarks — the shell emits one, so a second `
        + 'came from the screen.'];
  },

  head(s) {
    if (s.kind !== 'app') return [];
    const main = s.doc.querySelector('main.ui-app__main');
    const kids = [...main.children];
    const problems = [];

    const up = kids.filter((el) => el.matches('nav.ui-nav--crumbs, .ui-back'));
    if (up.length > 1) {
      problems.push(`${s.where} draws ${up.length} ways back up. A page has a trail or a back `
        + 'link, never both — Guidelines / Going back.');
    }

    const shape = kids.map((el) => (el.matches('nav.ui-nav--crumbs, .ui-back') ? 'up'
      : el.tagName === 'H1' ? 'title'
        : el.matches('p.ui-app__sub') ? 'lede'
          : el.matches('.ui-app__body') ? 'body' : `«${el.tagName.toLowerCase()}»`));
    const ORDER = ['up', 'title', 'lede', 'body'];
    let at = 0;
    for (const part of shape) {
      const next = ORDER.indexOf(part, at);
      if (next < 0) {
        problems.push(`${s.where} puts ${part} in the page head, reading ${shape.join(' → ')}. `
          + `The head is ${ORDER.join(' → ')}, and a filter or a toolbar belongs first thing `
          + 'inside the body rather than above the title.');
        break;
      }
      at = next;
    }
    return problems;
  },

  'one-h1'(s) {
    const h1s = s.doc.querySelectorAll('h1');
    if (h1s.length === 1) return [];
    if (h1s.length === 0) {
      return [`${s.where} has no h1. The screen has no name a reader moving by heading can land `
        + 'on, and nothing says which page they are on.'];
    }
    return [`${s.where} has ${h1s.length} h1s — ${[...h1s].map((h) => `"${text(h)}"`).join(', ')}. `
      + 'One screen, one page title.'];
  },

  outline(s) {
    const levels = [...s.doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
      level: Number(h.tagName[1]), what: text(h).slice(0, 40),
    }));
    const problems = [];
    let last = 0;
    for (const { level, what } of levels) {
      if (level > LIMITS.outline) {
        problems.push(`${s.where} sets "${what}" at h${level}, below the h${LIMITS.outline} floor. `
          + 'A fourth rank is a page that has become two.');
      }
      if (last && level > last + 1) {
        problems.push(`${s.where} jumps h${last} → h${level} at "${what}". A reader moving by `
          + 'heading hears the missing rank as content they have skipped.');
      }
      last = level;
    }
    return problems;
  },

  'one-primary'(s) {
    if (s.kind === 'marketing') return [];
    const primaries = [...s.doc.querySelectorAll('.ui-btn--primary')].filter((b) => !inOverlay(b));
    if (primaries.length <= LIMITS.primary) return [];
    return [`${s.where} carries ${primaries.length} primary buttons — `
      + `${primaries.map((b) => `"${text(b)}"`).join(', ')}. A page leads with ${LIMITS.primary}; `
      + 'the rest are secondary, tertiary or links.'];
  },

  stacking(s) {
    const problems = [];
    const nested = s.doc.querySelectorAll('.ui-card .ui-card');
    if (nested.length) {
      problems.push(`${s.where} puts ${nested.length} card(s) inside another card. Two borders `
        + 'around one thing, and the kit has no rank for the inner one.');
    }
    const body = s.doc.querySelector('.ui-app__body');
    if (body) {
      const stacked = [...body.children].filter((el) => el.classList.contains('ui-card'));
      if (stacked.length > LIMITS.cards) {
        problems.push(`${s.where} stacks ${stacked.length} cards. Past ${LIMITS.cards} the page `
          + 'is a list of lists and wants sections, tabs, or a second page.');
      }
    }
    return problems;
  },

  navs(s) {
    const problems = [];
    const seen = new Map();
    for (const nav of s.doc.querySelectorAll('nav')) {
      const by = nav.getAttribute('aria-labelledby');
      const name = nav.getAttribute('aria-label') || (by ? text(s.doc.getElementById(by)) : '');
      if (!name) {
        problems.push(`${s.where} draws a navigation landmark with no name (${nav.className || '<nav>'}). `
          + 'A reader moving by landmark hears "navigation" and nothing else.');
        continue;
      }
      if (seen.has(name)) {
        problems.push(`${s.where} has two navigation landmarks both named "${name}" — two `
          + 'identical doors, and the shell already draws one of them.');
      }
      seen.set(name, nav);
    }
    return problems;
  },

  'at-rest'(s) {
    const open = OVERLAYS.filter((sel) => s.doc.querySelector(sel));
    return open.length === 0 ? []
      : [`${s.where} draws ${open.join(', ')} before the reader has asked for anything. A page `
        + 'arrives at rest; an overlay is what a reader opens.'];
  },

  density(s) {
    const problems = [];
    const tables = [...s.doc.querySelectorAll('table.ui-table')].filter((t) => !inOverlay(t));
    const densities = new Set(tables.map((t) => (t.classList.contains('ui-table--dense') ? 'dense' : 'roomy')));
    if (densities.size > 1) {
      problems.push(`${s.where} draws ${tables.length} tables at ${[...densities].join(' and ')} `
        + 'density. One page, one rhythm.');
    }
    // A screen that writes its own cell padding has left the scale, and no
    // amount of agreeing with itself makes that one density.
    const local = /\.ui-table[^{}]*\b(?:td|th)\b[^{}]*\{[^}]*padding\s*:/.exec(s.source);
    if (local) {
      problems.push(`${s.where.split(':')[0]} sets table cell padding of its own: `
        + `${local[0].slice(0, 60)}… Density comes from .ui-table--dense and the spacing scale, `
        + 'not from a rule per screen.');
    }
    return problems;
  },

  lede(s) {
    if (s.kind !== 'app') return [];
    const main = s.doc.querySelector('main.ui-app__main');
    const title = text(main.querySelector('h1'));
    const lede = text(main.querySelector('p.ui-app__sub'));
    if (!lede) {
      return [`${s.where} has a title and no lede. What is counted, how far back and where the `
        + 'numbers come from is what the title cannot say.'];
    }
    const problems = [];
    const sentences = (lede.match(/[.!?](?:\s|$)/g) || []).length;
    if (sentences > LIMITS.lede) {
      problems.push(`${s.where} sets a ${sentences}-sentence lede. ${LIMITS.lede} is the most a `
        + 'reader takes before the content; past that it is a paragraph nobody reads twice.');
    }
    if (title && lede.toLowerCase().startsWith(title.toLowerCase())) {
      problems.push(`${s.where} opens its lede with the title again — "${lede.slice(0, 50)}…". `
        + 'The reader has just read it.');
    }
    return problems;
  },
};

// ---- the gates -----------------------------------------------------------

test('the gate found the kit’s own screens', () => {
  assert.ok(storyFiles.length >= 5, `only ${storyFiles.length} story files under stories/apps/ — `
    + 'the sweep is broken, not the kit');
  assert.ok(screens.length >= 12, `only ${screens.length} screens rendered — the sweep is broken`);
  assert.ok(apps().length >= 8, `only ${apps().length} of them are shell pages — the sweep is broken`);
});

test('every rule on the page owns a check here, and every check owns a rule', () => {
  assert.deepEqual(
    Object.keys(CHECKS).sort(), RULES.map((r) => r.id).sort(),
    'the page and this gate have drifted. A rule with no check is a wish, and a check with no '
    + 'rule is a rule the reader is held to and never shown.',
  );
});

for (const rule of RULES) {
  test(`${rule.id}: ${rule.imperative}`, () => {
    const problems = screens.flatMap((s) => CHECKS[rule.id](s));
    assert.deepEqual(problems, [], `${problems.length} screen(s) break this rule:\n  `
      + `${problems.join('\n  ')}`);
  });
}
