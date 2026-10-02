/* Rule: react/dist/index.css must not change what the kit's own sheets already decided.
 *
 * A consumer loads `apliteni-ui/css` then `apliteni-ui/react/css`, so a sheet a React module
 * imports out of src/styles/ is re-emitted after the kit's own copy and wins at equal
 * specificity — which cost `.ui-pager__size-select` its compact geometry. Two claims over
 * the re-emitted sheets, walked out of the entry rather than enumerated: none may decide an
 * ordinary property, and the document a consumer gets must read the same as that document
 * with the re-emitted copies removed. Each test states its own limits.
 *
 * Resolve the winning declarations before measuring the result.
 * why: #551, docs/specification.md#the-react-stylesheet-does-not-re-emit-a-kit-sheet
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  STYLE_FILES, desugar, expandAnchors, installDomGlobals, selectorPath, storyFiles,
  substitute, tokensFor,
} from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (rel) => path.join(root, rel);
const read = (rel) => readFileSync(at(rel), 'utf8');
/** Blank a comment out without moving a line, so file:line stays honest. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const THEMES = [...new Set([...read('src/tokens/tokens.css')
  .matchAll(/:root\[data-theme="([\w-]+)"\]/g)].map((m) => m[1]))];

// ---- the bundle, reconstructed -------------------------------------------

const REACT_ENTRY = 'react/src/index.ts';

/**
 * The stylesheets tsup concatenates into react/dist/index.css, in that order.
 *
 * esbuild emits a module's CSS where the module is reached, so this is a
 * depth-first post-order walk of the entry's relative imports — first visit wins,
 * which is what makes a sheet two components import appear once. Both `import` and
 * `export … from` are followed: the entry is almost entirely re-exports, and a walk
 * that reads only `import` sees the three nets and stops.
 */
