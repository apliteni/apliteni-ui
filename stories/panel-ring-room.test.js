// Rule: a menu panel does not cut off its rows' focus ring.
//
// The kit ring is drawn OUTSIDE the border box of the thing that has focus — one pixel
// of gap and two of ring, from --ring-gap-width and --ring-width. A row that fills its
// panel edge to edge therefore draws it on the panel's border and past it. There are two
// ways for that ring to survive: the panel keeps the three pixels inside its own box as
// padding, so the ring lands in the padding; or the panel clips nothing, and the ring
// crosses its edge. A panel that does neither cuts the ring away.
//
// #519 is what that cost. `.amenu`, the topbar's account menu, was the one menu in the
// kit with no padding AND `overflow: hidden`, so its rows had a single pixel for a
// three-pixel ring. #487 had just given those rows `box-shadow: var(--ring)`, and the
// reader got two accent bars above and below the row instead of a ring around it. The
// other two menus take the first way out and nothing said why, which is the hole this
// closes: `.ui-dropdown__panel` pads by --ui-dropdown-pad and `.vsw__menu` by the same
// six pixels. `.amenu` takes the second; the choice between them is recorded on #519.
//
// Subjects are discovered twice and the two readings have to agree. One is the kit's own
// sources: every place under src/ and react/src/ that writes `data-dropdown-panel` into
// markup, named by the first class the marked element carries. The other is this file's
// fixtures, read back out of the DOM. A factory that marks a fourth panel is in the first
// and not the second, so the gate stops until somebody renders it here and measures it.
//
// Coverage limits:
// - This reads the stylesheet, not a browser: it measures no pixels and cannot see what a
//   consumer's own CSS does to the panel. Chrome measured the ring for #519.
// - Only the panel's own base rule is read, for padding and for overflow. What a media
//   query or a state class changes is not seen, nor padding on a wrapper between the
//   panel and its rows.
// - A panel that clips nothing itself may still sit inside an ancestor that clips. None
//   of these three does; this gate asks the panel, not its ancestors.
// - Only the first class on a marked element is read: the one the panel's own sheet
//   styles it under. A second — `dropdown({ panelClass })` — is the caller's to answer for.
// - The marked element is found by walking the source for tags and attribute lists, not
//   by running a parser. Attribute order does not matter, a `>` inside an attribute's own
//   expression does not end the element and a `<` inside a string does not start one; but
//   a marker this walk cannot tie to exactly one class attribute stops the gate rather
//   than being named by whatever class is nearest.
// - Comments are told from text by a second walk, also not a parser. A `//` or `/*` inside
//   a string, a template or a regex literal is markup and stays; a comment is blanked, and
//   so is a regex literal the walk is sure of, which the markup walk could not read. Which
//   of a regex and a division a `/` opens is read off the code before it: a value divides,
//   a keyword and a control statement's head do not. Source that walk cannot finish stops
//   the gate rather than being read half lexed; a `/` it cannot be sure of, and an
//   apostrophe in JSX text it takes for a string, cost the stripping of that one line.
// - A `/` the walk is sure of and reads the wrong way round is the one thing that costs code
//   silently, so what it reads a control head from is a closed list: the keywords below and
//   the two pairs that open one, `else if` and `for await`. #598 is that cost twice, once for
//   `if (…)` and once for the pairs. The check against a parser is by hand, and on #598.
// - The source reading covers src/ and react/src/, the trees the package ships. A panel
//   hand-written into an example page is not read; those pages compose the factories.
// - It does not ask whether the rows take the ring at all. `.vopt:focus-visible` never
//   names `.vsw__menu`, so pairing a panel to its rows from the selectors alone would
//   be guesswork. stories/focus-ring.test.js is the gate that asks every stop for a
//   ring; this one asks the panel to let it be drawn.
//
// why: docs/components.md#a-menu-panel-does-not-cut-off-its-rows-ring
// Weaken the rule and confirm that its test fails.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// The kit's factories want a document in scope before they are imported.
const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}

const { dropdown } = await import('../src/components/dropdown.js');
const { versionSwitcher, accountMenu } = await import('../src/components/topbar.js');

/* -- the subjects, read out of the kit's sources --------------------------------- */

