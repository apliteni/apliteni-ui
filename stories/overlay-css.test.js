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
