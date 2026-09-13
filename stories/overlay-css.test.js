// What the overlay stylesheets have to say, for both the drawer and the confirm.
//
// These are the rules JSDOM cannot check — it has no CSS and no transitions — and they
// are the ones that broke in a real browser, so the stylesheets are read as text.
//
// Two are about `visibility`, a discrete property a transition holds at the OLD value for
// the whole duration: transitioned on the way in, the panel is still `hidden` in the frame
// the class lands; eased with a curve that leaves [0, 1], it flips mid-fade.
//
// The third is the window between "closed" and "gone": both roots stay visible for
// --dur-med after the close call stops trapping focus, so a panel still hit-testable while
// it fades takes one more click — which on a confirm runs the caller's destructive handler
// a second time.
//
// why: docs/specification.md#motion

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');

const read = (rel) => readFileSync(path.join(repo, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Every leaf rule in the sheet as { selector, body }, including the ones nested
// inside @media — a rule that only breaks under `prefers-reduced-motion` breaks
// for the readers most likely to be using the keyboard.
function rules(css) {
  const out = [];
  const open = [];
  let buf = '';
  for (const ch of css) {
    if (ch === '{') { open.push(buf.trim()); buf = ''; } else if (ch === '}') {
      const selector = open.pop() ?? '';
      if (buf.trim()) out.push({ selector, body: buf.trim() });
      buf = '';
    } else buf += ch;
  }
  return out;
}

const selects = (rule, sel) => rule.selector.split(',').some((s) => s.trim() === sel);
const transitions = (rule) => [...rule.body.matchAll(/transition(?:-property)?\s*:([^;]*)/g)].map((m) => m[1]);

// The two overlays are one behaviour with two skins, so both sheets answer the
// same questions.
// `close` names the call that stops trapping; `cost` finishes the sentence "a
// second click in that window …", because what a stray click costs is the whole
// reason the gate is there and it is not the same cost twice.
const SHEETS = [
  {
    file: 'src/styles/drawer.css',
    block: 'ui-drawer',
    close: 'closeDrawer()',
    cost: 'reaches a control in the panel — the footer\'s actions, the close button — and re-runs '
      + 'the caller\'s handler while the panel is already sliding away',
  },
  {
    file: 'src/styles/confirm.css',
    block: 'ui-confirm',
    close: 'closeConfirm()',
    cost: 'reaches the accept button and fires the caller\'s destructive handler twice',
  },
  {
    file: 'src/styles/command-palette.css',
    block: 'ui-cmdk',
    close: 'closeCommandPalette()',
    cost: 'lands on a result row and runs the caller\'s command a second time',
  },
];

for (const { file, block, close, cost } of SHEETS) {
  const css = read(file);
  const all = rules(css);

  test(`${file}: nothing transitions \`all\` — \`all\` is a spelling of \`visibility\``, () => {
    for (const rule of all) {
      for (const value of transitions(rule)) {
        assert.doesNotMatch(
          value, /(^|[\s,])all([\s,]|$)/,
          `${rule.selector} transitions \`all\`, which includes visibility and hides the panel `
          + 'in the frame focus() runs',
        );
      }
    }
  });

  test(`${file}: the panel never transitions \`visibility\``, () => {
    const panels = all.filter((r) => r.selector.includes(`.${block}__panel`));
    assert.ok(panels.length > 0, 'the panel rules were found — did the class name change?');
    for (const rule of panels) {
      for (const value of transitions(rule)) {
        assert.doesNotMatch(
          value, /\bvisibility\b/,
          `${rule.selector} transitions visibility, which delays the switch past the click`,
        );
      }
    }
  });

  test(`${file}: opening cancels the root's visibility transition, so the show is instant`, () => {
    const root = all.filter((r) => selects(r, `.${block}`));
    assert.ok(
      root.some((r) => transitions(r).some((v) => /\bvisibility\b/.test(v))),
      `.${block} no longer owns the visibility switch — the panel rules must not take it back`,
    );

    const openRule = all.find((r) => selects(r, `.${block}.is-open`));
    assert.ok(openRule, `.${block}.is-open is missing — nothing turns the panel visible`);
    assert.match(
      openRule.body, /transition\s*:\s*none/,
      `.${block}.is-open does not cancel the transition, so the root stays hidden for its whole `
      + 'duration and focus() on open lands nowhere',
    );
  });

  // The reduced-motion net gives every element a 0.01ms transition, and a child
  // then inherits `visible` one tick after the root. Measured in Chrome with
  // reduced motion forced: focus landed on the drawer's panel and fell to <body>
  // from the confirm. Opening has to cancel the children's transitions as well.
  test(`${file}: under reduced motion, opening cancels every transition inside it`, () => {
    const inNet = new RegExp(
      `@media(?![^{]*\\bnot\\b)[^{]*prefers-reduced-motion\\s*:\\s*reduce\\b[^{]*\\{[^{}]*\\.${block}\\.is-open \\*\\s*\\{[^}]*`
      + 'transition\\s*:\\s*none\\s*!important',
    );
    assert.match(
      css, inNet,
      `${file} has no \`@media (prefers-reduced-motion: reduce) { .${block}.is-open * { transition: `
      + 'none !important; } }`. Without it the control focused on open is still hidden in that '
      + 'frame for a reader who asked for less motion',
    );
  });

  test(`${file}: a visibility transition is timed \`linear\``, () => {
    for (const rule of all) {
      for (const value of transitions(rule)) {
        if (!/\bvisibility\b/.test(value)) continue;
        assert.match(
          value, /\blinear\b/,
          `${rule.selector} eases a discrete property. Easing buys nothing here, and a curve whose `
          + 'output leaves [0, 1] flips visibility in the middle of the fade',
        );
      }
    }
  });

  // The window between "closed" and "gone" belongs to both of them.
  test(`${file}: a closing overlay stops being clickable at once`, () => {
    const live = /pointer-events\s*:\s*auto/;

    for (const sel of [`.${block}__panel`, `.${block}__scrim`]) {
      const ungated = all.filter((r) => selects(r, sel) && live.test(r.body));
      assert.deepEqual(
        ungated.map((r) => r.selector), [],
        `${sel} is hit-testable whether or not the overlay is open. ${close} stops trapping `
        + 'immediately but the root stays visible for --dur-med, so a second click in that window '
        + cost,
      );
    }

    assert.ok(
      all.some((r) => r.selector.includes(`.${block}.is-open`) && live.test(r.body)),
      `nothing turns .${block} on while it IS open — the overlay would not be clickable at all`,
    );
  });
}

// ---- Which of the two paints on top --------------------------------------

// The z-index each root resolves to, with var() substituted from the token file
// and a trailing `+ n` / `- n` applied. Only the forms the sheets actually use.
function stackingLevel(rule, tokens) {
  const decl = /(?:^|;)\s*z-index\s*:([^;]*)/.exec(rule.body);
  assert.ok(decl, `${rule.selector} declares no z-index — it would stack in document order`);

  const value = decl[1].trim();
  const parsed = /^(?:calc\(\s*)?var\(\s*(--[\w-]+)\s*\)\s*(?:([+-])\s*(\d+)\s*\)?)?$/.exec(value);
  assert.ok(parsed, `${rule.selector}'s z-index is \`${value}\` — expected a token, or a token ± n`);

  const [, token, sign, offset] = parsed;
  const base = tokens.get(token);
  assert.ok(base !== undefined, `${token} is not defined in the token file`);
  return base + (sign === '-' ? -Number(offset) : Number(offset ?? 0));
}

// The sheets are the only place these numbers are real; the module keeps a copy so
// the keyboard can be given to whichever overlay is painted on top. Reading them
// needs no DOM — overlay.js touches `document` only in a default parameter — so the
// copy is checked here, next to the rules it copies.
const { OVERLAY_LAYER } = await import('../src/components/overlay.js');

const zTokens = () => {
  const tokens = new Map(
    [...read('src/tokens/tokens.css').matchAll(/(--z-[\w-]+)\s*:\s*(\d+)\s*;/g)]
      .map(([, name, value]) => [name, Number(value)]),
  );
  assert.ok(tokens.size > 0, 'the z tokens were found — did the token file move?');
  return tokens;
};

const rootOf = (file, block) => {
  const root = rules(read(file)).find((r) => selects(r, `.${block}`));
  assert.ok(root, `.${block} is missing from ${file}`);
  return root;
};

test("the stack's layers are the ones the sheets resolve to", () => {
  const tokens = zTokens();
  const pairs = [
    ['confirm', 'src/styles/confirm.css', 'ui-confirm'],
    ['drawer', 'src/styles/drawer.css', 'ui-drawer'],
    ['palette', 'src/styles/command-palette.css', 'ui-cmdk'],
  ];

  for (const [name, file, block] of pairs) {
    const level = stackingLevel(rootOf(file, block), tokens);
    assert.equal(
      OVERLAY_LAYER[name], level,
      `${file} paints .${block} at z-index ${level}, but OVERLAY_LAYER.${name} in `
      + `src/components/overlay.js still says ${OVERLAY_LAYER[name]}. The sheet moved and the `
      + "stack's idea of which overlay is on top did not follow, so Escape and the Tab trap go to "
      + 'the layer underneath the one the reader can see',
    );
  }
});

// The React Modal is the other thing a drawer opens: a question about the record in
// it. At z-index 50 it was painted underneath the drawer while taking its keys.
test('a React modal paints above a drawer', () => {
  const tokens = zTokens();
  const modalZ = stackingLevel(rootOf('react/src/Modal.css', 'rx-scrim'), tokens);
  const drawerZ = stackingLevel(rootOf('src/styles/drawer.css', 'ui-drawer'), tokens);
  assert.ok(
    modalZ > drawerZ,
    `a React modal resolves to z-index ${modalZ} and a drawer to ${drawerZ}, so a modal opened from `
    + 'a drawer sits under it on screen while the dialog stack gives it the keyboard',
  );
});

test('a confirm paints above a drawer, whatever order they are mounted in', () => {
  const tokens = zTokens();

  const confirmZ = stackingLevel(rootOf('src/styles/confirm.css', 'ui-confirm'), tokens);
  const drawerZ = stackingLevel(rootOf('src/styles/drawer.css', 'ui-drawer'), tokens);

  assert.ok(
    confirmZ > drawerZ,
    `a confirm resolves to z-index ${confirmZ} and a drawer to ${drawerZ}. At equal levels paint `
    + 'order falls back to document order, so a confirm whose markup comes first — a normal way to '
    + 'mount dialogs — is painted BEHIND the drawer it is asking about: its buttons are clipped by '
    + 'the drawer panel, and at narrow widths the dialog is hidden outright',
  );
});

test('a confirm paints above a command palette, which is where a palette row sends it', () => {
  const tokens = zTokens();

  const confirmZ = stackingLevel(rootOf('src/styles/confirm.css', 'ui-confirm'), tokens);
  const paletteZ = stackingLevel(rootOf('src/styles/command-palette.css', 'ui-cmdk'), tokens);

  assert.ok(
    confirmZ > paletteZ,
    `a confirm resolves to z-index ${confirmZ} and a palette to ${paletteZ}. A destructive row in `
    + 'the palette opens the confirm and leaves the palette standing under it, so a confirm that '
    + 'paints below is a question the reader cannot read or answer',
  );
});

test('src/styles/confirm.css: a consequence too long for the viewport scrolls', () => {
  const all = rules(read('src/styles/confirm.css'));

  const panel = all.find((r) => selects(r, '.ui-confirm__panel'));
  assert.ok(panel, 'the panel rule was found');
  assert.match(
    panel.body, /max-height\s*:/,
    'the panel is absolutely centred in a fixed root, so without a max-height it grows past both '
    + 'edges of the viewport and scrollIntoView cannot move it: at 320x480, or at 400% zoom, the '
    + 'answers sit below the fold permanently (WCAG 1.4.10, 2.4.11)',
  );

  const bodySlot = all.find((r) => selects(r, '.ui-confirm__body'));
  assert.ok(bodySlot, 'the body rule was found');
  assert.match(
    bodySlot.body, /overflow-y\s*:\s*auto/,
    'the consequence has to scroll inside the panel, the way the drawer body does',
  );

  const acts = all.find((r) => selects(r, '.ui-confirm__acts'));
  assert.ok(acts, 'the actions rule was found');
  assert.match(
    acts.body, /flex\s*:\s*none/,
    'the answers must not be the thing that shrinks — they are what the dialog is for',
  );
});

// ---- the menus, and the frame a key opens one in ----------------------------
//
// The fourth overlay, and the one with the same `visibility` problem the three
// above have — from the other end. A panel that is still `hidden` in the frame
// its open class lands is a panel a browser will not move focus into, and every
// row in it carries `tabindex="-1"`: the arrows opened the menu, focus stayed on
// the trigger, and the next Tab left the dropdown entirely. Measured in Chrome
// rather than reasoned about: the resolved `visibility` was `hidden` in that
// frame and `visible` in the next.
//
// JSDOM cannot see it — it focuses inside a hidden box happily — so the gates
// that press the keys go on passing with this rule deleted. This is the one that
// does not. why: docs/specification.md#the-dropdown-panel
//
// Swept across every menu the kit ships, not just `dropdown()`'s own panel. The
// topbar's version switcher and account menu are the same `wireDropdown()` in
// bespoke clothes — same hooks, same keyboard, same fade — and they had neither
// fix while `.ui-dropdown__panel` had both, because both gates read one file.
const MENUS = [
  {
    file: 'src/styles/dropdown.css',
    panel: '.ui-dropdown__panel',
    // Each named on its own below: the portalled panel is not a descendant of an
    // open container, so one rule cannot answer for both placements.
    open: ['.ui-dropdown.open .ui-dropdown__panel', '.ui-dropdown__panel--portal.is-open'],
    what: 'the kit\'s own dropdown, in place and portalled',
    cost: 'one of its rows signs the reader out, since #286',
  },
  {
    file: 'src/styles/topbar.css',
    panel: '.vsw__menu',
    open: ['.vsw.open .vsw__menu'],
    what: 'the topbar version switcher',
    cost: 'its rows change the version the page is reading',
  },
  {
    file: 'src/styles/topbar.css',
    panel: '.amenu',
    open: ['.acct.open .amenu'],
    what: 'the topbar account menu',
    cost: '`.aout` ends the reader\'s session',
  },
];

// The rules a menu's open state is written in, one selector at a time. Exact
// selector parts, so a rule naming two of them answers for both and a rule
// naming neither answers for nothing.
const openRules = (all, sel) => all.filter((r) => selects(r, sel));

for (const m of MENUS) {
  test(`${m.file}: ${m.panel} is visible in the frame it opens, not the next one`, () => {
    const all = rules(read(m.file));
    for (const sel of m.open) {
      const open = openRules(all, sel);
      assert.ok(open.length, `no rule keys on \`${sel}\` — this gate is measuring nothing`);

      const lists = open.flatMap((r) => transitions(r).map((t) => t.trim()));
      assert.ok(
        lists.length,
        `\`${sel}\` no longer swaps its transition list, so \`visibility\` is still on the clock `
        + `while ${m.what} opens: the frame the class lands resolves \`hidden\`, a browser refuses `
        + 'to focus a row inside it, and the arrows open a menu the keyboard cannot enter. One rule '
        + '— `transition-property: opacity, transform` on the open menu — is the whole fix.',
      );
      for (const list of lists) {
        assert.ok(
          !/\bvisibility\b|\ball\b/.test(list),
          `\`${sel}\` transitions \`${list}\`, which still puts \`visibility\` on a clock — and `
          + '`all` is a spelling of visibility. The row the arrows aim at is unfocusable for the '
          + 'first frame, which is the frame the focus call happens in.',
        );
      }
    }

    // The close is not touched: it is what keeps the menu drawn while it fades,
    // and the rules above only stand while it is open.
    const base = all.find((r) => selects(r, m.panel));
    assert.ok(base, `the \`${m.panel}\` rule was found`);
    assert.ok(
      transitions(base).some((t) => /\bvisibility\b/.test(t)),
      `\`${m.panel}\` stopped transitioning \`visibility\` at all, so it is gone in the frame it is `
      + 'told to close and the fade plays on a box nobody can see',
    );
  });

  // And the other end of that window, which the three overlays above already
  // gate: a menu drawn while it fades is a menu that is hit. Its rows are <a>
  // and <button> elements — a menu is actions — so a stray click in the 250ms
  // after a close activates one of them invisibly.
  test(`${m.file}: ${m.panel} stops being clickable at once`, () => {
    const all = rules(read(m.file));
    const live = /pointer-events\s*:\s*auto/;

    const closed = all.find((r) => selects(r, m.panel));
    assert.ok(closed, `the \`${m.panel}\` rule was found`);
    assert.match(
      closed.body, /pointer-events\s*:\s*none/,
      `a closed ${m.what} is hit-testable. \`visibility\` is held at \`visible\` for the whole fade `
      + 'out, so for --dur-med after the menu closes its rows are still there to be clicked — and '
      + `${m.cost}. \`pointer-events: none\` here, taken back on the open rules, is the same answer `
      + '.ui-drawer and .ui-cmdk give.',
    );

    const ungated = all.filter((r) => selects(r, m.panel) && live.test(r.body));
    assert.deepEqual(
      ungated.map((r) => r.selector), [],
      `${m.what} is turned back on by a rule that does not ask whether it is open`,
    );
    assert.ok(
      m.open.some((sel) => openRules(all, sel).some((r) => live.test(r.body))),
      `nothing turns ${m.what} on while it IS open — the menu would not be clickable at all`,
    );
  });
}
