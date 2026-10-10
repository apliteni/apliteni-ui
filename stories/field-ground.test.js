/* Rule: a field in a component gallery is shown on a painted surface, never on
 * the page ground. The vanilla half; react/src/field-ground.test.tsx is the other,
 * over the same reading in stories/lib/field-ground.js.
 *
 * Cause and numbers: docs/foundations.md#colour-and-contrast. Raised by Artur in
 * round r28 of #551 — "Disabled fields almost invisible because of that."
 *
 * Limits, read before trusting a green run:
 *  - stories/components/ only. A guideline page's prose and a showcase's toolbar
 *    ground are those pages' decisions, not this one's. The React catalogue is the
 *    other gate's subject and is not reached from here.
 *  - Winning declarations in JSDOM, not pixels: a rule inside a media query is
 *    unmeasured, and so is anything that depends on layout.
 *  - At rest. Hover, focus and active grounds belong to stories/contrast.test.js.
 *  - A ratio is not legibility. It says the edge is there to be found; the point of
 *    the numbers below is that a token move changes one and a person reads it.
 *  - A fade on the control itself is read; a fade on something above it is not.
 *    The kit sets opacity on the control, which is where it can answer the browser.
 *
 * The browser half at the bottom of the file is OFF unless FIELD_PAINT=1. It is
 * the only reading here taken by an engine that ships a user-agent stylesheet,
 * and the UA sheet is half of what this file now measures:
 *
 *   UI_PLAYWRIGHT=… UI_CHROME=… FIELD_PAINT=1 node --test stories/field-ground.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  AA_TEXT, composite, desugar, fadeOnto, installDomGlobals, kitCssFor, makeStyleCache,
  parseColour, ratio, serialize, storyFiles, substitute,
} from './lib/contrast.js';
import { FIELD, hex, readField, stranded } from './lib/field-ground.js';
// The rejection proof's fixture is built from the kit, not drawn by hand.
import { card, select } from '../src/components/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES = ['dark', 'light'];

// Subjects are discovered, not listed: every gallery under stories/components/.
const GALLERIES = storyFiles.filter((file) => file.startsWith('components/'));

/* Chromium paints a disabled select the kit's way and then fades the result:
 * its user-agent sheet carries `select:disabled { opacity: 0.7 }`, and a colour
 * the kit sets cannot outrank a property it does not. JSDOM ships no such rule,
 * so the walk installs this one ahead of the kit's sheet, at the one selector's
 * weight a UA rule has, and measures what the cascade then composites. It is an
 * emulation of one declaration and not of a user-agent stylesheet: what the
 * engine itself does is the browser half below. #564
 */
const UA_FADES_SELECTS = 'select:disabled { opacity: 0.7; }';

