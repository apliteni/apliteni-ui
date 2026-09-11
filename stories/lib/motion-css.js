// The stylesheet reading the motion gates share: motion-tokens, motion-coverage and
// reduced-motion ask different questions of the same sheets, so they read them one way.
//
// why: CONTRIBUTING.md#one-gate-per-workspace-over-one-shared-implementation
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const at = (rel) => path.join(root, rel);
export const read = (rel) => readFileSync(at(rel), 'utf8');

/** A CSS time, in milliseconds. `0.25s` and `250ms` are the same number. */
export const ms = (literal) => {
  const m = /^(-?\d*\.?\d+)(m?s)$/.exec(literal.trim());
  return m === null ? null : Number(m[1]) * (m[2] === 's' ? 1000 : 1);
};

/** Blank out comments, keeping newlines so line numbers stay true. */
export const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** Every .css under a tree, at whatever depth it was put, as `{ where, text }`. */
export const sheetsUnder = (dir) => {
  const out = [];
  for (const f of readdirSync(at(dir)).sort()) {
    const rel = `${dir}/${f}`;
    if (statSync(at(rel)).isDirectory()) out.push(...sheetsUnder(rel));
    else if (f.endsWith('.css')) out.push({ where: rel, text: read(rel) });
  }
  return out;
};

/** Both trees that ship CSS: the kit's own, and the React package's. */
export const sheets = () => [...sheetsUnder('src'), ...sheetsUnder('react/src')];

/** `[start, end]` of every `@media (prefers-reduced-motion …) { … }` block. */
export const netBlocks = (src) => {
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

/**
 * Every leaf rule in a sheet, nested ones included, as
 * `{ selector, line, at, decls: [{ prop, value, important, line }] }`.
 *
 * `at` is the chain of at-rule preludes around the rule, outermost first, so a
 * caller can tell a rule inside `@media (prefers-reduced-motion: reduce)` from
 * one outside it. Keyframe steps are not rules and are left out; `keyframes()`
 * reads them. Line numbers are the raw file's, because comments are blanked
 * rather than removed.
 */
export const leafRules = (text) => {
  const src = decomment(text);
  const starts = [0];
  for (let i = 0; i < src.length; i += 1) if (src[i] === '\n') starts.push(i + 1);
  const lineOf = (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };

  const out = [];
  const open = [];
  let from = 0;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') {
      const raw = src.slice(from, i);
      const lead = raw.length - raw.trimStart().length;
      open.push({ prelude: raw.trim(), at: from + lead, body: i + 1, nested: false });
      if (open.length > 1) open[open.length - 2].nested = true;
      from = i + 1;
    } else if (ch === '}') {
      const block = open.pop();
      from = i + 1;
      if (!block || block.nested || block.prelude.startsWith('@')) continue;
      const chain = open.map((b) => b.prelude);
      if (chain.some((p) => p.startsWith('@keyframes'))) continue;
      const decls = [];
      let offset = block.body;
      for (const part of src.slice(block.body, i).split(';')) {
        const colon = part.indexOf(':');
        if (colon > 0) {
          const lead = part.length - part.trimStart().length;
          const value = part.slice(colon + 1).trim();
          decls.push({
            prop: part.slice(0, colon).trim().toLowerCase(),
            value: value.replace(/\s*!important\s*$/i, ''),
            important: /!important\s*$/i.test(value),
            line: lineOf(offset + lead),
          });
        }
        offset += part.length + 1;
      }
      out.push({ selector: block.prelude, line: lineOf(block.at), at: chain, decls });
    } else if (ch === ';' && open.length === 0) {
      from = i + 1;
    }
  }
  return out;
};

/** `name → body` for every `@keyframes` in a sheet, comments blanked. */
export const keyframes = (text) => {
  const src = decomment(text);
  const out = new Map();
  for (const m of src.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') depth -= 1;
      i += 1;
    }
    out.set(m[1], src.slice(m.index + m[0].length, i - 1));
  }
  return out;
};

/** True when a rule sits inside a prefers-reduced-motion block. */
export const inNet = (rule) => rule.at.some((p) => /^@media\b.*prefers-reduced-motion/.test(p));
