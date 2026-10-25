/* The React bundle, reconstructed, and the sweep that compares it with the kit's own sheets.
 *
 * The sweep mounts every story into two JSDOM documents per theme and is CPU-bound, so
 * `sweep` deals one theme to a thread of stories/lib/job-pool.js and adds the answers up.
 * why: #551, #562
 */
import {
  existsSync, readFileSync, statSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  STYLE_FILES, desugar, expandAnchors, installDomGlobals, selectorPath, storyFiles,
  substitute, tokensFor,
} from './contrast.js';
import { runJobs } from './job-pool.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const at = (rel) => path.join(root, rel);
export const read = (rel) => readFileSync(at(rel), 'utf8');
/** Blank a comment out without moving a line, so file:line stays honest. */
export const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

export const THEMES = [...new Set([...read('src/tokens/tokens.css')
  .matchAll(/:root\[data-theme="([\w-]+)"\]/g)].map((m) => m[1]))];

// ---- the bundle, reconstructed -------------------------------------------

export const REACT_ENTRY = 'react/src/index.ts';

/**
 * The stylesheets tsup concatenates into react/dist/index.css, in that order.
 *
 * esbuild emits a module's CSS where the module is reached, so this is a
 * depth-first post-order walk of the entry's relative imports — first visit wins,
 * which is what makes a sheet two components import appear once. Both `import` and
 * `export … from` are followed: the entry is almost entirely re-exports, and a walk
 * that reads only `import` sees the three nets and stops.
 */