/** The declaration that answers it, as the kit writes it. */
const RESET = /(\.ui-input:disabled[^{]*\{[^}]*?)\n\s*opacity:\s*1;[^\n]*/;

/**
 * One document with the kit's sheet in it, and the user-agent declaration the kit
 * has to answer underneath it. `sheet` lets a caller hand in a mutated kit — the
 * only way to ask what the cascade does when a declaration is missing.
 */
function stage(theme, sheet = (css) => css) {
  const { vars, css } = kitCssFor(theme);
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head>`
    + `<style>${UA_FADES_SELECTS}</style><style>${sheet(css)}</style>`
    + '</head><body></body></html>',
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  const win = dom.window;
  installDomGlobals(win);
  const styles = makeStyleCache(win);
  const page = parseColour(vars.get('--bg'));
  return {
    win,
    vars,
    page,
    /** Every control matching FIELD in one piece of markup, measured. */
    read(html, story) {
      styles.mutate(() => { win.document.body.innerHTML = desugar(substitute(html, vars)); });
      const out = [];
      for (const el of win.document.body.querySelectorAll(FIELD)) {
        // null is an image ground, which is nobody's to measure.
        const reading = readField(el, win, { page, story, styleOf: (node) => styles.of(node) });
        if (reading) out.push(reading);
      }
      return out;
    },
  };
}

/** Every field one gallery renders, read against the ground it actually sits on. */
async function readFields(theme) {
  const staged = stage(theme);
  const { win } = staged;

  const fields = [];
  const stories = [];
  for (const rel of GALLERIES) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      const out = serialize(render(args, { globals: { theme }, args }));
      assert.notEqual(out, null, `${rel}:${name} did not render to markup`);
      stories.push(`${rel}:${name}`);
      for (const reading of staged.read(out, `${rel}:${name}`)) fields.push(reading);
    }
  }
  return { fields, stories };
}

const readings = Object.fromEntries(await Promise.all(
  THEMES.map(async (theme) => [theme, await readFields(theme)]),
));

test('the walk reaches every gallery and finds the fields in them', () => {
  // 27 galleries under stories/components/. A file added there is measured by
  // being there; this number is what says the walk did not stop reading them.
  assert.equal(GALLERIES.length, 27, 'gallery discovery changed; update the count with the file that moved');
  for (const theme of THEMES) {
    const { fields, stories } = readings[theme];
    assert.ok(stories.length >= 110, `${theme}: only ${stories.length} gallery stories rendered`);
    // Switch & Checkbox 16, Inputs 9, Pagination 7, Drawer 4, Card 1, Tabs 1.
    assert.equal(fields.length, 38, `${theme}: field discovery changed; update the count with the specimens that moved`);
    assert.ok(fields.some((f) => f.disabled), `${theme}: no disabled field reached the walk`);
  }
});

test('no field in a component gallery is shown on the page ground', () => {
  for (const theme of THEMES) {
    assert.deepEqual(stranded(readings[theme].fields), [],
      `${theme}: a field is drawn on the page ground, where its own paint is`);
  }
});

test('the gate rejects a field left on the page ground', () => {
  assert.deepEqual(stranded([{ story: 'fx:A', path: 'div > input.ui-input', onPage: false }]), []);
  assert.deepEqual(
    stranded([{ story: 'fx:A', path: 'div > input.ui-input', onPage: true }]),
    ['fx:A → div > input.ui-input'],
  );
});

/* What a text field reads on the card, off and on, per theme, so a token move
 * changes a number here and a person decides whether it is acceptable.
 *
 * `edge` is the field's border against the card — --disabled-border off and
 * --field-edge on. Both are below the 3:1 non-text floor, which WCAG 1.4.11
 * exempts a disabled control from and the kit's hairline has never reached on a
 * near-black page, so they are recorded rather than asserted against a bar. What
 * IS asserted is the gap between them, below. `ink` is the field's colour on its
 * own paint and must clear AA off as well as on: that is the part a reader has to
 * read. What these replaced, and the dark theme's headroom, are in
 * docs/foundations.md#colour-and-contrast.
 */
const DISABLED = {
  dark: { ground: '#211e2d', fill: '#211e2d', border: '#2d293c', edge: 1.16, ink: 6.24 },
  light: { ground: '#ffffff', fill: '#ffffff', border: '#e4e7ee', edge: 1.24, ink: 6.11 },
};

/* The same field on. `border` is --field-edge and holds wherever the field is put;
 * `onCard` is what it reads on the card, which is the ground the disabled reading
 * above is taken on and so the only one the two can be compared on. A field also
 * reaches the floating surface — a drawer's form — and the grounds the walk finds
 * are recorded in GROUNDS below rather than left to a count. */
const ENABLED = {
  dark: { border: '#332f45', onCard: { ground: '#211e2d', fill: '#211e2d', edge: 1.27 } },
  light: { border: '#cdd2dc', onCard: { ground: '#ffffff', fill: '#ffffff', edge: 1.52 } },
};

// Every ground an enabled text field is drawn on in the galleries: the card, and
// the floating surface a drawer's form sits on. A new one lands here deliberately.
const GROUNDS = { dark: ['#211e2d', '#2a2639'], light: ['#ffffff'] };

/* The three controls that draw a box out of --field-edge and --disabled-border:
 * the text field, the textarea and the select. The select is here because the box
 * it draws is the kit's and the fade over it is the browser's, and #564 is the
 * argument between them; the pager's size select is the one the galleries show
 * off, and BOXED_CENSUS below is what says it is still there. A checkbox takes
 * --control-edge and a switch track is allowed to fade, so neither is read here. */
const BOXED = ['input.ui-input', 'select.ui-select', 'textarea.ui-textarea'];
const kindOf = (f) => BOXED.find((kind) => f.leaf.startsWith(kind)) || null;

/** Every boxed field the walk found in one state. An invalid one is left out:
 *  its border is --pink, which is the error talking and not the state. */
const boxedFields = (theme, disabled) => readings[theme].fields.filter((f) => (
  f.disabled === disabled && kindOf(f) && !f.leaf.includes('is-invalid')
));

/* How many of each the galleries draw, per state. A gate that stopped seeing the
 * disabled select would otherwise report the same green as one that measured it. */
const BOXED_CENSUS = {
  'input.ui-input': { on: 9, off: 1 },
  'select.ui-select': { on: 6, off: 1 },
  'textarea.ui-textarea': { on: 1, off: 0 },
};

test('the galleries still draw every boxed field this gate argues about', () => {
  for (const theme of THEMES) {
    const census = Object.fromEntries(BOXED.map((kind) => [kind, { on: 0, off: 0 }]));
    for (const f of readings[theme].fields) {
      const kind = kindOf(f);
      if (!kind || f.leaf.includes('is-invalid')) continue;
      census[kind][f.disabled ? 'off' : 'on'] += 1;
    }
    assert.deepEqual(
      census, BOXED_CENSUS,
      `${theme}: the boxed specimens moved. The counts are this gate's coverage — the one `
      + 'disabled select in the galleries is the whole subject of #564 — so a specimen that '
      + 'left takes a measurement with it. Move the count with the specimen.',
    );
  }
});