const sourceFiles = ['src', 'react/src'].flatMap((base) => readdirSync(base, { recursive: true })
  .map(String).filter((file) => /\.(js|mjs|ts|tsx)$/.test(file) && !/\.test\./.test(file))
  .map((file) => `${base}/${file}`));

/** The characters JavaScript ends a line with, and so the characters a line comment ends at. */
const ENDS_LINE = /[\n\r\u2028\u2029]/;

/**
 * Comments out, newlines kept, so prose about the attribute is never read as markup.
 *
 * A walk, not a pair of regexes: `//` and `/*` open a comment in code only. In a string or
 * a template they are text the markup keeps — `data-help="//example.test/help"` is an
 * attribute — and blanking the rest of that line takes a real marker beside it with it,
 * which is #579. Regex literals are walked for the same reason the other way round:
 * `/[&<>"]/` carries a quote that opens no string, and a walk that read one would take the
 * code after it for string text and strip no comment out of it.
 *
 * A walk that does not end in code has lost its place in the file, so it says so rather
 * than handing back a reading of it.
 */
const code = (text, file = 'a source') => {
  const out = text.split('');
  const blank = (from, to) => { for (let i = from; i < to; i += 1) if (!ENDS_LINE.test(out[i])) out[i] = ' '; };
  const lost = (where) => new Error(`${file}: this gate cannot tell this source's code from its text — ${where}`);
  // Which of the two a `/` opens is read off the code before it. A value divides and nothing
  // else does: a name, a number, a string, a template, a `]`, and a `)` that closed a call.
  // A keyword is no value, and nor is the `)` of a control statement's head, so each `(`
  // records whether a control keyword opened it. Read as division, `if (x) /[/*]/.test(y)`
  // hands that `/*` to the comment walk, which blanks on to the next closing pair (#598);
  // read as a regex, a division swallows its line and leaves a real comment standing.
  const AFTER_VALUE = /[)\]'"`]/;
  const KEYWORD = /^(?:return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/;
  const CONTROL = /^(?:if|for|while|switch|catch|with)$/;
  // The two pairs the language opens a control head with. Nothing ended a token at whitespace
  // until #598 was reviewed, so `else if` read as one word `elseif` and `for await` as
  // `forawait`; neither is a control keyword, so the `/` after their head divided (#598).
  const COMPOUND = /^(?:else if|for await)$/;
  // A regex the walk is sure of is blanked like a comment, because the markup walk after it
  // knows quotes and brackets and nothing of regexes: `esc()`'s `/[&<>"]/` would open a
  // string in it. It is sure after an operator, an opener, a keyword or a control head;
  // after a `<` or a `}` it is reading JSX as often as code — `</span>`, `{...rest} />` —
  // and there it leaves every character alone, because blanking between two such slashes
  // takes the markup between them with it.
  const SURE = /[=(,;:?!&|+\-*%^~{[]/;
  const nested = [];       // the brace depth of each template an interpolation sits inside
  const heads = [];        // for each `(` still open, whether a control head opened it
  let mode = 'code';       // code, the quote of the string being read, or regex
  let depth = 0;           // braces opened since the innermost `${`
  let last = '';           // the last code character that is not whitespace
  let word = '';           // the identifier this character is still inside, if it is one
  let tok = '';            // the identifier just finished; '' past anything but whitespace
  let pre = '';            // the one before that, so the two pairs above read as one head
  let inClass = false;     // inside a regex's `[…]`, where a `/` is literal
  let opened = -1;         // where the regex being read opened, if it is one for sure
  let head = false;        // that character is the `)` of a control statement's head
  // Any character that is not part of an identifier ends the one being read. A code character
  // also empties what the walk remembers of it: no identifier stands beside the next one.
  const read = (ch) => {
    if (/[\w$]/.test(ch)) word += ch;
    else { word = ''; tok = ''; pre = ''; }
    last = ch;
    head = false;
  };
  // Whitespace and a comment end a token without standing between two, so each keeps what it
  // ended: `near` is the identifier before this character, `before` the one before that.
  const ended = () => { if (word) { pre = tok; tok = word; word = ''; } };
  const near = () => word || tok;
  const before = () => (word ? tok : pre);
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (mode === '\'' || mode === '"') {
      // No string holds a raw line break, so a quote this walk misread — an apostrophe in
      // JSX text — costs the rest of its own line and no more.
      if (ch === '\\') i += 1;
      else if (ch === mode || ENDS_LINE.test(ch)) { mode = 'code'; read(ch); }
    } else if (mode === '`') {
      if (ch === '\\') i += 1;
      else if (ch === '`') { mode = 'code'; read(ch); }
      else if (ch === '$' && text[i + 1] === '{') { nested.push(depth); depth = 0; mode = 'code'; read('{'); i += 1; }
    } else if (mode === 'regex') {
      // A regex holds no raw line break either, which is where a misread `/` gives up — and
      // gives up without blanking, because what it read may be code.
      if (ch === '\\') i += 1;
      else if (ENDS_LINE.test(ch)) mode = 'code';
      else if (inClass) inClass = ch !== ']';
      else if (ch === '[') inClass = true;
      else if (ch === '/') { if (opened !== -1) blank(opened, i + 1); mode = 'code'; read('/'); }
    } else if (ch === '/' && text[i + 1] === '/') {
      // A comment opens on `//` wherever code may hold a `/`: no regex is empty. It ends at
      // the line's end, every character that ends one, so a file written with CR alone does
      // not lose the code below its first comment.
      ended();
      let stop = i;
      while (stop < text.length && !ENDS_LINE.test(text[stop])) stop += 1;
      blank(i, stop);
      i = stop - 1;
    } else if (ch === '/' && text[i + 1] === '*') {
      // `else/* why */if (…)` is a control head too: a comment between two keywords ends the
      // first of them without standing between them, the way whitespace does.
      ended();
      const close = text.indexOf('*/', i + 2);
      // A block comment with no end is not source this gate can read: blanking to the end of
      // the file would take every panel below it away silently.
      if (close === -1) throw lost('a block comment is never closed');
      blank(i, close + 2);
      i = close + 1;
    } else if (ch === '\'' || ch === '"' || ch === '`') {
      mode = ch;
    } else if (ch === '/' && (near() ? KEYWORD.test(near()) : head || !AFTER_VALUE.test(last))) {
      mode = 'regex';
      inClass = false;
      opened = head || SURE.test(last) || KEYWORD.test(near()) ? i : -1;
    } else if (!/\s/.test(ch)) {
      if (ch === '{') depth += 1;
      else if (ch === '}' && depth) depth -= 1;
      else if (ch === '}' && nested.length) { depth = nested.pop(); mode = '`'; continue; }
      else if (ch === '(') heads.push(CONTROL.test(near()) || COMPOUND.test(`${before()} ${near()}`));
      const closed = ch === ')' && heads.pop() === true;
      read(ch);
      head = closed;
    } else {
      ended();
    }
  }
  if (mode !== 'code' || nested.length) {
    const inside = mode === 'regex' ? 'a regex' : mode === 'code' ? 'a template interpolation' : 'a string';
    throw lost(`the walk reaches the end of the file inside ${inside}`);
  }
  return out.join('');
};

/**
 * The attribute groups a source holds: every `<tag …>` and every `[…]` list, as spans.
 *
 * One pass that knows quotes from code, so a `>` inside an attribute's own expression —
 * `onClick={(e) => …}` — does not end a tag, and a `<` inside a string does not open one.
 * Both shapes exist because the kit writes a panel's attributes both ways: in the tag
 * itself, and — in `dropdown()` — as a list of attribute strings spread into one tag.
 */
const groupsIn = (text) => {
  const spans = [];
  const stack = [];
  const open = (kind, close, start) => stack.push({ kind, close, start });
  const shut = (at) => {
    const done = stack.pop();
    if (done.kind) spans.push({ start: done.start, end: at });
  };
  // A tag head: `<` then a name then whitespace, `/` or `>`. `i < len` is not one, and
  // a type argument that looks like one closes on its own `>` without holding a marker.
  const head = /^<[A-Za-z][\w.:-]*(?=[\s/>])/;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const cur = stack[stack.length - 1];
    const inside = cur ? cur.close : '';
    if (inside === '\'' || inside === '"') {
      if (ch === '\\') i += 1;
      else if (ch === inside) shut(i);
      continue;
    }
    if (inside === '`') {
      if (ch === '\\') { i += 1; continue; }
      if (ch === '`') { shut(i); continue; }
      // `${` is code again; a tag may open in the markup around it, nothing else does.
      if (ch === '$' && text[i + 1] === '{') { open(null, '}', i); i += 1; continue; }
      if (ch === '<' && head.test(text.slice(i))) open('tag', '>', i);
      continue;
    }
    if (ch === inside) { shut(i); continue; }
    if (ch === '\'' || ch === '"' || ch === '`') open(null, ch, i);
    else if (ch === '(') open(null, ')', i);
    else if (ch === '{') open(null, '}', i);
    else if (ch === '[') open('list', ']', i);
    else if (ch === '<' && head.test(text.slice(i))) open('tag', '>', i);
  }
  return spans;
};

/**
 * Every panel a source marks, by the class its own sheet styles it under.
 *
 * The attribute written into markup is the subject; `[data-dropdown-panel]` inside a
 * selector string is the wiring reading it back, and is skipped. The name comes from the
 * class attribute of the group the marker is in — the marked element's own tag, or the
 * attribute list spread into it — so the two may stand in either order, and a class on
 * an element around the marked one is not mistaken for the panel's. The group has to
 * carry exactly one class attribute, and its first class literal is the panel's own:
 * `class="amenu"`, `class="${esc(cx('ui-dropdown__panel', …))}"` and
 * `className={cx('ui-dropdown__panel', …)}` all start with it. A marker this gate cannot
 * tie to one class attribute stops the gate rather than being named by a neighbour.
 */
const panelsIn = (text, file = 'a source') => {
  const src = code(text, file);
  const groups = groupsIn(src);
  const found = [];
  for (const mark of src.matchAll(/(?<![[\w-])data-dropdown-panel(?![\w-\]])/g)) {
    const at = mark.index;
    const holding = groups.filter((g) => g.start < at && at < g.end);
    const where = `${file}:${src.slice(0, at).split('\n').length} marks a panel`;
    assert.ok(holding.length, `${where}: the marker is in no element or attribute list this gate can read`);
    const group = holding.reduce((a, b) => (b.end - b.start < a.end - a.start ? b : a));
    const attrs = src.slice(group.start, group.end);
    const classes = [...attrs.matchAll(/(?<![\w-])class(?:Name)?\s*=/g)];
    assert.equal(classes.length, 1,
      `${where}: the marked element carries ${classes.length} class attributes, and this gate names a panel by one`);
    const name = /['"`]\s*([a-z][\w-]*)/.exec(attrs.slice(classes[0].index));
    assert.ok(name, `${where}: this gate cannot read the marked element's class`);
    found.push(name[1]);
  }
  return [...new Set(found)].sort();
};

/** name -> the files that mark it, so a failure says where the panel came from. */
const declared = (() => {
  const found = new Map();
  for (const file of sourceFiles) {
    for (const name of panelsIn(readFileSync(file, 'utf8'), file)) {
      found.set(name, [...(found.get(name) ?? []), file]);
    }
  }
  return found;
})();

/* -- the subjects, rendered here -------------------------------------------------- */

const items = [{ label: 'Germany', value: 'de', selected: true }, { label: 'France', value: 'fr' }];
const markup = [
  dropdown({ label: 'country:', variant: 'select', items }),
  dropdown({ label: 'country:', variant: 'select', search: { placeholder: 'Search' }, items }),
  versionSwitcher([{ label: 'v1', meta: 'old' }, { label: 'v2', meta: 'now' }], 1),
  accountMenu({ name: 'Ada Lovelace', email: 'ada@apliteni.com' }),
].join('');

/** Every panel the wiring opens here, named by the class its own sheet styles it under. */
const rendered = (() => {
  const host = dom.window.document.createElement('div');
  host.innerHTML = markup;
  const found = new Set();
  for (const el of host.querySelectorAll('[data-dropdown-panel]')) {
    // The first class is the element's own; `is-scroll` and the portal flag are states.
    found.add(el.classList[0]);
  }
  return [...found].sort();
})();

/* -- the stylesheets ------------------------------------------------------------ */

const files = ['src', 'react/src'].flatMap((base) => readdirSync(base, { recursive: true })
  .filter((file) => String(file).endsWith('.css')).map((file) => `${base}/${file}`));
const rules = files.flatMap((file) => {
  // Comments out, newlines kept, so a declaration inside one is never read as code.
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector]) => !selector.trim().startsWith('@'))
    .map((m) => ({ file, selector: m[1].trim(), body: m[2] }));
});

