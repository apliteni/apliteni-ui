// The page rules, one check per rule, read off a rendered screen: the head in one
// order, one h1, one primary action, one density, nothing overlaying it at load.
// Shared by the vanilla gate (stories/guidelines/the-page.test.js) and the React one
// (react/src/the-page.test.tsx), which render their own screens. A screen is
// `{ where, doc, source, file, firstOfFile, kind }`.
import { LIMITS } from '../guidelines/_the-page.js';

// An application page is the shell's <main>; an auth card is the one screen
// kind with no rail to sit beside; a marketing page is not a screen of an
// application at all. Anything else has built chrome of its own, which is the
// `shell` rule's whole subject.
export const kindOf = (doc) => (doc.querySelector('main.ui-app__main') ? 'app'
  : doc.querySelector('.ui-auth__card') ? 'auth'
    : doc.querySelector('.ui-hero') ? 'marketing' : 'none');

export const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

// An overlay is drawn over the page rather than in it, so what is inside one is
// not on the page: its primary action, its tables and its headings are the
// overlay's own. Mounted and closed is the normal state for all five — a page
// ships the markup and opens it later — so the roots and the open states are
// two lists, not one.
//
// The first draft of this gate spelled two of them `.ui-tooltip` and
// `.ui-palette`, which the kit has never emitted: `at-rest` could not see a
// hover readout at all, and `inOverlay` could not exclude one. A selector that
// matches nothing reads exactly like a rule nothing breaks, which is why
// `the overlay selectors are classes the kit really writes` is below.
export const OVERLAY_ROOTS = ['.ui-drawer', '.ui-confirm', '.ui-cmdk', '.ui-tip', '.ui-fbcomposer'];
// A toast has no closed state: it is appended when it is shown and removed after.
export const OPEN = ['.ui-drawer.is-open', '.ui-confirm.is-open', '.ui-cmdk.is-open', '.ui-tip.is-open', '.ui-toast'];
export const inOverlay = (el) => OVERLAY_ROOTS.some((sel) => el.closest(sel));

// ---- one check per rule --------------------------------------------------
//
// A check returns the lines it objects to. Empty is a pass, and the lines are
// what a reader sees when it is not, so each names the screen and the fault.