/** What is wrong with one reading's opacity, as lines. */
const unfaded = (f) => (f.fade >= 0.999 ? [] : [
  `${f.leaf} is drawn at opacity ${f.fade}, which takes its edge and its words down together`,
]);

/* Rule: the kit answers an unavailable control with other colours, never with a
 * fade — the words a reader typed are still the words. The browser does not agree
 * on its own: Chromium fades a disabled select, and only a declaration of the
 * kit's own outranks that. So every boxed field, off and on, is drawn at full
 * opacity, and this is the reading UA_FADES_SELECTS exists to make answerable.
 *
 * Why a fade and not a quieter colour: guidelines/accessibility-floor.md,
 * disabled-legibility. Decided in #564.
 */
test('no boxed field is faded, in either state or either theme', () => {
  for (const theme of THEMES) {
    for (const f of [...boxedFields(theme, true), ...boxedFields(theme, false)]) {
      assert.deepEqual(
        unfaded(f), [],
        `${theme}: ${f.story} draws a faded field, so its state is a fade and not a paint`,
      );
    }
  }
});

test('a disabled field is read on the card, and its ink clears AA there', () => {
  for (const theme of THEMES) {
    const expected = DISABLED[theme];
    const boxed = boxedFields(theme, true);
    assert.ok(boxed.length >= 1, `${theme}: no disabled text field in the walk`);
    for (const f of boxed) {
      assert.deepEqual(
        { ground: f.ground, fill: f.fill, border: f.border, edge: f.edge, ink: f.ink },
        expected,
        `${theme}: the disabled field's reading moved — review it by hand`,
      );
      assert.ok(f.ink >= AA_TEXT, `${theme}: disabled ink ${f.ink}:1 is below AA on the field's own paint`);
    }
  }
});

/** What is wrong with one off/on pair, as lines. One expression, so the claim below
 *  and the mutation after it run the same code rather than two spellings of it. */
const fainter = (off, on) => [
  off.edge < on.edge ? null
    : `edge ${off.edge}:1 off against ${on.edge}:1 on — off has to be the fainter`,
  off.border === on.border
    ? `both states draw ${off.border}, so only the words tell them apart` : null,
].filter(Boolean);

/* Rule: a field that is off draws the fainter edge of the two, in both themes, so
 * the box and not only the words reports the state. Why dark's gap is the smaller,
 * and what it cost: docs/foundations.md#colour-and-contrast, decided in #564.
 *
 * Limits beyond the walk's own: the subject is the text field, which is the control
 * that carries --field-edge. A checkbox takes --control-edge and a switch track
 * fades, so neither is read here.
 */