const declaration = (body, prop) => {
  const found = [...body.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]+)/g)].filter(([, name]) => name === prop);
  return found.length ? found[found.length - 1][2].trim() : null;
};

/** px, or a var() the same rule declares — which is how both padded panels write it. */
const px = (value, body) => {
  const resolved = value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (whole, name) => declaration(body, name) ?? whole).trim();
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(resolved);
  if (match) return Number(match[1]);
  // A bare zero needs no unit, and is the shape a panel that pads by nothing writes.
  return /^0+(?:\.0+)?$/.test(resolved) ? 0 : null;
};

/** The smallest of the four sides a `padding` shorthand sets, in px. */
const roomIn = (rule) => {
  const value = declaration(rule.body, 'padding');
  if (value === null) return 0;
  const sides = value.split(/\s+/).map((part) => px(part, rule.body));
  return sides.some((side) => side === null) ? null : Math.min(...sides);
};

const baseRule = (name) => rules.find((r) => r.selector === `.${name}`);

/** 1px of gap and 2px of ring: what --ring draws outside the border box. */
const spread = (() => {
  const tokens = readFileSync('src/tokens/tokens.css', 'utf8');
  const read = (name) => Number(/^\s*(-?\d+(?:\.\d+)?)px$/.exec(
    new RegExp(`${name}\\s*:\\s*([^;]+)`).exec(tokens)[1],
  )[1]);
  return read('--ring-gap-width') + read('--ring-width');
})();