export function bundleSheets(entry = REACT_ENTRY, from = root) {
  const atFrom = (rel) => path.join(from, rel);
  const sheets = [];
  const seen = new Set();
  const visit = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    if (rel.endsWith('.css')) { sheets.push(rel); return; }
    const dir = path.posix.dirname(rel);
    const text = decomment(readFileSync(atFrom(rel), 'utf8'));
    // The specifier list may cross lines — react/src writes `import {\n … \n} from './x'`
    // — but never a statement, so the gap is anything but a quote or a semicolon. With
    // `\n` excluded here instead, a module behind a multi-line import left the walk, and
    // with it every sheet that module reaches: tsup re-emitted input.css for real while
    // all three claims below reported green over a bundle they had not read.
    const refs = [...text.matchAll(
      /(?:^|\n)\s*(?:import|export)\s+(?:[^'";]*?from\s*)?["']([^'"]+)["']/g,
    )].map((m) => m[1]);
    for (const ref of refs) {
      if (!ref.startsWith('.')) continue;
      const target = path.posix.normalize(path.posix.join(dir, ref));
      for (const c of [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`]) {
        if (existsSync(atFrom(c)) && statSync(atFrom(c)).isFile()) { visit(c); break; }
      }
    }
  };
  visit(entry);
  return sheets;
}

export const BUNDLE = bundleSheets();
export const KIT = new Set(STYLE_FILES);
/** The kit's own sheets, shipped a second time inside the React bundle. */
export const REEMITTED = BUNDLE.filter((rel) => KIT.has(rel));

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
export function rankableRules(sheets) {
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

/** The selectors those rules reach with, each kept with the sheet that wrote it. */
const reachOf = (rules) => rules.flatMap(({ sheet, selector }) => selectorParts(selector)
  // A pseudo-element draws no box of its own in JSDOM; its rule's subject is the
  // element it hangs off, which is what the comparison can read.
  .map((p) => p.replace(/::[\w-]+(\([^)]*\))?/g, '').trim())
  .filter(Boolean)
  .map((sel) => ({ sheet, sel })));

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
export const selectorsOf = (css) => [...decomment(css).matchAll(RULE)]
  .map(([, sel]) => normalise(sel)).filter((sel) => !sel.startsWith('@'));

/** One sheet list, resolved into the dialect JSDOM can rank. */
export const document_ = (sheets, vars) =>
  expandAnchors(desugar(substitute(decomment(sheets.map(read).join('\n')), vars)));

export function window_(css, theme) {
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  return new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head>`
    + '<body></body></html>',
    { pretendToBeVisual: true, virtualConsole: quiet },
  ).window;
}

/** Storybook's HTML renderer hands back a string or a node. Accept those two. */
export function serialize(out) {
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
 * `bundle` is a parameter so the mutation can put a kit sheet back where tsup used to
 * emit it and watch this come back non-empty. Both documents come out of one pipeline
 * and differ in exactly one thing: whether the re-emitted copies are in the second half.
 */
export async function sweepTheme(bundle, theme, given) {
  const reemitted = new Set(bundle.filter((rel) => KIT.has(rel)));
  const rules = rankableRules([...reemitted]);
  const watched = [...watchedProperties(rules)];
  const reach = reachOf(rules);
  const findings = [];
  const problems = [];
  const stories = [];
  const reached = new Map(rules.map(({ sheet }) => [sheet, 0]));
  let compared = 0;
  const vars = tokensFor(theme);
  const asShipped = window_(document_([...STYLE_FILES, ...bundle], vars), theme);
  const withoutCopies = window_(
    document_([...STYLE_FILES, ...bundle.filter((rel) => !reemitted.has(rel))], vars), theme,
  );
  installDomGlobals(asShipped);

  // `given` is a list of `{ where, html }` a caller rendered itself, such as the React
  // stories; without it the vanilla stories are rendered here.
  const subjects = [];
  if (given) subjects.push(...given);
  else {
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
        subjects.push({ where: `${rel}:${name}`, html: raw });
      }
    }
  }
  for (const { where, html: raw } of subjects) {
    // A story's own markup speaks var() in style= attributes, and JSDOM resolves
    // none. Both documents get the identical substituted string.
    const html = desugar(substitute(raw, vars));
    stories.push(where);
    asShipped.document.body.innerHTML = html;
    withoutCopies.document.body.innerHTML = html;

    const shipped = [...asShipped.document.body.querySelectorAll('*')];
    const clean = [...withoutCopies.document.body.querySelectorAll('*')];
    assert.equal(shipped.length, clean.length,
      `${where} mounted a different tree into the two documents — the comparison `
      + 'pairs elements by position and this pair cannot be made');

    for (let i = 0; i < shipped.length; i++) {
      const el = shipped[i];
      if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') continue;
      const hits = reach.filter(({ sel }) => {
        try { return el.matches(sel); } catch { return false; }
      });
      if (!hits.length) continue;
      for (const { sheet } of hits) reached.set(sheet, reached.get(sheet) + 1);
      compared += 1;
      const a = asShipped.getComputedStyle(el);
      const b = withoutCopies.getComputedStyle(clean[i]);
      for (const prop of watched) {
        const got = a.getPropertyValue(prop);
        const want = b.getPropertyValue(prop);
        if (got === want) continue;
        findings.push(
          `${selectorPath(el)}  ${prop}: ${want || '(unset)'} → ${got || '(unset)'}`
          + `  [${theme}, ${where}]`,
        );
      }
    }
  }
  return { findings, problems, stories, compared, reached: [...reached] };
}

/** The themes' sweeps, run on threads and added up in theme order. */
export async function sweep(bundle, given) {
  const reemitted = new Set(bundle.filter((rel) => KIT.has(rel)));
  const rules = rankableRules([...reemitted]);
  const watched = [...watchedProperties(rules)];
  const reach = reachOf(rules);
  const findings = [];
  const problems = [];
  const stories = new Set();
  const stats = {
    reemitted: [...reemitted], rankable: rules.length, watched, reach, compared: 0,
    // Which re-emitted sheets this walk actually exercised. A sheet whose selectors
    // match nothing in the catalogue was accepted without being measured, and the
    // coverage claim refuses that rather than counting it as a clean reading.
    reached: new Map(rules.map(({ sheet }) => [sheet, 0])),
  };
  // Nothing a cascade ranks, so nothing to mount: every element would come back
  // identical because the two documents differ only in rules JSDOM never applies.
  if (!rules.length) return { findings, problems, stories, stats };
  const parts = await runJobs(import.meta.url, THEMES.map((theme) => ({ fn: 'sweepTheme', args: [bundle, theme, given] })));
  for (const part of parts) {
    findings.push(...part.findings);
    problems.push(...part.problems);
    for (const s of part.stories) stories.add(s);
    stats.compared += part.compared;
    for (const [sheet, n] of part.reached) stats.reached.set(sheet, stats.reached.get(sheet) + n);
  }
  return { findings, problems, stories, stats };
}