test('a disabled field draws a fainter edge than an enabled one, in both themes', () => {
  for (const theme of THEMES) {
    const on = boxedFields(theme, false);
    const off = boxedFields(theme, true);
    assert.ok(on.length >= 1, `${theme}: no enabled text field in the walk`);
    assert.ok(off.length >= 1, `${theme}: no disabled text field in the walk`);

    assert.deepEqual(
      [...new Set(on.map((f) => f.ground))].sort(), [...GROUNDS[theme]].sort(),
      `${theme}: an enabled field is drawn on a ground this ledger does not record`,
    );
    for (const f of on) {
      assert.equal(f.border, ENABLED[theme].border,
        `${theme}: an enabled field's edge is ${f.border}, not --field-edge, at ${f.story}`);
      if (f.ground !== ENABLED[theme].onCard.ground) continue;
      assert.deepEqual(
        { ground: f.ground, fill: f.fill, edge: f.edge },
        ENABLED[theme].onCard,
        `${theme}: the enabled field's reading on the card moved — review it by hand`,
      );
    }
    // Measured against measured, never ledger against ledger: two constants
    // compare the same whatever the sheet says, which is a gate that cannot fail.
    const onCard = on.filter((f) => f.ground === ENABLED[theme].onCard.ground);
    assert.ok(onCard.length >= 1, `${theme}: no enabled text field on the card in the walk`);
    for (const f of off) {
      for (const live of onCard) {
        assert.deepEqual(fainter(f, live), [],
          `${theme}: a disabled field does not read as off beside the live one`);
      }
    }
  }
});

test('the gate rejects a disabled edge that matches the enabled one', () => {
  const live = { edge: 1.27, border: '#332f45' };
  assert.deepEqual(fainter({ edge: 1.16, border: '#2d293c' }, live), []);
  // The state #564 fixed: one token answering both, so the pair is identical.
  assert.deepEqual(fainter({ edge: 1.27, border: '#332f45' }, live), [
    'edge 1.27:1 off against 1.27:1 on — off has to be the fainter',
    'both states draw #332f45, so only the words tell them apart',
  ]);
  // And a disabled edge that went the other way, stronger than the live one.
  assert.deepEqual(fainter({ edge: 1.52, border: '#453f5c' }, live), [
    'edge 1.52:1 off against 1.27:1 on — off has to be the fainter',
  ]);
});

/* The kit's own disabled select, on a card, read twice: as the kit ships and with
 * the one declaration that answers the browser taken out. The walk above is the
 * coverage; this is the rejection proof, and it has to go through the cascade
 * rather than through the checker, because what #564 fixed is a cascade result.
 *
 * The fixture is built from the kit's factories, so it is the component and not a
 * drawing of one. The numbers on the stripped side are the ones the independent
 * review of #567 measured in Chromium, and the browser half below takes them
 * again from the engine itself.
 */
test('the gate rejects a select the browser is left free to fade', () => {
  const html = card({
    body: `<div>${select({ options: ['Off'], ariaLabel: 'Rows per page', disabled: true })}</div>`,
  });
  const FADED = {
    dark: { fade: 0.7, edge: 1.11, ink: 3.78 },
    light: { fade: 0.7, edge: 1.16, ink: 3.15 },
  };

  for (const theme of THEMES) {
    const strip = (css) => {
      const out = css.replace(RESET, '$1');
      assert.notEqual(
        out, css,
        'The mutation changed nothing, so the two readings below are one reading twice. The '
        + 'kit no longer writes the reset where RESET looks for it — move the pattern with '
        + 'the declaration, or this proof is theatre.',
      );
      return out;
    };
    const fixture = 'fixture:disabled select on a card';
    const [kept] = stage(theme).read(html, fixture).filter((f) => f.leaf.startsWith('select.ui-select'));
    const [lost] = stage(theme, strip).read(html, fixture).filter((f) => f.leaf.startsWith('select.ui-select'));
    assert.ok(kept && lost, `${theme}: the fixture drew no select`);

    assert.deepEqual(
      { fade: kept.fade, edge: kept.edge, ink: kept.ink },
      { fade: 1, edge: DISABLED[theme].edge, ink: DISABLED[theme].ink },
      `${theme}: the kit's disabled select does not read what its disabled text field reads`,
    );
    assert.deepEqual(unfaded(kept), []);

    assert.deepEqual(
      { fade: lost.fade, edge: lost.edge, ink: lost.ink }, FADED[theme],
      `${theme}: without the reset the select did NOT come back faded, so the assertions above `
      + 'would pass over the state #564 fixed and this gate proves nothing.',
    );
    assert.notDeepEqual(unfaded(lost), []);
    assert.ok(
      lost.ink < AA_TEXT,
      `${theme}: the faded select's words read ${lost.ink}:1, which clears AA — the cost this `
      + 'gate is here to hold is that they do not.',
    );
  }
});

