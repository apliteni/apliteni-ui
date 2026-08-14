/* Rule: a duration in the kit is a token, an easing is a token or `linear`, and
 * the only stylesheets allowed to write a number are the ones that say why.
 *
 * The drawer already held the reasoning — 250ms on cubic-bezier(0.4, 0, 0.2, 1),
 * transform and opacity only, visibility discrete on `linear` — and
 * stories/overlay-css.test.js held it for drawer.css and confirm.css and nothing
 * else, which is why twenty-six hand-written durations landed in the six sheets it
 * does not read. This gate reads all of them, and it finds them by walking the
 * tree rather than by holding a list.
 *
 * The vocabulary is NOT written here. It is read out of the table under
 * `## Motion` in docs/specification.md at run time, the way breakpoints.test.js
 * reads its steps: two copies of four numbers drift exactly the way twenty-six
 * literals in six files drifted.
 *
 * The numbers are resolved, not asserted. `--dur-med` is `var(--duration-normal,
 * 0.25s)` and `--duration-normal` is `250ms` in the generated brand file, so both
 * ends are followed and both have to agree with the table. A comment claiming
 * 250ms next to a token that resolves to 200 would pass a gate that read comments.
 *
 * why: docs/specification.md#motion
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const at = (rel) => path.join(root, rel);
const read = (rel) => readFileSync(at(rel), 'utf8');

/** Blank out comments, keeping newlines so line numbers stay true. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** A CSS time, in milliseconds. `0.25s` and `250ms` are the same number. */
const ms = (literal) => {
  const m = /^(-?\d*\.?\d+)(m?s)$/.exec(literal.trim());
  return m === null ? null : Number(m[1]) * (m[2] === 's' ? 1000 : 1);
};

/* -- The vocabulary, read from the specification rather than repeated -------- */

const SPEC = 'docs/specification.md';
const HEADING = '## Motion';

const section = (() => {
  const md = read(SPEC);
  const start = md.indexOf(`\n${HEADING}\n`);
  assert.ok(
    start !== -1,
    `${SPEC} no longer has a "${HEADING}" heading, and that section is where this gate reads the `
    + 'vocabulary it enforces. Rename it and the gate has nothing to check, so it fails loudly '
    + 'instead.',
  );
  const rest = md.slice(start + 1);
  const end = rest.indexOf('\n## ', 1);
  return end === -1 ? rest : rest.slice(0, end);
})();

/** Every `| `--dur-fast` | `150ms` |` row in that section's table, fastest first. */
const SCALE = [...section.matchAll(/^\|\s*`(--dur-[\w-]+)`\s*\|\s*`?(\d+m?s)`?\s*\|/gm)]
  .map(([, token, time]) => ({ token, ms: ms(time) }));

assert.ok(
  SCALE.length >= 2,
  `${SPEC} → "${HEADING}" lists fewer than two durations. The list is the first two cells of each `
  + 'table row, written as | `--dur-fast` | `150ms` |; a gate that read an empty vocabulary would '
  + 'pass over every transition in the kit and report the same green as one that checked them all.',
);
assert.deepStrictEqual(
  SCALE.map((s) => s.ms), [...SCALE.map((s) => s.ms)].sort((a, b) => a - b),
  `${SPEC} → "${HEADING}" lists its durations out of order. Fastest first — got `
  + `${SCALE.map((s) => `${s.token} ${s.ms}ms`).join(', ')}.`,
);

const DURATIONS = new Set(SCALE.map((s) => s.token));

/* -- The surfaces, swept rather than listed ---------------------------------- */

/** Every .css under a tree, at whatever depth it was put, as `{ where, text }`. */
const sheetsUnder = (dir) => {
  const out = [];
  for (const f of readdirSync(at(dir)).sort()) {
    const rel = `${dir}/${f}`;
    if (statSync(at(rel)).isDirectory()) out.push(...sheetsUnder(rel));
    else if (f.endsWith('.css')) out.push({ where: rel, text: read(rel) });
  }
  return out;
};

/** Both trees that ship CSS: the kit's own, and the React package's. */
const sheets = () => [...sheetsUnder('src'), ...sheetsUnder('react/src')];

/**
 * Every `transition` / `animation` declaration in the swept sheets.
 *
 * Comments are kept, because the two annotated kinds of animation carry their
 * reason in one — but they are read off the RAW line, so a `/* … *\/` cannot
 * smuggle a declaration in either.
 */