/* -- what the gate asserts, as functions the mutations below can call -------------- */

/** The two readings have to name the same panels. Throws with the side that is short. */
const reconcile = (fromSource, here) => {
  const unmeasured = [...fromSource.keys()].filter((name) => !here.includes(name)).sort();
  assert.deepEqual(unmeasured, [], unmeasured.length
    ? `a factory marks a panel this gate never renders, so nothing measures it:\n  ${
      unmeasured.map((name) => `.${name} in ${fromSource.get(name).join(', ')}`).join('\n  ')
    }\n  render it in the fixtures above and read the measurement below.`
    : '');
  const unsourced = here.filter((name) => !fromSource.has(name)).sort();
  assert.deepEqual(unsourced, [],
    `a fixture renders a panel no source marks: ${unsourced.map((n) => `.${n}`).join(', ')
    }; the source reading has broken, or the factory has gone.`);
};

/** Whether a rule clips at its own edge: any overflow side it writes that is not visible. */
const clipsIn = (rule) => ['overflow', 'overflow-x', 'overflow-y'].some((prop) => {
  const value = declaration(rule.body, prop);
  return value !== null && value.split(/\s+/).some((side) => side !== 'visible');
});

/**
 * The panels that cut a row's ring off, named with the rule that does it. `find` is injectable.
 *
 * Either way out is enough: room inside the box, or no clip at its edge. Only a panel that
 * clips AND keeps less than the ring's spread inside it is reported.
 */
