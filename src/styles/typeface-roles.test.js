/* Rule: the kit's CSS never names a font family. It names a ROLE — display, text
 * or mono — and one sheet says which family each role is.
 *
 * The rule exists because the roles are new (#253) and the kit spent its whole
 * life with one family, so `Poppins` is written in a lot of muscle memory. A
 * literal here is invisible: it renders correctly today and stops following the
 * token the day the token moves, which is exactly how the kit ended up with one
 * face doing two jobs.
 *
 * Which role an element takes is decided by the ELEMENT, and that half is asked
 * of a rendered document rather than of the stylesheet: a component rule that
 * out-ranks base.css's heading rule reads fine in the file and is wrong on the
 * page. Both halves carry the mutation that kills their case — the rule under
 * test is taken back out and the assertion has to fail.
 *
 * why: docs/specification.md#typefaces */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { blankStrings, kitSheetNames, kitStyleHtml } from '../../scripts/lib/icon-cascade.js';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHEETS = kitSheetNames(src);

assert.ok(
  SHEETS.length >= 20,
  `parsed ${SHEETS.length} @imports out of src/index.css — the parser is broken, not the kit.`,
);

/** Blank comments, keeping newlines, so a reported line number is the real one. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/* The three roles, and nothing else. `inherit` is allowed because it names no
 * family at all — react/src/DataTable.css uses it to hand a control the box it
 * sits in, which is the opposite of the defect this gate is about. */
const ROLES = ['var(--font-display)', 'var(--font-sans)', 'var(--font-mono)'];
const NAMES_NO_FAMILY = new Set(['inherit', 'initial', 'unset', 'revert']);

/**
 * Every declaration in the kit's sheets that decides a family: `font-family`, and
 * the `font` shorthand, whose family is its tail. Custom-property definitions are
 * not subjects — they are where a family is allowed to be written, and the sweep
 * would otherwise report the one sheet doing its job.
 *
 * Read off text with strings blanked, so the `style='…'` inside input.css's data
 * URI cannot present itself as a declaration. Blanking preserves every offset, so
 * the raw text is sliced back at the same index for `context` — the declaration
 * plus everything since the previous one, which is where the exception below is
 * written. A note has to sit on its own declaration, not on the one before it.
 */
const familyDecls = () => {
  const found = [];
  for (const rel of SHEETS) {
    const raw = readFileSync(path.join(src, rel), 'utf8');
    const lines = raw.split('\n');
    const text = blankStrings(decomment(raw));
    for (const m of text.matchAll(/(?<![\w-])(font-family|font)\s*:([^;}]*)/g)) {
      const before = text.slice(0, m.index);
      if (/--[\w-]*$/.test(before)) continue; // `--font-display: …` — a definition
      const line = before.split('\n').length;
      const opens = Math.max(before.lastIndexOf(';'), before.lastIndexOf('{'), before.lastIndexOf('}'));
      found.push({
        where: `${rel}:${line}`,
        sheet: rel,
        property: m[1],
        value: m[2].trim().replace(/\s+/g, ' '),
        context: raw.slice(opens + 1, m.index + m[0].length),
      });
    }
  }
  return found;
};

/* If a declaration stops being collected it stops being checked, and a shrinking
 * sweep looks exactly like a passing one. The real count, not a floor: raise it
 * when you set a family, lower it in the commit that stops setting one, and say
 * why. It is meant to be inconvenient.
 * Was 31 at #253, the change that split one role into two: 22 text, 3 display,
 * 4 mono, and 2 that name no family at all. 32 once .ui-dropdown__panel stopped
 * inheriting a face it could be portalled away from (below). 33 with
 * `.ui-dropdown__item { font: inherit }`, which names no family either: it is
 * the reset that takes the browser's `font: 400 13.3333px Arial` back off a row
 * written as a <button>, and it reads the face the panel above it just pinned
 * rather than naming the same role twice (#251). 41 with the eight more rules
 * that answer the same shorthand on the same issue: `.vopt`, `.avatar` and
 * `.toggle` in topbar.css, `.ui-card--interactive`, `.ui-drawer__close`,
 * `.ui-toast__close`, `.ui-fbpill` and `.ui-fbc__x`. Each names no family
 * either — `font: inherit` is the reset, and the face comes from the ancestor
 * the row already sits in. 44 with pagination.css (#273), which names the sans
 * role three times: the range sentence, the control's `font:` shorthand, and the
 * advanced tier's two labels. */
const EXPECTED_SUBJECTS = 44;

test('every family in the kit is a role, never a family name', () => {
  const decls = familyDecls();

  assert.equal(
    decls.length, EXPECTED_SUBJECTS,
    `swept ${decls.length} family declarations, expected ${EXPECTED_SUBJECTS}. A count that moved `
    + 'on its own means a rule appeared or vanished without this number following it — update the '
    + 'number in the same commit and say which rule moved.',
  );

  for (const d of decls) {
    const ok = d.property === 'font-family'
      ? ROLES.includes(d.value) || NAMES_NO_FAMILY.has(d.value)
      : NAMES_NO_FAMILY.has(d.value) || ROLES.some((r) => d.value.endsWith(r));
    assert.ok(
      ok,
      `${d.where} names a family instead of a role: \`${d.property}: ${d.value}\`. Write one of `
      + `${ROLES.join(', ')} — src/tokens/tokens.css is the only file that says which family a `
      + 'role is, so a literal here goes on rendering correctly right up until the token moves.',
    );
  }
});