const declarations = () => {
  const found = [];
  for (const { where, text } of sheets()) {
    const lines = text.split('\n');
    const src = decomment(text);
    const net = netBlocks(src);
    for (const m of src.matchAll(/\b(transition|animation)(-duration|-property)?\s*:([^;}]*)/g)) {
      const line = src.slice(0, m.index).split('\n').length;
      found.push({
        where, line,
        kind: m[1],
        value: m[3].trim(),
        raw: lines[line - 1] ?? '',
        // A reduced-motion block legitimately writes 0.01ms; nothing else may.
        inNet: net.some(([from, to]) => m.index > from && m.index < to),
      });
    }
  }
  return found;
};

/** `[start, end]` of every `@media (prefers-reduced-motion …) { … }` block. */
const netBlocks = (src) => {
  const spans = [];
  for (const m of src.matchAll(/@media\b[^{]*prefers-reduced-motion[^{]*\{/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') depth -= 1;
      i += 1;
    }
    spans.push([m.index, i]);
  }
  return spans;
};

/** Drop every balanced `var( … )` group, leaving whatever was written by hand. */
const stripVars = (value) => {
  let out = '';
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value.startsWith('var(', i) && depth === 0) { depth = 1; i += 3; continue; }
    if (depth > 0) {
      if (value[i] === '(') depth += 1;
      else if (value[i] === ')') depth -= 1;
      continue;
    }
    out += value[i];
  }
  return out;
};

// Rebuilt at each use: a /g regex carries lastIndex between calls, so a shared
// one would answer `test()` differently every other time it was asked.
const literalTimes = (value) => value.match(/(?<![\w-])\d*\.?\d+m?s(?![\w-])/g);
const BARE_EASING = /(?<![\w-])(ease|ease-in|ease-out|ease-in-out|step-start|step-end)(?![\w-])/;
const RAW_CURVE = /(?<![\w-])(cubic-bezier|steps)\s*\(/;

const site = (d) => `${d.where}:${d.line}`;

/* -- The rule ---------------------------------------------------------------- */

test('every duration in the kit resolves to one the specification lists', () => {
  const tokens = read('src/tokens/tokens.css');
  const brand = read('src/tokens/brand.generated.css');

  for (const { token, ms: want } of SCALE) {
    const alias = new RegExp(`${token}\\s*:\\s*var\\(\\s*(--[\\w-]+)\\s*,\\s*([^)]+)\\)`).exec(tokens);
    assert.ok(
      alias,
      `${token} is documented under "${HEADING}" in ${SPEC} but src/tokens/tokens.css does not `
      + 'alias it onto a brand primitive with a fallback. The kit\'s names exist so that a sheet '
      + 'reads one vocabulary; the brand file owns the number.',
    );
    const [, primitive, fallback] = alias;

    assert.equal(
      ms(fallback), want,
      `${token}'s fallback in src/tokens/tokens.css is ${fallback.trim()} (${ms(fallback)}ms), but `
      + `${SPEC} says ${want}ms. The fallback is what a consumer importing tokens.css WITHOUT `
      + 'brand.generated.css gets, so it is a real duration and not a placeholder.',
    );

    const upstream = new RegExp(`${primitive}\\s*:\\s*([\\d.]+m?s)\\s*;`).exec(brand);
    assert.ok(upstream, `${primitive} is not defined in src/tokens/brand.generated.css`);
    assert.equal(
      ms(upstream[1]), want,
      `${token} resolves through ${primitive} to ${upstream[1]} (${ms(upstream[1])}ms), but ${SPEC} `
      + `says ${want}ms. Either the brand moved and the table did not follow, or the table is `
      + 'describing a kit that no longer exists — the sheets get the brand value, not the table.',
    );
  }
});

test('no transition writes its own duration', () => {
  const offences = declarations()
    .filter((d) => d.kind === 'transition')
    .filter((d) => !d.inNet)
    .map((d) => ({ d, times: literalTimes(stripVars(d.value)) }))
    .filter(({ times }) => times !== null)
    .map(({ d, times }) => `${site(d)}  ${times.join(', ')}  in  ${d.kind}: ${d.value.trim()}`);

  assert.deepStrictEqual(
    offences, [],
    'a transition writes a time instead of reading one. A transition is a response to something '
    + 'the reader did, and how long a response takes is a decision the kit makes once:\n  '
    + SCALE.map((s) => `${s.token} = ${s.ms}ms`).join('\n  ')
    + `\n  They are listed with what each times under "${HEADING}" in ${SPEC}.\n  `
    + offences.join('\n  '),
  );
});

test('no transition writes its own easing', () => {
  const offences = declarations()
    .filter((d) => d.kind === 'transition')
    .filter((d) => {
      const bare = stripVars(d.value);
      return BARE_EASING.test(bare) || RAW_CURVE.test(bare);
    })
    .map((d) => `${site(d)}  ${d.value.trim()}`);

  assert.deepStrictEqual(
    offences, [],
    'a transition names a curve of its own. `ease` is not `var(--ease)` — the CSS keyword is '
    + 'cubic-bezier(0.25, 0.1, 0.25, 1) and the kit\'s default is cubic-bezier(0.4, 0, 0.2, 1), so '
    + 'a bare keyword is a second motion vocabulary that looks like the first.\n'
    + '  Use --ease, --ease-out, --ease-in, --ease-sharp or --ease-spring — or `linear`, which is '
    + 'the right answer for a discrete property:\n  '
    + offences.join('\n  '),
  );
});

test('a visibility transition is timed `linear`, in every sheet', () => {
  const offences = [];
  for (const d of declarations()) {
    if (d.kind !== 'transition') continue;
    for (const part of d.value.split(',')) {
      if (!/(?<![\w-])visibility(?![\w-])/.test(part)) continue;
      if (/(?<![\w-])linear(?![\w-])/.test(part)) continue;
      offences.push(`${site(d)}  ${part.trim()}`);
    }
  }

  assert.deepStrictEqual(
    offences, [],
    'a discrete property is being eased. `visibility` holds its OLD value for the whole duration, '
    + 'so easing it buys nothing, and a curve whose output leaves [0, 1] — --ease-spring does, and '
    + 'the brand file recommends it for "modals, cards" — flips it in the middle of the fade. The '
    + 'drawer writes this out at length; it is true of every panel that hides itself:\n  '
    + offences.join('\n  '),
  );
});

test('an animation that keeps its own number says which kind it is and why', () => {
  const KINDS = /motion:\s*(ambient|choreographed)\s*[—-]\s*(\S[\s\S]{11,})/;

  const offences = declarations()
    .filter((d) => d.kind === 'animation')
    .filter((d) => !d.inNet)
    .filter((d) => literalTimes(stripVars(d.value)) !== null && !KINDS.test(d.raw))
    .map((d) => `${site(d)}  ${d.value.trim()}`);

  assert.deepStrictEqual(
    offences, [],
    'an animation writes a time with no note saying why a token would be the wrong unit. Two kinds '
    + 'keep their own numbers, and each says so at the declaration:\n'
    + '  /* motion: ambient — … */        no interaction origin, or a length set by something '
    + 'else: a loader that loops until the work returns, a countdown the caller sized\n'
    + '  /* motion: choreographed — … */  a fixed sequence whose parts are timed against each '
    + 'other, so retiming one piece breaks the other two\n'
    + `  Anything else is a response and reads a token. See "${HEADING}" in ${SPEC}.\n  `
    + offences.join('\n  '),
  );
});

/* -- The net reaches every bundle that ships motion --------------------------- */

const NET = 'src/styles/reduced-motion.css';

/** Every path this file pulls in, following `@import` and JS/TS `import`. */
const closure = (entry, seen = new Set()) => {
  if (seen.has(entry) || !existsSync(at(entry))) return seen;
  seen.add(entry);
  const dir = path.posix.dirname(entry);
  const text = read(entry);
  const refs = [
    ...[...text.matchAll(/@import\s+["']([^"']+)["']/g)].map((m) => m[1]),
    ...[...text.matchAll(/(?:^|\n)\s*import\s+(?:[^'"\n]*from\s*)?["']([^"']+)["']/g)].map((m) => m[1]),
  ];
  for (const ref of refs) {
    if (!ref.startsWith('.')) continue;
    const target = path.posix.normalize(path.posix.join(dir, ref));
    for (const c of [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`]) {
      if (existsSync(at(c)) && statSync(at(c)).isFile()) { closure(c, seen); break; }
    }
  }
  return seen;
};

/**
 * The stylesheet entries a consumer can import, discovered from package.json.
 *
 * `react/dist` is built output and does not exist in CI, so the React entry is
 * followed from its SOURCE — react/src/index.ts, whose CSS imports are what tsup
 * concatenates into that file. The build was the thing that proved this: the net
 * shows up in react/dist/index.css because index.ts imports it.
 */
const bundles = () => {
  const exports = JSON.parse(read('package.json')).exports;
  const out = [];
  for (const [name, target] of Object.entries(exports)) {
    const file = typeof target === 'string' ? target : target.default ?? target.import;
    if (typeof file !== 'string' || !file.endsWith('.css')) continue;
    const rel = file.replace(/^\.\//, '');
    const entry = rel.startsWith('react/dist/') ? 'react/src/index.ts' : rel;
    out.push({ name, entry, files: [...closure(entry)].filter((f) => f.endsWith('.css')) });
  }
  return out;
};

test('every published stylesheet that ships motion ships the net with it', () => {
  const all = bundles();
  assert.ok(all.length >= 2, 'fewer than two CSS entries were discovered in package.json exports');

  const offences = [];
  for (const { name, files } of all) {
    const moves = files.filter((f) => f !== NET
      && /\b(transition|animation)(-duration|-name)?\s*:/.test(decomment(read(f))));
    if (moves.length > 0 && !files.includes(NET)) {
      offences.push(`${name}  animates in ${moves.join(', ')}  but does not reach ${NET}`);
    }
  }

  assert.deepStrictEqual(
    offences, [],
    `a published entry ships motion with no prefers-reduced-motion net. Import ${NET} from the `
    + 'entry — it is one file precisely so a second bundle does not grow a second copy of it, and '
    + 'importing it twice costs nothing because every rule in it is idempotent and !important:\n  '
    + offences.join('\n  '),
  );
});

test('the React stylesheet is one of the entries this gate follows', () => {
  const react = bundles().find((b) => b.entry.startsWith('react/'));
  assert.ok(
    react,
    'no CSS entry under react/ was discovered in package.json exports. The React package ships its '
    + 'own stylesheet, and a consumer who imports only that one is the reason the net had to leave '
    + 'motion.css. If the entry moved, point this at it.',
  );
  assert.ok(
    react.files.includes(NET),
    `${react.name} no longer reaches ${NET}. It has no motion of its own today, so nothing would `
    + 'look broken — until the first transition lands in react/src and ships with no net.',
  );
});

/* -- The gate can see, and says so -------------------------------------------- */

test('both trees that ship CSS contribute a declaration', () => {
  const all = declarations();
  assert.ok(all.length > 0, 'no transition or animation was discovered — this gate checks nothing');

  const trees = new Set(all.map((d) => (d.where.startsWith('react/') ? 'react/src' : 'src')));
  assert.ok(
    trees.has('src'),
    'no motion was found in src/ — the sweep has stopped reading the kit\'s own stylesheets',
  );

  const reactSheets = sheetsUnder('react/src');
  assert.ok(
    reactSheets.length > 0,
    'no stylesheet was found under react/src, so the React half of this sweep is reading nothing. '
    + 'If the React package stopped shipping CSS, drop the tree and say why here.',
  );
});

test('every documented duration is one something uses', () => {
  const used = new Set();
  for (const { text } of sheets()) {
    for (const m of decomment(text).matchAll(/var\(\s*(--dur-[\w-]+)/g)) used.add(m[1]);
  }
  const dead = [...DURATIONS].filter((t) => !used.has(t));

  assert.deepStrictEqual(
    dead, [],
    `${SPEC} → "${HEADING}" documents a duration nothing times with: ${dead.join(', ')}.\n`
    + '  A step nobody uses is an aspiration in a table that is meant to describe the kit. Delete\n'
    + '  the row, or write the transition that needs it.',
  );
});

test('every duration a sheet uses is one the specification documents', () => {
  const offences = [];
  for (const { where, text } of sheets()) {
    const src = decomment(text);
    for (const m of src.matchAll(/var\(\s*(--dur-[\w-]+)/g)) {
      if (DURATIONS.has(m[1])) continue;
      offences.push(`${where}:${src.slice(0, m.index).split('\n').length}  ${m[1]}`);
    }
  }

  assert.deepStrictEqual(
    offences, [],
    'a sheet reads a --dur-* token the specification does not list. The table is the vocabulary; a '
    + `fifth speed invented at a use site is the drift this gate exists to stop. Add it to `
    + `"${HEADING}" in ${SPEC} with what it times, or use one of `
    + `${[...DURATIONS].join(', ')}:\n  ` + offences.join('\n  '),
  );
});