const cutsOff = (names, find = baseRule) => names.map((name) => {
  const rule = find(name);
  assert.ok(rule, `no base rule for .${name}; this gate reads the panel's own rule and found none`);
  const room = roomIn(rule);
  assert.notEqual(room, null, `.${name} writes a padding this gate cannot resolve to px: ${declaration(rule.body, 'padding')}`);
  if (!clipsIn(rule)) return null;
  return room < spread
    ? `.${name} in ${rule.file}: clips at its edge with ${room}px of padding for a ${spread}px ring`
    : null;
}).filter(Boolean);

/* -- the gate -------------------------------------------------------------------- */

test('every panel the kit marks is a panel this gate renders', () => {
  reconcile(declared, rendered);
  assert.ok(rendered.length >= 3, `only ${rendered.length} panel(s) found; the kit has had three since #519,`
    + ' so a reading that finds fewer has broken rather than the kit having shrunk');
  assert.equal(spread, 3, 'the ring\'s spread changed; every panel\'s padding has to be re-read against it');
});

test('no panel cuts its rows\' focus ring off', () => {
  assert.deepEqual(cutsOff(rendered), [],
    `a menu panel clips its rows' focus ring away:\n  ${cutsOff(rendered).join('\n  ')}\n`
    + '  give the panel the ring\'s spread as padding, or stop it clipping.');
});