/* The exception, written where the exception is, in a shape this gate parses —
 * never a list of selectors in a test file. Two closed kinds:
 *
 *   brand    a wordmark is a mark and not text, so it keeps the display face at
 *            whatever size it is set at (.topbar .brand is 13px)
 *   readout  a number large enough to be read as a figure rather than as prose
 *
 * A heading needs no note: base.css gives every h1-h6 the display face, and the
 * test below proves it does. A third kind needs arguing for in the
 * specification rather than typed at a use site. */
const KINDS = ['brand', 'readout'];

test('a display face outside the heading rule says which exception it is', () => {
  const display = familyDecls().filter((d) => d.value.includes('var(--font-display)'));

  assert.ok(
    display.length > 0,
    'no rule in the kit sets the display face at all. base.css sets it on headings; if that rule '
    + 'went, the kit has one face again and this gate is checking nothing.',
  );

  for (const d of display) {
    if (d.sheet === 'styles/base.css') continue; // the heading rule — the general case
    const note = /\/\*\s*display:\s*(\w+)\s*(?:—|--)\s*(\S[^*]*)/.exec(d.context);
    assert.ok(
      note,
      `${d.where} sets the display face outside base.css's heading rule and does not say why. `
      + `Write the reason on the declaration as \`/* display: ${KINDS.join('|')} — why *​/\`, so it `
      + 'is read by whoever is about to change it rather than by whoever opens this test.',
    );
    assert.ok(
      KINDS.includes(note[1]),
      `${d.where} claims the display face as "${note[1]}", which is not one of ${KINDS.join(', ')}. `
      + 'The kinds are closed on purpose — a third one is a change to '
      + 'docs/specification.md#typefaces, not a word typed at a use site.',
    );
    assert.ok(
      note[2].trim().length >= 20,
      `${d.where} names its kind but gives no reason after it. The reason is the whole point of `
      + 'the note: "brand" is a category, and what the next reader needs is why THIS one is a mark.',
    );
  }
});

test('the two text roles are two different families, falling back the same way', () => {
  const tokens = readFileSync(path.join(src, 'tokens/tokens.css'), 'utf8');
  const stackOf = (token) => {
    const m = new RegExp(`${token}\\s*:\\s*([^;]+);`).exec(tokens);
    assert.ok(m, `${token} is not defined in src/tokens/tokens.css`);
    return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
  };

  const display = stackOf('--font-display');
  const sans = stackOf('--font-sans');

  assert.notEqual(
    display[0], sans[0],
    'the display role and the text role name the same family, which is the state #253 was opened '
    + 'about: one face doing a heading\'s job and a table cell\'s job at once.',
  );
  assert.deepEqual(
    display.slice(1), sans.slice(1),
    'the two roles fall back to different system stacks. A consumer who loads neither webfont, or '
    + 'whose network drops one, then gets a page set in two unrelated system faces — a worse '
    + 'result than the single family the kit shipped before.',
  );
});

/* -- The half a stylesheet cannot answer ------------------------------------ */

const mount = (sheets) => {
  const styles = sheets.map(([rel, css]) => `<style data-sheet="${rel}">${css}</style>`).join('\n');
  const dom = new JSDOM(
    `<!doctype html><html><head>${styles}</head>`
    + '<body><h1></h1><h2></h2><h3></h3><h4></h4><h5></h5><h6></h6>'
    + '<p id="text">plain <b id="b">bold</b> <strong id="strong">strong</strong></p></body></html>',
  );
  assert.equal(
    dom.window.document.styleSheets.length, sheets.length,
    'jsdom dropped a stylesheet — every rule in it would silently leave coverage.',
  );
  return dom.window;
};

const kit = () => SHEETS.map((rel) => [rel, readFileSync(path.join(src, rel), 'utf8')]);

/** The same sheets with one rule cut out of one of them, for the mutation. */
const without = (needle) => {
  let cut = 0;
  const sheets = kit().map(([rel, css]) => {
    if (!css.includes(needle)) return [rel, css];
    cut += 1;
    return [rel, css.replace(needle, '')];
  });
  assert.equal(cut, 1, `the mutation found ${cut} copies of the rule it removes, expected 1`);
  return sheets;
};

const HEADING_RULE = 'h1, h2, h3, h4, h5, h6 {\n  font-family: var(--font-display);\n}';
const STRONG_RULE = 'b,\nstrong {\n  font-weight: var(--weight-semibold);\n}';