/* -- The browser half ------------------------------------------------------- *
 *
 * Everything above runs in JSDOM, which ships no user-agent stylesheet: the fade
 * it measures is UA_FADES_SELECTS, a declaration this file writes out of Chromium's
 * and installs itself. That is the largest limit here, and it is the one an engine
 * answers — so this half puts the same galleries in front of a real browser and
 * asks it. It is OFF unless FIELD_PAINT=1, because Playwright is deliberately not
 * a dependency of this package and CI drives no browser; the measurement is run by
 * hand and reported in the pull request, as AGENTS.md says.
 *
 *   UI_PLAYWRIGHT=… UI_CHROME=… FIELD_PAINT=1 node --test stories/field-ground.test.js
 */

const RUN_BROWSER = process.env.FIELD_PAINT === '1';

/** Read in the page: every boxed field in one piece of markup, and its ground. */
const PROBE = ({ html, selector }) => {
  document.body.innerHTML = html;
  const layersUnder = (start) => {
    const layers = [];
    for (let node = start; node && node.nodeType === 1; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return 'IMAGE';
      const parts = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number);
      if (parts.length < 3) continue;
      const alpha = parts.length > 3 ? parts[3] : 1;
      if (alpha > 0) {
        layers.push([parts[0], parts[1], parts[2], alpha]);
        if (alpha >= 0.999) break;
      }
    }
    return layers;
  };
  return [...document.querySelectorAll(selector)].map((el) => {
    const cs = getComputedStyle(el);
    return {
      leaf: el.tagName.toLowerCase() + (el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : ''),
      disabled: el.disabled === true,
      opacity: cs.opacity,
      border: cs.borderTopColor,
      ink: cs.color,
      fill: cs.backgroundColor,
      under: layersUnder(el.parentElement),
    };
  });
};

/** One in-page reading, turned into the same numbers the walk above produces. */
function resolve(row) {
  if (!Array.isArray(row.under) || !row.under.length) return null;
  const layers = [...row.under];
  let ground = layers.pop();
  if (ground[3] < 0.999) ground = composite(ground, [255, 255, 255, 1]);
  while (layers.length) ground = composite(layers.pop(), ground);
  const fade = Number(row.opacity);
  let fill = parseColour(row.fill);
  if (fill && fill[3] < 0.999) fill = composite(fill, ground);
  fill = fadeOnto(fill, fade, ground);
  const border = fadeOnto(parseColour(row.border), fade, ground);
  const inkOn = fill && fill[3] >= 0.999 ? fill : ground;
  const ink = fadeOnto(parseColour(row.ink), fade, inkOn);
  return {
    leaf: row.leaf,
    disabled: row.disabled,
    fade: Number.isFinite(fade) ? fade : 1,
    ground: hex(ground),
    fill: fill ? hex(fill) : null,
    border: border && border[3] > 0 ? hex(border) : null,
    edge: border && border[3] > 0 ? Number(ratio(border, ground).toFixed(2)) : null,
    ink: ink ? Number(ratio(ink, inkOn).toFixed(2)) : null,
  };
}