export const CHECKS = {
  // One layout per product is a decision nothing on one screen can show, so what is
  // measured here is the half a screen CAN break: the parts a layout moves must not
  // be drawn twice. A screen that hand-rolls a second search box, or names the reader
  // in the rail and again on the band, has two answers to one question.
  layout(s) {
    if (s.kind !== 'app') return [];
    const problems = [];
    // The phone shell's drawer holds the rail's rows and its reader block; it is an overlay,
    // drawn instead of the rail below 720px and never beside it.
    const readers = [...s.doc.querySelectorAll('.ui-app__user')].filter((el) => !inOverlay(el));
    if (readers.length > 1) {
      problems.push(`${s.where} names the signed-in reader ${readers.length} times. The block moves `
        + 'between the two layouts; it is not drawn in both places at once, and a page with two of '
        + 'them asks a reader which one ends their session.');
    }
    const ways = [...s.doc.querySelectorAll('[data-cmdk-open]')].filter((el) => !inOverlay(el));
    if (ways.length > 1) {
      problems.push(`${s.where} draws ${ways.length} ways into the command palette. One page, one `
        + 'field: a second control that opens the same thing is a choice a reader has to make and '
        + 'cannot get right.');
    }
    const bands = s.doc.querySelectorAll('.ui-app__bar, header.topbar');
    if (bands.length > 1) {
      problems.push(`${s.where} stacks ${bands.length} bands over the page. A screen takes the bar `
        + 'its layout draws, and no other.');
    }
    return problems;
  },

  // The column is the shell's, and the screen does not write one of its own. A page
  // that sets a width inside its own <main> has left the two names behind and is
  // carrying a third number nothing else in the kit knows about.
  width(s) {
    if (s.kind !== 'app') return [];
    const main = s.doc.querySelector('main.ui-app__main');
    const problems = [];
    const columns = s.doc.querySelectorAll('main.ui-app__main');
    if (columns.length !== 1) {
      problems.push(`${s.where} draws ${columns.length} content columns. Both widths are one column `
        + 'at two caps.');
    }
    // An absolute cap, and not a percentage: a skeleton bar at 40% is as wide as
    // whatever column it was put in and cannot fight the shell's. A number in px or
    // rem is a second page width, which is the thing the two names replace.
    const own = [...main.querySelectorAll('[style*="max-width"]')]
      .filter((el) => !inOverlay(el) && /max-width\s*:\s*[\d.]+(?:px|rem|em|ch)/.test(el.getAttribute('style') || ''));
    if (own.length) {
      problems.push(`${s.where} caps the page at a width of its own — `
        + `${own.map((el) => `"${el.getAttribute('style')}"`).join(', ')}. The column is the shell's, `
        + 'and the two names it comes in are the whole of the choice.');
    }
    return problems;
  },

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
    // Each part may appear once, in this order: the index walks forward past the
    // one it just matched, so a second body — or a second title — is as much a
    // failure as one in the wrong place.
    const ORDER = ['up', 'title', 'lede', 'body'];
    let at = 0;
    for (const part of shape) {
      const next = ORDER.indexOf(part, at);
      at = next + 1;
      if (next < 0) {
        problems.push(`${s.where} puts ${part} in the page head, reading ${shape.join(' → ')}. `
          + `The head is ${ORDER.join(' → ')}, and a filter or a toolbar belongs first thing `
          + 'inside the body rather than above the title.');
        break;
      }
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
    // An overlay keeps its own outline — a drawer's h2 and the feedback
    // widget's h4 are inside a dialog, not in the page's ranks.
    const levels = [...s.doc.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter((h) => !inOverlay(h))
      .map((h) => ({ level: Number(h.tagName[1]), what: text(h).slice(0, 40) }));
    const problems = [];
    let last = 0;
    for (const { level, what } of levels) {
      if (!last && level > 1) {
        problems.push(`${s.where} opens its outline at h${level}, on "${what}". The first heading `
          + 'on a page is its title.');
      }
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
      // Every card the body holds that no other card holds — counted by
      // ancestry rather than by direct childhood, because a wrapper around
      // twelve cards is still twelve cards on the page.
      const stacked = [...body.querySelectorAll('.ui-card')]
        .filter((el) => !inOverlay(el) && !el.parentElement.closest('.ui-card'));
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
    for (const nav of [...s.doc.querySelectorAll('nav')].filter((n) => !inOverlay(n))) {
      const by = nav.getAttribute('aria-labelledby');
      // aria-labelledby takes a list of ids, and the name is what they say in order.
      const name = nav.getAttribute('aria-label')
        || (by ? by.trim().split(/\s+/).map((id) => text(s.doc.getElementById(id))).filter(Boolean).join(' ') : '');
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
    const open = OPEN.filter((sel) => s.doc.querySelector(sel));
    return open.length === 0 ? []
      : [`${s.where} opens ${open.join(', ')} before the reader has asked for anything. A page `
        + 'arrives at rest; an overlay is what a reader opens. Mounted and closed is fine.'];
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
    // amount of agreeing with itself makes that one density. Two spellings
    // reach it: a rule in the story's own <style> block, and a style attribute
    // on the cell, which is the one the DOM can see.
    const inline = [...s.doc.querySelectorAll('td[style], th[style]')]
      .filter((c) => /padding|height/.test(c.getAttribute('style')));
    if (inline.length) {
      problems.push(`${s.where} sets cell padding or height on ${inline.length} cell(s) inline. `
        + 'Density comes from .ui-table--dense and the spacing scale.');
    }
    // The other spelling is a rule in the story's own <style> block. It is a
    // fact about the file, so it is read once per file rather than once per
    // screen the file publishes.
    const local = s.firstOfFile && /\.ui-table[^{}]*\b(?:td|th)\b[^{}]*\{[^}]*padding\s*:/.exec(s.source);
    if (local) {
      problems.push(`${s.file} sets table cell padding in its own stylesheet: `
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
    // A page may open on its title alone. The written rule holds an introduction
    // to two sentences and to saying something the title does not; it has never
    // required one, and this check used to. A line added only to satisfy a gate
    // is the restatement the rule exists to stop. The coverage test below is
    // what keeps the when-present half from passing on an empty set.
    // why: Artur's r28 review of the Finance report, #505
    if (!lede) return [];
    const problems = [];
    // Abbreviations end in a full stop and do not end a sentence. Counting
    // segments rather than stops also counts a last sentence with no stop
    // at all, which counting stops does not.
    const sentences = lede
      .replace(/\b(?:e\.g|i\.e|etc|vs|approx|no|fig|cf)\./gi, '$&\u0000')
      .replace(/\u0000/g, '')
      .split(/(?<!\b(?:e\.g|i\.e|etc|vs|approx|no|fig|cf))[.!?]+(?:\s|$)/i)
      .map((part) => part.trim()).filter(Boolean).length;
    if (sentences > LIMITS.lede) {
      problems.push(`${s.where} sets a ${sentences}-sentence lede. ${LIMITS.lede} is the most a `
        + 'reader takes before the content; past that it is a paragraph nobody reads twice.');
    }
    // The fault is the title said twice, wherever in the opening sentence it
    // lands: "Payouts — this is the payouts page" is the rule's own example and
    // opens with a dash, not with the title.
    const opening = lede.split(/[.!?]/)[0].toLowerCase();
    if (title && opening.includes(title.toLowerCase())) {
      problems.push(`${s.where} spends its opening sentence on the title again — `
        + `"${lede.slice(0, 60)}…" under "${title}". The reader has just read it.`);
    }
    return problems;
  },
};

