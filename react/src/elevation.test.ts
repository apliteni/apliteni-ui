// The elevation rule, for the React workspace.
//
// why: docs/specification.md#elevation
// why: CONTRIBUTING.md#one-gate-per-workspace-over-one-shared-implementation
//
// Same rule as stories/elevation.test.js, over the same reader
// (scripts/lib/box-shadow.js): nothing below the floating step casts a shadow, and
// the floating step casts exactly one — `--elev-floating`. The walk is this
// workspace's own, because discovery is Vite's here: `import.meta.glob` is
// evaluated for its KEYS only, so a component stylesheet added tomorrow is in the
// gate the moment it exists, and the count below is asserted so it cannot fall out
// unnoticed.
//
// Read off disk, not through Vitest's `css` option: the sheets are read as text
// and the theme's tokens substituted into them, exactly as contrast.test.tsx does,
// because every colour in this workspace is a var() onto a vanilla-kit token.
//
// The vanilla gate's ledger applies here unchanged.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { boxShadowsIn, layersOf, isCast } from '../../scripts/lib/box-shadow.js';
// @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
import { tokensFor, substitute } from '../../stories/lib/contrast.js';

const SHEETS = Object.keys(import.meta.glob('./**/*.css')).sort();
const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const THEMES = ['dark', 'light'] as const;

describe('elevation', () => {
  it('sweeps every stylesheet this workspace ships', () => {
    expect(SHEETS).toEqual(['./DataTable.css', './Modal.css']);
  });

  it('casts nothing but the floating treatment', () => {
    const offences: string[] = [];
    let floating = 0;
    for (const theme of THEMES) {
      const vars = tokensFor(theme);
      for (const sheet of SHEETS) {
        for (const d of boxShadowsIn(read(sheet))) {
          for (const raw of layersOf(d.value)) {
            if (!layersOf(substitute(raw, vars)).some(isCast)) continue;
            if (raw === 'var(--elev-floating)') { floating += 1; continue; }
            offences.push(`react/src${sheet.slice(1)}:${d.line} (${theme})  ${d.selector} { … ${raw} … }`);
          }
        }
      }
    }
    expect(offences).toEqual([]);
    // Both themes are walked, so the modal's one declaration is counted twice.
    expect(floating).toBe(2);
  });
});