test('measured in a browser, with its own stylesheet under the kit\'s', { skip: !RUN_BROWSER && 'set FIELD_PAINT=1' }, async (t) => {
  // The two rig helpers the kit's other browser gate already owns: the stylesheet
  // with its @imports inlined, because setContent has no server, and whatever
  // Playwright this host has. Neither is about tap zones.
  const { kitStylesheet, playwright } = await import('./lib/tap-zone.js');

  const pw = await playwright();
  assert.ok(
    pw,
    'FIELD_PAINT=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one — '
    + 'scripts/evidence/README.md has the recipe — or leave the variable unset. A browser gate '
    + 'that quietly skipped would report the same green as one that measured.',
  );

  const subjects = [];
  for (const rel of GALLERIES) {
    const mod = await import(path.join(root, 'stories', rel));
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || def.render;
      if (typeof render !== 'function') continue;
      const args = { ...def.args, ...story.args };
      const out = serialize(render(args, { globals: { theme: 'dark' }, args }));
      assert.notEqual(out, null, `${rel}:${name} did not render to markup`);
      subjects.push({ id: `${rel}:${name}`, html: out });
    }
  }
  assert.ok(
    subjects.length >= 110,
    `${subjects.length} gallery stories rendered. The sweep is the coverage, and one that `
    + 'collapsed to a handful would pass while measuring almost nothing.',
  );

  const browser = await pw.chromium.launch({
    // UI_CHROME is the evidence rig's variable; a host whose Playwright shipped its
    // own browsers needs neither.
    executablePath: process.env.UI_CHROME || undefined,
    args: ['--no-sandbox'],
  });

  /** Every boxed field in every gallery, as one browser at one viewport sees it. */
  const sweep = async (theme, css) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    try {
      const page = await ctx.newPage();
      await page.setContent(
        `<!doctype html><html lang="en" data-theme="${theme}"><head><style>`
        + 'html,body{margin:0;padding:0}' + css + '</style></head><body></body></html>',
      );
      const rows = [];
      for (const s of subjects) {
        const got = await page.evaluate(PROBE, { html: s.html, selector: BOXED.map((k) => `.${k.split('.')[1]}`).join(', ') });
        for (const row of got) {
          const reading = resolve(row);
          if (reading) rows.push({ story: s.id, ...reading });
        }
      }
      return rows;
    } finally {
      await ctx.close();
    }
  };

  try {
    for (const theme of THEMES) {
      const css = kitStylesheet();
      const stripped = css.replace(RESET, '$1');
      assert.notEqual(stripped, css, 'The mutation changed nothing; move RESET with the declaration.');

      const kept = await sweep(theme, css);
      const lost = await sweep(theme, stripped);
      assert.equal(kept.length, lost.length, 'The two passes found different numbers of fields.');

      const off = (rows) => rows.filter((f) => f.disabled && !f.leaf.includes('is-invalid'));
      const selects = (rows) => off(rows).filter((f) => f.leaf.startsWith('select.ui-select'));
      assert.equal(
        selects(kept).length, BOXED_CENSUS['select.ui-select'].off,
        `${theme}: the browser found ${selects(kept).length} disabled selects, not `
        + `${BOXED_CENSUS['select.ui-select'].off}. An unmeasured subject is a failure here too.`,
      );

      await t.test(`${theme}: an engine's disabled select reads what the ledger says`, () => {
        for (const f of off(kept)) {
          assert.deepEqual(
            { fade: f.fade, ground: f.ground, fill: f.fill, edge: f.edge, ink: f.ink },
            {
              fade: 1,
              ground: DISABLED[theme].ground,
              fill: DISABLED[theme].fill,
              edge: DISABLED[theme].edge,
              ink: DISABLED[theme].ink,
            },
            `${theme}: ${f.story} → ${f.leaf} is not painted the way the ledger records, in a `
            + 'real engine. The ledger is read by hand; review the number, do not regenerate it.',
          );
        }
      });

      await t.test(`${theme}: and would read the browser's fade without the kit's answer`, () => {
        const faded = selects(lost);
        for (const f of faded) {
          assert.equal(
            f.fade, 0.7,
            `${theme}: with the reset gone the engine did not fade ${f.leaf}, so this half `
            + 'proves nothing about the state #564 fixed.',
          );
          assert.ok(
            f.edge < DISABLED[theme].edge && f.ink < AA_TEXT,
            `${theme}: the faded select read edge ${f.edge}:1 and words ${f.ink}:1 — the cost `
            + 'this gate holds is that both fall, and the words below AA.',
          );
          t.diagnostic(`${theme} faded select: edge ${f.edge}:1, words ${f.ink}:1`);
        }
      });
    }
  } finally {
    await browser.close();
  }
});
