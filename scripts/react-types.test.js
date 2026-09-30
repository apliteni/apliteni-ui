/* Rule: React Button's published type surface keeps compiling for the consumer
 * patterns in react/src/primitives/Button.types.tsx.
 *
 * why: docs/specification.md#react-button-links-and-leading-artwork
 *
 * Three of them — forwarding the exported `ButtonProps` back in, reading
 * `ComponentProps<typeof Button>`, and `Button.displayName` — compiled on 0.59.0 and
 * broke when Button's `as` cast gained its link overload. Nothing caught it, because
 * nothing in this repository ran tsc: a type-only regression ships green past vitest,
 * tsup and both Storybook builds, straight into the published `.d.ts`. tsc is the
 * assertion here.
 *
 * It lives under scripts/ rather than in the React workspace for the same reason the
 * packaging guard does: it spawns a compiler. Two tsc runs inside vitest's pool starve
 * the jsdom workers past their 5s timeout and take a third of that suite down with
 * them. Node's runner has no per-test timeout, so the cost lands as duration.
 *
 * Discover subjects from source and check the coverage count: the cases come from the
 * `// case:` markers in the fixture, so one joins the gate by being written, and the
 * list below fails when one is deleted instead of quietly shrinking the gate.
 *
 * Limits: this compiles the source declarations under react/tsconfig.types.json, not
 * the emitted index.d.ts, and proves nothing about what any case renders. It needs
 * `npm ci` to have run — without node_modules there is no tsc and no React types.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.join(root, 'react');
const fixture = path.join(workspace, 'src/primitives/Button.types.tsx');
const source = path.join(workspace, 'src/primitives/Button.tsx');
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');

/* The patterns the review measured as broken, and the one that must stay narrow.
 * Only the regressions have to fail under the mutation. */
const REGRESSED = ['spread-exported-props', 'component-props-without-href', 'display-name'];
const CASES = [...REGRESSED, 'narrow-roots-still-narrow'];

/** `// case: <name>` markers, each owning the lines up to the next one. */
const casesOf = (file) => {
  const lines = readFileSync(file, 'utf8').split('\n');
  const found = [];
  lines.forEach((line, i) => {
    const hit = /^\/\/ case: ([\w-]+)$/.exec(line.trim());
    if (hit) found.push({ name: hit[1], from: i + 1 });
  });
  return found.map((c, i) => ({ ...c, to: found[i + 1] ? found[i + 1].from - 1 : lines.length }));
};

/** tsc over `project`, as one `{ line, code }` per diagnostic reported in the fixture. */
const compile = (project) => {
  try {
    execFileSync(process.execPath, [tsc, '-p', project], { encoding: 'utf8', stdio: 'pipe' });
    return { raw: '', errors: [] };
  } catch (failure) {
    const raw = `${failure.stdout ?? ''}${failure.stderr ?? ''}`;
    return {
      raw,
      errors: [...raw.matchAll(/Button\.types\.tsx\((\d+),\d+\): error (TS\d+)/g)]
        .map((m) => ({ line: Number(m[1]), code: m[2] })),
    };
  }
};

/** Which cases a run blamed, by the marker each reported line falls under. */
const blamed = (errors, cases) => [...new Set(errors
  .map((e) => cases.find((c) => e.line >= c.from && e.line <= c.to)?.name ?? `line ${e.line}`))].sort();

test('the gate covers every case the fixture declares, and no fewer', () => {
  assert.deepEqual(casesOf(fixture).map((c) => c.name), CASES);
});

test('the published surface compiles clean', () => {
  const run = compile(path.join(workspace, 'tsconfig.types.json'));
  assert.equal(run.raw, '');
});

test('taking the union overload and displayName back out is caught, case by case', () => {
  const dir = mkdtempSync(path.join(workspace, '.types-gate-'));
  try {
    /* The copy reaches Icon in the real tree, and the fixture's './Button' resolves to
     * the copy beside it, so the mutated declarations are what gets compiled. */
    let mutated = readFileSync(source, 'utf8').replace("from './Icon'", "from '../src/primitives/Icon'");
    for (const line of [
      '  (props: ButtonProps & RefAttributes<ButtonElement>): ReactElement;\n',
      '  displayName?: string;\n',
    ]) {
      const next = mutated.replace(line, '');
      assert.notEqual(next, mutated, `the mutation did not land — the line moved, so move the mutation:\n${line}`);
      mutated = next;
    }
    writeFileSync(path.join(dir, 'Button.tsx'), mutated);
    writeFileSync(path.join(dir, 'Button.types.tsx'), readFileSync(fixture, 'utf8'));
    writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
      extends: '../tsconfig.json',
      compilerOptions: { noEmit: true },
      include: ['Button.types.tsx'],
    }));

    const run = compile(path.join(dir, 'tsconfig.json'));
    assert.doesNotMatch(run.raw, /error TS2307/,
      'the harness could not resolve its own modules, so nothing it reports means anything');
    assert.deepEqual(blamed(run.errors, casesOf(fixture)), [...REGRESSED].sort(), run.raw);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