test('a heading is the display face and everything else is the text face', () => {
  const { document, getComputedStyle } = mount(kit());
  const family = (sel) => getComputedStyle(document.querySelector(sel)).fontFamily;

  assert.equal(
    family('body'), 'var(--font-sans)',
    'the document default is not the text face. Everything that is not a heading inherits from '
    + 'here — tables, fields, chat — which is most of what the kit renders.',
  );
  for (const h of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    assert.equal(
      family(h), 'var(--font-display)',
      `${h} does not resolve to the display face. Either base.css's heading rule went, or a rule `
      + 'loaded after it out-ranks it — which reads fine in the file and is wrong on the page.',
    );
  }

  const cut = mount(without(HEADING_RULE));
  assert.equal(
    cut.getComputedStyle(cut.document.querySelector('h2')).fontFamily, 'var(--font-sans)',
    'with base.css\'s heading rule removed a heading STILL resolves to the display face, so the '
    + 'assertion above is being satisfied by something else and would pass with the rule gone.',
  );
});

test('b and strong are the semibold step, not the browser\'s bold', () => {
  const { document, getComputedStyle } = mount(kit());
  const tokens = readFileSync(path.join(src, 'tokens/tokens.css'), 'utf8');
  const semibold = /--weight-semibold:\s*(\d+)/.exec(tokens);
  assert.ok(semibold, '--weight-semibold is not defined in src/tokens/tokens.css');

  for (const id of ['b', 'strong']) {
    assert.equal(
      getComputedStyle(document.getElementById(id)).fontWeight, 'var(--weight-semibold)',
      `<${id}> does not take the kit's emphasis weight. The browser default is 700, and at the `
      + '13px a table row and a chat bubble are set at, 700 reads as a filled-in shape rather '
      + 'than as emphasis (#253).',
    );
  }
  assert.ok(
    Number(semibold[1]) < 700,
    `--weight-semibold is ${semibold[1]}, which is the bold step this rule exists to step down `
    + 'from. The token moved and the rule became a no-op that still reads as a fix.',
  );

  const cut = mount(without(STRONG_RULE));
  assert.equal(
    cut.getComputedStyle(cut.document.getElementById('b')).fontWeight, 'bolder',
    'with the rule removed <b> is STILL not the user-agent default (`bolder`, which is jsdom\'s '
    + 'spelling of the 700 a browser paints), so the assertion above proves nothing about the rule.',
  );
});

/* -- A panel that leaves its container takes its role with it ---------------
 *
 * #257 gave dropdown() a `portal: true` that mounts the panel on <body>, clear
 * of an ancestor that clips it or opens a stacking context. Inheritance goes
 * with it: what the panel is set in stops being decided by the trigger it came
 * out of and starts being decided by <body>.
 *
 * Measured on this branch before the fix — the same dropdown inside a subtree
 * set in the display face resolved to var(--font-display) in place and
 * var(--font-sans) once wireDropdown() moved it. Both placements rendered, both
 * looked deliberate, and `portal` is a positioning flag that has no business
 * changing a typeface. So the panel states its role and the two agree.
 *
 * The mutation is the placement itself rather than a rule cut out of a sheet:
 * the same document is read twice, once with the panel where the factory put it
 * and once after the move, and the assertion is that they are the same answer.
 * A panel that inherited would give two.
 *
 * why: docs/specification.md#typefaces */
test('a dropdown panel keeps its role when the portal moves it onto <body>', async () => {
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});

  const dom = new JSDOM(
    `<!doctype html><html><head>${kitStyleHtml(src, SHEETS)}</head>`
    /* A host in the DISPLAY face, so an inherited answer and a stated one differ.
       Nothing in the kit puts a dropdown inside one — that is the point: the
       probe has to disagree with <body> for the move to be visible at all. */
    + '<body><main id="host" style="font-family: var(--font-display)"></main></body></html>',
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  const { window } = dom;
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, {
      value: window[key] ?? window, configurable: true, writable: true,
    });
  }

  const { dropdown, wireDropdown } = await import('../components/dropdown.js');
  const { document, getComputedStyle } = window;

  document.getElementById('host').innerHTML = dropdown({
    label: 'env:',
    value: 'production',
    portal: true,
    items: [{ label: 'Production', description: 'the description inherits', value: 'p' }],
  });

  /* The description, not the label: .ui-dropdown__label states its own family,
     so it would answer the same wherever it was mounted and prove nothing. */
  const face = () => getComputedStyle(document.querySelector('.ui-dropdown__desc')).fontFamily;
  const inPlace = face();

  wireDropdown(document);
  assert.equal(
    document.querySelector('[data-dropdown-panel]').parentElement, document.body,
    'the panel was not portalled, so this test measured the same placement twice and its '
    + 'agreement below means nothing. wireDropdown() moves a panel carrying data-dropdown-portal.',
  );
  const portalled = face();

  assert.equal(
    inPlace, 'var(--font-sans)',
    `a dropdown panel inside a display-face subtree is set in ${inPlace}. A list of item rows is `
    + 'text — it takes the text face wherever it is, which is what stating the role on the panel '
    + 'buys over inheriting one.',
  );
  assert.equal(
    portalled, inPlace,
    `the same panel is set in ${inPlace} in place and ${portalled} once the portal moved it onto `
    + '<body>. `portal` positions a panel; it must not change what the panel is set in. State the '
    + 'role on .ui-dropdown__panel rather than letting it inherit one from wherever it landed.',
  );
});
