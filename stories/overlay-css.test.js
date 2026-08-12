// What the overlay stylesheets have to say, for both the drawer and the confirm.
//
// These are the rules JSDOM cannot check, because JSDOM has no CSS and no
// transitions — and they are the ones that broke in a real browser. So the
// stylesheets are read as text and the claims are made about the rules
// themselves.
//
// Two of them are about `visibility`, which is a discrete property: a transition
// holds it at the OLD value for the whole duration. Transition it on the way in
// and the panel is still `hidden` in the frame the class lands, so openDrawer()'s
// focus() has nothing to focus and the reader is left on <body> with the trigger
// already inert behind them. Ease it with a curve that leaves [0, 1] — and
// brand.generated.css ships `--easing-spring` recommending itself for "modals,
// cards" — and it flips mid-fade instead.
//
// The third is about the window between "closed" and "gone". A confirm guards a
// destructive action; if its accept button is still on screen and still
// hit-testable while the panel fades out, a double-click fires the caller's
// destructive handler twice.

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
const SHEETS = [
  { file: 'src/styles/drawer.css', block: 'ui-drawer' },
  { file: 'src/styles/confirm.css', block: 'ui-confirm' },
];

for (const { file, block } of SHEETS) {
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
}

// ---- The closing window, which only the confirm can lose money on ---------

test('src/styles/confirm.css: a closing confirm stops being clickable at once', () => {
  const all = rules(read('src/styles/confirm.css'));
  const live = /pointer-events\s*:\s*auto/;

  for (const sel of ['.ui-confirm__panel', '.ui-confirm__scrim']) {
    const ungated = all.filter((r) => selects(r, sel) && live.test(r.body));
    assert.deepEqual(
      ungated.map((r) => r.selector), [],
      `${sel} is hit-testable whether or not the dialog is open. closeConfirm() stops trapping `
      + 'immediately but the root stays visible for --dur-med, so a second click in that window '
      + 'reaches the accept button and fires the caller\'s destructive handler twice',
    );
  }

  assert.ok(
    all.some((r) => r.selector.includes('.ui-confirm.is-open') && live.test(r.body)),
    'nothing turns the panel on while it IS open — the dialog would not be clickable at all',
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