function bundleSheets(entry = REACT_ENTRY) {
  const sheets = [];
  const seen = new Set();
  const visit = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    if (rel.endsWith('.css')) { sheets.push(rel); return; }
    const dir = path.posix.dirname(rel);
    const text = decomment(read(rel));
    const refs = [...text.matchAll(
      /(?:^|\n)\s*(?:import|export)\s+(?:[^'"\n]*?from\s*)?["']([^'"]+)["']/g,
    )].map((m) => m[1]);
    for (const ref of refs) {
      if (!ref.startsWith('.')) continue;
      const target = path.posix.normalize(path.posix.join(dir, ref));
      for (const c of [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`]) {
        if (existsSync(at(c)) && statSync(at(c)).isFile()) { visit(c); break; }
      }
    }
  };
  visit(entry);
  return sheets;
}

const BUNDLE = bundleSheets();
const KIT = new Set(STYLE_FILES);
/** The kit's own sheets, shipped a second time inside the React bundle. */
const REEMITTED = BUNDLE.filter((rel) => KIT.has(rel));

// ---- rules, and which of them a cascade ranks ----------------------------

const RULE = /([^{}]+)\{([^{}]*)\}/g;
const DECL = /(?:^|;)\s*([-\w]+)\s*:([^;]*)/g;

/** Split a selector list at its top-level commas only. why: #521 */
function selectorParts(list) {
  const parts = [];
  let depth = 0;
  let buf = '';
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(buf); buf = ''; continue; }
    buf += ch;
  }
  parts.push(buf);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Every rule of these sheets that sits outside any at-block, with the ordinary
 * (non-custom) properties it declares.
 *
 * Outside, because that is the set a browser decides on specificity and source order
 * alone — the contest a second copy of a sheet enters. A custom property is left out:
 * it is substituted away before any of this reaches a document, and the sheet that
 * declares one is not thereby deciding a property's value.
 */
function rankableRules(sheets) {
  const out = [];
  for (const rel of sheets) {
    // One nesting level is all the kit writes, and all esbuild emits.
    const css = decomment(read(rel)).replace(/@[\w-]+[^{]*\{(?:[^{}]*\{[^{}]*\}\s*)*[^{}]*\}/g, '');
    for (const [, selector, body] of css.matchAll(RULE)) {
      if (selector.trimStart().startsWith('@')) continue;
      const props = [...body.matchAll(DECL)]
        .map((m) => m[1].toLowerCase()).filter((p) => !p.startsWith('--'));
      if (!props.length) continue;
      out.push({ sheet: rel, selector: selector.replace(/\s+/g, ' ').trim(), body, props });
    }
  }
  return out;
}

// A probe for expanding a shorthand into the longhands JSDOM computes: `background:`
// reaches background-position, which is how #551 moved the chevron. Read out of
// cssstyle rather than from a table here, so the two cannot disagree.
const probe = new JSDOM('<!doctype html><html><body><i></i></body></html>').window
  .document.querySelector('i');

/** The properties these rules can move, shorthands resolved to longhands. */
function watchedProperties(rules) {
  const out = new Set();
  for (const { body } of rules) {
    for (const [, name, value] of body.matchAll(DECL)) {
      const prop = name.toLowerCase();
      if (prop.startsWith('--')) continue;
      out.add(prop);
      probe.style.cssText = '';
      probe.style.setProperty(prop, value.replace(/!important/i, '').trim());
      for (let k = 0; k < probe.style.length; k++) out.add(probe.style.item(k));
    }
  }
  return out;
}

/** The selectors those rules reach with, in a form querySelectorAll accepts. */
const reachOf = (rules) => [...new Set(rules.flatMap(({ selector }) => selectorParts(selector)
  // A pseudo-element draws no box of its own in JSDOM; its rule's subject is the
  // element it hangs off, which is what the comparison can read.
  .map((p) => p.replace(/::[\w-]+(\([^)]*\))?/g, '').trim()).filter(Boolean)))];

// ---- the two documents ---------------------------------------------------

/**
 * The spellings of one selector that esbuild and the source may differ on: it drops
 * the quotes in `[type="search"]`, collapses a run of space, and closes up the padding
 * inside `:where( … )` that the kit writes a long selector list across lines with.
 * Space between two compound selectors is a combinator and is left alone.
 */
const normalise = (sel) => sel.replace(/\s+/g, ' ')
  .replace(/(\[[\w-]+)([~^$*|]?=)"([^"]*)"/g, '$1$2$3')
  .replace(/([([])\s+/g, '$1').replace(/\s+([)\]])/g, '$1')
  .trim();
const selectorsOf = (css) => [...decomment(css).matchAll(RULE)]
  .map(([, sel]) => normalise(sel)).filter((sel) => !sel.startsWith('@'));

/** One sheet list, resolved into the dialect JSDOM can rank. */
const document_ = (sheets, vars) =>
  expandAnchors(desugar(substitute(decomment(sheets.map(read).join('\n')), vars)));

function window_(css, theme) {
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  return new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
    + '<body></body></html>',
    { pretendToBeVisual: true, virtualConsole: quiet },
  ).window;
}

/** Storybook's HTML renderer hands back a string or a node. Accept those two. */
function serialize(out) {
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') {
    if (typeof out.outerHTML === 'string') return out.outerHTML;
    if (out.nodeType === 11) return [...out.childNodes].map((n) => n.outerHTML ?? n.textContent).join('');
    if (out.nodeType === 3) return out.textContent;
  }
  return null;
}

/**
 * Mount every story into both documents and report every property a re-emitted kit
 * rule moves.
 *
 * Two narrowings, both exact rather than a sample. A re-emitted rule can only move a
 * property it declares, so only those are read; and it can only reach an element one
 * of its own selectors matches, so only those are compared. An inherited property
 * changes on the element the rule matched before it changes on any child, so the child
 * reports nothing the parent did not.
 *
 * `bundle` is a parameter so the mutation below can put a kit sheet back where tsup
 * used to emit it and watch this come back non-empty. Both documents come out of one
 * pipeline and differ in exactly one thing: whether the re-emitted copies are in the
 * second half.
 */
async function sweep(bundle) {
  const reemitted = new Set(bundle.filter((rel) => KIT.has(rel)));
  const rules = rankableRules([...reemitted]);
  const watched = [...watchedProperties(rules)];
  const reach = reachOf(rules);

  const findings = [];
  const problems = [];
  const stories = new Set();
  const stats = {
    reemitted: [...reemitted], rankable: rules.length, watched, reach, compared: 0,
  };
  // Nothing a cascade ranks, so nothing to mount: every element would come back
  // identical because the two documents differ only in rules JSDOM never applies.
  // The claim above this one is what holds that case, and the mutation is what proves
  // this walk fires when there is something to walk.
  if (!rules.length) return { findings, problems, stories, stats };

  for (const theme of THEMES) {
    const vars = tokensFor(theme);
    const asShipped = window_(document_([...STYLE_FILES, ...bundle], vars), theme);
    const withoutCopies = window_(
      document_([...STYLE_FILES, ...bundle.filter((rel) => !reemitted.has(rel))], vars), theme,
    );
    installDomGlobals(asShipped);

    for (const rel of storyFiles) {
      const mod = await import(at(path.join('stories', rel)));
      const def = mod.default || {};
      for (const [name, story] of Object.entries(mod)) {
        if (name === 'default' || !story || typeof story !== 'object') continue;
        const render = story.render || def.render;
        if (typeof render !== 'function') continue;
        const args = { ...def.args, ...story.args };
        let raw;
        try {
          raw = serialize(render(args, { globals: { theme }, args }));
        } catch (err) {
          problems.push(`${rel}:${name} [${theme}] → render threw: ${err && err.message}`);
          continue;
        }
        if (raw == null) {
          problems.push(`${rel}:${name} [${theme}] → render returned nothing to mount`);
          continue;
        }
        // A story's own markup speaks var() in style= attributes, and JSDOM resolves
        // none. Both documents get the identical substituted string.
        const html = desugar(substitute(raw, vars));
        stories.add(`${rel}:${name}`);
        asShipped.document.body.innerHTML = html;
        withoutCopies.document.body.innerHTML = html;

        const shipped = [...asShipped.document.body.querySelectorAll('*')];
        const clean = [...withoutCopies.document.body.querySelectorAll('*')];
        assert.equal(shipped.length, clean.length,
          `${rel}:${name} mounted a different tree into the two documents — the comparison `
          + 'pairs elements by position and this pair cannot be made');

        for (let i = 0; i < shipped.length; i++) {
          const el = shipped[i];
          if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') continue;
          if (!reach.some((sel) => { try { return el.matches(sel); } catch { return false; } })) continue;
          stats.compared += 1;
          const a = asShipped.getComputedStyle(el);
          const b = withoutCopies.getComputedStyle(clean[i]);
          for (const prop of watched) {
            const got = a.getPropertyValue(prop);
            const want = b.getPropertyValue(prop);
            if (got === want) continue;
            findings.push(
              `${selectorPath(el)}  ${prop}: ${want || '(unset)'} → ${got || '(unset)'}`
              + `  [${theme}, ${rel}:${name}]`,
            );
          }
        }
      }
    }
  }
  return { findings, problems, stories, stats };
}

const SWEEP = await sweep(BUNDLE);

// ---- the sweep is looking at something ----------------------------------

test('the gate found the React bundle and the kit it is layered over', () => {
  assert.ok(BUNDLE.length >= 8,
    `the walk of ${REACT_ENTRY} found ${BUNDLE.length} stylesheets. The React workspace ships `
    + 'more than that, so the import walk is broken rather than the workspace, and every claim '
    + `below would pass over a bundle nobody read. Found: ${BUNDLE.join(', ') || '(nothing)'}`);
  assert.ok(STYLE_FILES.length >= 30,
    `src/index.css yielded ${STYLE_FILES.length} kit sheets. The first half of both documents is `
    + 'that list; short, and the kit rule a re-emitted copy would outrank is simply absent.');
  assert.ok(REEMITTED.length >= 1,
    'react/src imports no sheet from src/styles/ at all, so there is no re-emission to judge and '
    + 'both claims below are about an empty set. The three nets are supposed to be there, and '
    + `react/src/index.ts says why. Bundle: ${BUNDLE.join(', ')}`);
  assert.ok(storyFiles.length >= 30,
    `the catalogue came back as ${storyFiles.length} story files; the measured claim walks that `
    + 'list and a short one is a walk that has stopped finding stories');
});

// ---- the claim, over every re-emitted sheet -----------------------------

test('no kit sheet the React bundle re-emits decides an ordinary property', () => {
  // Limits: a rule inside an at-block is outside this, and outside the walk below —
  // JSDOM evaluates no media query. Refusing the declaration outside one is what makes
  // the pair sound: the three nets put every declaration they make behind a query.
  const offences = rankableRules(REEMITTED).map(({ sheet, selector, props }) =>
    `${sheet}  ${selector} { ${props.join('; ')} }`);
  assert.deepEqual(
    offences, [],
    'a kit stylesheet the React bundle re-emits declares an ordinary property in a rule a browser '
    + 'ranks on specificity and source order alone. A consumer loads `apliteni-ui/css` first, so '
    + 'that copy lands after the kit\'s own and wins — which is how `.ui-pager__size-select` lost '
    + 'its compact geometry to a re-emitted input.css (#551). Stop importing the sheet from '
    + 'react/src: the kit CSS is a peer the consumer already loads, not a dependency of a React '
    + 'component. A counter-rule in react/src would only move the contest.\n  '
    + offences.join('\n  '),
  );
});

// ---- the claim, measured on the document a consumer gets ----------------

test('no re-emitted kit rule moves a property in the document a consumer gets', () => {
  // Limits: these are winning declarations, not pixels — JSDOM paints nothing, and the
  // browser evidence for the pager is in the PR. A var() the token files do not declare
  // stays unresolved in both documents, so a difference hiding inside one is invisible.
  // Only the at-rest reading is compared; state rules are desugared to attribute
  // selectors that match nothing, in both documents alike.
  assert.deepEqual(SWEEP.problems, [],
    'a story would not render into the two documents. A story that cannot be mounted is a subject '
    + 'this gate did not measure, not one it may skip:\n  ' + SWEEP.problems.join('\n  '));

  // The walk runs exactly when there is a rankable re-emitted rule for it to catch,
  // and the two facts have to agree or one of them is stale.
  if (SWEEP.stats.rankable === 0) {
    assert.equal(SWEEP.stories.size, 0);
    assert.equal(SWEEP.stats.compared, 0,
      'the walk compared elements although it reported no rankable re-emitted rule');
  } else {
    assert.ok(SWEEP.stories.size >= 60,
      `only ${SWEEP.stories.size} stories were mounted; the catalogue is larger, so most of the `
      + 'kit went unmeasured');
    assert.ok(SWEEP.stats.compared > 0,
      `${SWEEP.stats.rankable} re-emitted rules reach ${SWEEP.stats.reach.length} selectors and `
      + 'not one of them matched an element in any story. Either the walk mounts nothing or the '
      + 'selectors are unaskable, and every element went unread.');
  }

  assert.deepEqual(
    SWEEP.findings, [],
    'a kit stylesheet re-emitted into react/dist/index.css lands after the kit\'s own copy and '
    + 'wins, changing a property the kit had already settled.\n  '
    + `re-emitted: ${SWEEP.stats.reemitted.join(', ') || '(none)'}\n  `
    + SWEEP.findings.join('\n  '),
  );
});

test("the pager's size control keeps the compact geometry pagination.css gives it", () => {
  // #551's own reading, named rather than left to the claims above: this is the
  // control the issue measured and these are the properties it measured. Read on every
  // run, whatever the bundle happens to carry.
  const vars = tokensFor('dark');
  const consumer = window_(document_([...STYLE_FILES, ...BUNDLE], vars), 'dark');
  const kitOnly = window_(document_(STYLE_FILES, vars), 'dark');
  const got = pagerReading(consumer);
  const want = pagerReading(kitOnly);
  assert.ok(Object.values(want).every(Boolean),
    `the kit-only document gives .ui-pager__size-select no geometry at all (${JSON.stringify(want)}), `
    + 'so this comparison has no baseline and would pass against an unstyled control');
  assert.deepEqual(got, want,
    'the pager size control reads differently in a React app than in the vanilla kit. It sits in a '
    + 'row of `sm` buttons; at the kit + react/dist values of #551 it is a full-size form field in '
    + 'that row.');
});

const PAGER_PROPS = ['width', 'padding-right', 'font-size', 'border-radius', 'background-position'];
function pagerReading(win) {
  win.document.body.innerHTML = '<div class="ui-pager">'
    + '<select class="ui-select ui-pager__size-select"><option>25</option></select></div>';
  const style = win.getComputedStyle(win.document.querySelector('.ui-pager__size-select'));
  return Object.fromEntries(PAGER_PROPS.map((p) => [p, style.getPropertyValue(p)]));
}

// ---- the mutation -------------------------------------------------------

test('putting input.css back where tsup emitted it brings #551 back', async () => {
  // The defect, reproduced on demand. Before the fix Field, Checkbox, Switch and
  // SearchField imported src/styles/input.css, so tsup emitted it after the nets and
  // before react's own sheets; this puts it back in that position and nowhere else.
  const SHEET = 'src/styles/input.css';
  assert.ok(KIT.has(SHEET),
    `${SHEET} is no longer one of src/index.css's imports, so re-emitting it is no longer the `
    + 'mutation this gate claims to reject');
  assert.ok(!BUNDLE.includes(SHEET),
    `${SHEET} is in the React bundle again — the fix for #551 has been reverted, and this test can `
    + 'no longer tell a planted defect from the shipped one');

  const lastKit = Math.max(-1, ...BUNDLE.map((rel, i) => (KIT.has(rel) ? i : -1)));
  const mutated = [...BUNDLE];
  mutated.splice(lastKit + 1, 0, SHEET);

  // 1. The total claim rejects it.
  assert.ok(rankableRules([SHEET]).length > 0,
    `${SHEET} declares no ordinary property outside an at-block, so the first claim would accept `
    + 'it and the sheet that caused #551 would pass');

  // 2. The measured claim finds it on the control #551 measured.
  const { findings, problems, stats } = await sweep(mutated);
  assert.deepEqual(problems, [],
    `the mutated walk could not mount every story: ${problems.join('; ')}`);
  assert.ok(stats.compared > 0, 'the mutated walk compared no elements at all');
  const pager = findings.filter((f) => f.includes('ui-pager__size-select'));
  assert.ok(pager.length > 0,
    `re-emitting ${SHEET} was not caught on .ui-pager__size-select, the control #551 measured. `
    + `The walk reported: ${findings.slice(0, 8).join(' | ') || '(nothing at all)'}`);
  for (const prop of PAGER_PROPS) {
    assert.ok(pager.some((f) => f.includes(` ${prop}: `)),
      `#551 measured ${prop} moving on .ui-pager__size-select and this walk did not see it: `
      + pager.join(' | '));
  }

  // 3. And the pager's own reading moves, exactly as the issue recorded.
  const vars = tokensFor('dark');
  const before = pagerReading(window_(document_(STYLE_FILES, vars), 'dark'));
  const after = pagerReading(window_(document_([...STYLE_FILES, ...mutated], vars), 'dark'));
  assert.notDeepEqual(after, before,
    `re-emitting ${SHEET} left .ui-pager__size-select reading identically, so the comparison the `
    + 'acceptance criterion rests on cannot fail');
});

// ---- the reconstruction is the real thing -------------------------------

test('the reconstruction matches the built bundle', (t) => {
  const built = 'react/dist/index.css';
  if (!existsSync(at(built))) {
    // Not a silent skip. react/dist is gitignored build output and `npm test` runs
    // before `npm run build -w react`, so this check belongs to a run where a build
    // has happened. No claim above needs it.
    assert.ok(read('.gitignore').split('\n').some((l) => l.trim() === 'react/dist/'),
      `${built} is absent and react/dist is not in .gitignore either, so the absence is `
      + 'unexplained — the build may simply be broken');
    t.skip(`${built} is not built in this run; \`npm run build -w react\` checks the reconstruction`);
    return;
  }
  assert.deepEqual(selectorsOf(BUNDLE.map(read).join('\n')), selectorsOf(read(built)),
    `the sheets walked out of ${REACT_ENTRY} do not reproduce ${built}, selector for selector and `
    + 'in order. The walk models how esbuild emits CSS, and the document this gate builds is only '
    + 'the document a consumer gets while that holds. Fix the walk, not this assertion.');
});