test('the gate fails when the account menu clips again, and not when a padded panel does', () => {
  // The #519 state, exactly: a panel that clips with no padding, which is what `.amenu`
  // was before it kept room for the ring. A fixture rather than `baseRule('amenu')`: #489
  // gave the live rule a legitimate overflow and #519's own padding fix now keeps it from
  // clipping, so reading the shipped rule here would couple this detector proof to CSS
  // that is free to keep changing. The fixture reproduces the #519 case on its own terms.
  const rule = { file: 'src/styles/topbar.css', selector: '.fixture', body: '' };
  const clipped = { ...rule, body: 'overflow: hidden;' };
  assert.equal(clipsIn(clipped), true, 'the fixture has to clip for the mutation to mean anything');
  assert.equal(roomIn(clipped), 0, 'the fixture has to pad by nothing for the mutation to mean anything');
  assert.deepEqual(cutsOff(['amenu'], () => clipped),
    [`.amenu in ${rule.file}: clips at its edge with 0px of padding for a 3px ring`],
    'putting a clip on an unpadded panel has to be reported');

  // And the other way out is real: the same clip over a panel that keeps the room passes.
  const padded = { ...rule, body: `padding: ${spread}px; overflow: hidden;` };
  assert.deepEqual(cutsOff(['amenu'], () => padded), [],
    'a panel that keeps the ring\'s spread inside its own box may clip at its edge');
});

test('the gate fails when a factory marks a panel nobody measured', () => {
  // A fourth factory as one would be written, and the clipping edge-to-edge rule that
  // goes with forgetting this guarantee. Both live in these strings; nothing is written.
  const source = 'export const reviewMenu = ({ name }) => `<div class="review" data-dropdown>'
    + '<button class="review__btn" data-dropdown-trigger>${name}</button>'
    + '<div class="review__menu" data-dropdown-panel role="menu">${rows()}</div></div>`;';
  assert.deepEqual(panelsIn(source), ['review__menu'],
    'the source reading no longer picks a panel\'s own class out of a factory');

  // It is in the source reading and not in the fixtures, so the first test stops.
  const added = new Map([...declared, ['review__menu', ['src/components/review.js']]]);
  assert.throws(() => reconcile(added, rendered), /never renders/,
    'a factory can mark a panel this gate does not render and still pass');

  // And had somebody rendered it, its own clipping rule reads as cutting the ring off.
  const sheet = { file: 'src/styles/review.css', selector: '.review__menu', body: 'overflow: hidden; border-radius: var(--radius-md);' };
  assert.deepEqual(cutsOff(['review__menu'], () => sheet),
    ['.review__menu in src/styles/review.css: clips at its edge with 0px of padding for a 3px ring'],
    'an unpadded, clipping panel has to read as cutting the ring off');
});

test('the gate reads the marked element, not the nearest class before it', () => {
  // The marker before its own class, inside a wrapper that carries a class already in the
  // fixtures. Reading the last class attribute before the marker calls this panel `.amenu`
  // and measures nothing; the element's own attributes name it whichever order they are in.
  const source = 'export const reviewMenu = () => `<div class="amenu">'
    + '<div data-dropdown-panel class="review-extra-menu" role="menu"><button>Review</button></div></div>`;';
  assert.deepEqual(panelsIn(source), ['review-extra-menu'],
    'a panel marked before its class has to be named by its own class, not by the element around it');

  const added = new Map([...declared, ['review-extra-menu', ['src/components/review.js']]]);
  assert.throws(() => reconcile(added, rendered), /never renders/,
    'a panel marked before its class can pass as one the fixtures already measure');

  // And the unpadded, clipping rule that goes with it reads as cutting the ring off.
  const sheet = { file: 'src/styles/review.css', selector: '.review-extra-menu', body: 'overflow: hidden; padding: 0;' };
  assert.deepEqual(cutsOff(['review-extra-menu'], () => sheet),
    ['.review-extra-menu in src/styles/review.css: clips at its edge with 0px of padding for a 3px ring'],
    'a clipping panel that pads by a bare zero has to read as cutting the ring off');
});

