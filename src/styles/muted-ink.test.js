/* Every muted/dim colour path needs a local, closed-class exception note.
 * This is a declaration gate, not an automatic judgement about what words mean.
 * It checks every colour sink, including containers whose ink a child inherits.
 *
 * Limits: annotations need semantic review; an arbitrary caller can put words
 * in an icon slot. Inline JS/JSX/HTML styles, literal colours, opacity, consumer
 * overrides and story examples are outside this CSS gate. Alias tracing is
 * conservative across scopes/themes: any possible muted path requires a note.
 *
 * why: docs/specification.md#text-ink
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const files = ['src', 'react/src'].flatMap(dir => readdirSync(new URL(dir, root), { recursive: true })
  .filter(file => file.endsWith('.css')).map(file => `${dir}/${file}`));
const sheets = files.map(file => ({ file, css: readFileSync(new URL(file, root), 'utf8') }));
const classes = new Set(['glyph', 'state', 'placeholder']);
const blank = text => text.replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '));
const refs = value => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]);

function inspect(sources) {
  const declarations = [];
  for (const { file, css } of sources) {
    const clean = blank(css);
    for (const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const bodyStart = rule.index + rule[1].length + 1;
      for (const d of rule[2].matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;}]*)/g)) {
        const start = bodyStart + d.index;
        const raw = css.slice(start, start + d[0].length);
        const note = /\/\*\s*muted-ink:\s*(\w+)\s*—\s*([^*]+?)\s*\*\//.exec(raw);
        declarations.push({ file, selector: rule[1].trim(), property: d[1], value: d[2], note, noteStart: note ? start + note.index : null,
          line: clean.slice(0, start).split('\n').length });
      }
    }
  }
  const tainted = new Set(['--muted', '--dim']);
  let changed;
  do {
    changed = false;
    for (const d of declarations) {
      if (d.property.startsWith('--') && !tainted.has(d.property) && refs(d.value).some(r => tainted.has(r))) {
        tainted.add(d.property); changed = true;
      }
    }
  } while (changed);
  const subjects = declarations.filter(d => d.property === 'color' && refs(d.value).some(r => tainted.has(r)));
  const problems = subjects.filter(d => !d.note || !classes.has(d.note[1]) || !d.note[2].trim())
    .map(d => `${d.file}:${d.line} ${d.selector}: ${d.value} needs a muted-ink glyph/state/placeholder note with a reason`);
  return { subjects, problems };
}

const result = inspect(sheets);
test('every shipped muted/dim colour path states its exception', () => {
  assert.deepEqual(result.problems, []);
  // A shrinking subject set must be reviewed, including removal of an exception.
  assert.equal(result.subjects.length, 36);
  assert(result.subjects.some(d => d.file.startsWith('react/src/')), 'React styles were not checked');
  assert(result.subjects.some(d => /--disabled-ink/.test(d.value)), 'token aliases were not followed');
});

test('new selectors, inherited containers, overrides and alias chains cannot hide quiet ink', () => {
  for (const css of [
    '.new { color: var(--muted); }',
    '.parent { color: var(--dim); } .parent span { font-size: 11px; }',
    '.new { color: var(--text); color: var(--muted); }',
    ':root { --a: var(--b); --b: var(--muted); } .new { color: var(--a); }',
    ':root { --a: var(--b); --b: var(--a, var(--dim)); } .new { color: var(--a); }',
    '.new { color: var(--host, var(--muted)); }',
    '@media (max-width: 500px) { .new { color: var(--dim); } }',
    '.new { /* muted-ink: decorative — not a closed class */ color: var(--dim); }',
    '.new { /* muted-ink: glyph — */ color: var(--muted); }',
    '.new { /* muted-ink: glyph — icon */ background: var(--muted); color: var(--muted); }',
  ]) assert(inspect([{ file: 'new.css', css }]).problems.length > 0, css);
});

test('each documented class works locally, and unrelated paint needs no exception', () => {
  for (const kind of classes) assert.deepEqual(inspect([{ file: 'new.css', css:
    `.new { /* muted-ink: ${kind} — a reviewed reason; with punctuation {} */ color: var(--dim); }`,
  }]).problems, []);
  assert.deepEqual(inspect([{ file: 'new.css', css:
    '.new { background: var(--muted); border: 1px solid var(--dim); color: var(--text); }',
  }]).subjects, []);
});

test('removing any real exception note is detected', () => {
  for (const subject of result.subjects) {
    const modified = sheets.map(s => s.file === subject.file
      ? { ...s, css: s.css.slice(0, subject.noteStart) + s.css.slice(subject.noteStart + subject.note[0].length) } : s);
    assert(inspect(modified).problems.length > 0, `${subject.file}: ${subject.selector}`);
  }
});