test('the gate reads a quoted // as markup and a comment as a comment', () => {
  // #579: comment stripping blanked from any `//` to the line's end, quoted or not. A
  // protocol-relative URL in an attribute took the marker standing beside it with it, and
  // the panel it marked was discovered by nobody.
  const url = 'export const reviewMenu = () => `<div data-help="//example.test/help"'
    + ' data-dropdown-panel class="review-extra-menu" role="menu"><button>Review</button></div>`;';
  assert.deepEqual(panelsIn(url), ['review-extra-menu'],
    'a quoted // before a marker has to leave the marker readable');

  // `/*` the same way, and with no closing pair it used to blank the rest of the file.
  const block = 'export const reviewMenu = () => `<div data-tip="6px /* not a comment"'
    + ' data-dropdown-panel class="review-extra-menu"><button>Review</button></div>`;';
  assert.deepEqual(panelsIn(block), ['review-extra-menu'],
    'a quoted /* before a marker has to leave the marker readable');

  // Either way it is a panel the fixtures never render, so the reconciliation stops. The
  // clipping rule that goes with it reads as cutting the ring off; the test above proves that.
  const added = new Map([...declared, ['review-extra-menu', ['src/components/review.js']]]);
  assert.throws(() => reconcile(added, rendered), /never renders/,
    'a panel marked after a quoted // can pass as one the fixtures already measure');

  // And the stripping is still stripping: a comment that writes the attribute marks nothing,
  // alone on its line, after a quoted // on the same line, and in a block.
  const prose = '// A panel carries data-dropdown-panel, which this gate reads.\n'
    + 'const help = "//example.test/help"; // data-dropdown-panel in prose beside it\n'
    + '/* data-dropdown-panel in a block comment */\n'
    + 'export const plain = () => `<div class="review-extra-menu"></div>`;';
  assert.deepEqual(panelsIn(prose), [],
    'prose that names the attribute has to mark no panel');

  // A comment ends at every character that ends a line in JavaScript, not only at a newline:
  // a source written with CR alone lost every panel below its first comment to one `//`.
  assert.deepEqual(panelsIn('// A panel carries data-dropdown-panel, which this gate reads.\r'
    + 'export const reviewMenu = () => `<div data-dropdown-panel class="review-extra-menu"></div>`;'),
    ['review-extra-menu'],
    'a line comment has to end at a lone CR, not run to the end of the file');

  // And a source the walk cannot finish stops the gate rather than being read half lexed:
  // a template with no end, and a block comment with no end — blanking that one to the end
  // of the file would take every panel below it away without a word.
  assert.throws(() => panelsIn('const open = `<div data-dropdown-panel class="x">', 'src/components/review.js'),
    /cannot tell this source's code from its text/,
    'an unfinished template has to stop the gate, not be read as far as the walk got');
  assert.throws(() => panelsIn('/* unfinished\nexport const reviewMenu = () =>'
    + ' `<div data-dropdown-panel class="review-extra-menu"></div>`;', 'src/components/review.js'),
    /a block comment is never closed/,
    'an unfinished block comment has to stop the gate, not blank the rest of the file');
});

test('the gate tells a regex literal after a control statement from a division', () => {
  const panel = 'export const reviewMenu = () =>'
    + ' `<div data-dropdown-panel class="review-extra-menu" role="menu"><button>Review</button></div>`;';

  // #598: the walk read the `/` after a control statement's head as division, because the
  // character before it is a `)`. This source is valid JavaScript, and the `/*` inside the
  // character class then opened a comment that ran to the real comment's closing pair,
  // blanking the factory between them. `panelsIn` found no panel and said nothing; the gate
  // passed all six of its tests with a panel nobody had measured.
  assert.deepEqual(panelsIn(`if (true) /[/*]/.test("x");\n${panel}\n/* genuine trailing comment */`),
    ['review-extra-menu'],
    'a regex after a control statement\'s head is a regex, and the factory under it stands');

  // The same `)`, with a quote and with a backtick inside the regex: read as division, each
  // one opened a string or a template that ran on through the factory below it.
  assert.deepEqual(panelsIn(`for (const row of rows) /["]/.test(row); // data-dropdown-panel in prose\n${panel}`),
    ['review-extra-menu'],
    'a quote inside a regex after a control head opens no string, and the comment beside it still goes');
  assert.deepEqual(panelsIn(`while (next()) /[\`]/.test(next()); // data-dropdown-panel in prose\n${panel}`),
    ['review-extra-menu'],
    'the `)` of a call inside a control head leaves the head\'s own `)` to answer for it');

  // And the other way round, which the same heuristic got wrong in the other direction: a `/`
  // after a value divides, whatever the value is. Read as a regex it swallowed the rest of the
  // line, and the real comment behind it was left standing to be read as markup.
  assert.deepEqual(panelsIn(`const ratio = "4" / 2; // data-dropdown-panel in prose\n${panel}`),
    ['review-extra-menu'],
    'a division after a quoted value is division, and the comment after it is still blanked');
  assert.deepEqual(panelsIn(`const half = width(2) / 2; // data-dropdown-panel in prose\n${panel}`),
    ['review-extra-menu'],
    'a `)` that closed a call is a value, so the `/` after it divides');

  // A regex the walk is not sure of is walked and left alone, because in TSX a `/` after a
  // `}` or a `<` is as often JSX: here `{...rest} />` opens what the walk takes for a regex
  // and `/>` two tags later closes it, and blanking everything between the two would take
  // the marked element away. React's StatBand is written this way.
  const jsx = 'export const Row = ({ kids, ...rest }) => (\n'
    + '  <div><b {...rest} />{kids ? <i data-dropdown-panel className="review-extra-menu" /> : null}</div>\n'
    + '); // data-dropdown-panel in prose';
  assert.deepEqual(panelsIn(jsx), ['review-extra-menu'],
    'a slash the walk cannot be sure of has to cost the stripping of its line, never the markup');

  // Either way it is a panel the fixtures never render, so the reconciliation stops; the
  // clipping rule that goes with it reads as cutting the ring off, which the tests above prove.
  const added = new Map([...declared, ['review-extra-menu', ['src/components/review.js']]]);
  assert.throws(() => reconcile(added, rendered), /never renders/,
    'a panel behind a regex literal can pass as one the fixtures already measure');
});

test('the gate tells a regex after a compound control head from a division', () => {
  const panel = 'export const reviewMenu = () =>'
    + ' `<div data-dropdown-panel class="review-extra-menu" role="menu"><button>Review</button></div>`;';

  // #598, round two: whitespace ended no identifier, so `else if` read as one word `elseif`
  // and `for await` as `forawait`. Neither `(` was recorded as a head, the `/` after it
  // divided, and the `/*` in its character class blanked on to the real comment's closing
  // pair — taking the factory between them, with all seven of the gate's tests passing.
  assert.deepEqual(panelsIn(`if (false) {} else if (true) /[/*]/.test("x");\n${panel}\n/* genuine trailing comment */`),
    ['review-extra-menu'],
    'a regex after an `else if` head is a regex, and the factory under it stands');
  assert.deepEqual(panelsIn(`async function f(xs) { for await (const x of xs) /[/*]/.test(x); }\n${panel}\n`
    + '/* genuine trailing comment */'),
    ['review-extra-menu'],
    'a regex after a `for await` head is a regex, and the factory under it stands');

  // A comment between the two keywords ends the first of them the way whitespace does, so the
  // head is still a head: this source bypassed the gate as silently as the two above.
  assert.deepEqual(panelsIn(`if (a) {} else/* why */if (true) /[/*]/.test("x");\n${panel}\n`
    + '/* genuine trailing comment */'),
    ['review-extra-menu'],
    'a comment between `else` and `if` leaves the head it opens readable');

  // The boundary itself. `of` here opens a regex carrying a quote; merged into `constchof` it
  // divided, so the quote opened a string that ran to the line's end and left the comment
  // beside it standing to be read as markup.
  assert.deepEqual(panelsIn(`for (const ch of /["]/.source) count(ch); // data-dropdown-panel in prose\n${panel}`),
    ['review-extra-menu'],
    'whitespace ends an identifier, so the keyword before a regex is the one beside it');
  // The pairs are the two the language has, not every keyword before a name: read as a head,
  // this `(` would make the `/` after its `)` a regex that swallows the line.
  assert.deepEqual(panelsIn(`const since = new Date(stamp) / 1000; // data-dropdown-panel in prose\n${panel}`),
    ['review-extra-menu'],
    'a keyword before a name opens no control head, so the `/` after its call divides');

  // Either way it is a panel the fixtures never render, so the reconciliation stops; the
  // clipping rule that goes with it reads as cutting the ring off, which the tests above prove.
  const added = new Map([...declared, ['review-extra-menu', ['src/components/review.js']]]);
  assert.throws(() => reconcile(added, rendered), /never renders/,
    'a panel behind a regex after a compound head can pass as one the fixtures already measure');
});
