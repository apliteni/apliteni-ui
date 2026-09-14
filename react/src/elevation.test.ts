// The elevation rule, for the React workspace.
//
// why: docs/specification.md#elevation
// why: CONTRIBUTING.md#one-gate-per-workspace-over-one-shared-implementation
// why: CONTRIBUTING.md#the-elevation-gate-and-its-counts
//
// Same rule as stories/elevation.test.js, over the same reader and the same
// resolver (scripts/lib/box-shadow.js), and its ledger applies here unchanged.
// The walk and the cascade are this workspace's own: `import.meta.glob` is
// evaluated for its keys only, and these sheets' declarations are layered onto
// the kit's before the winners are picked — without that a custom property
// declared here was invisible, and a cast parked behind one read as all zeros.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { boxShadowsIn, layersOf, isCast, customPropertiesIn, resolutionsOf } from '../../scripts/lib/box-shadow.js';
// @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
import { declarationsFor, winnersOf, substitute } from '../../stories/lib/contrast.js';

const SHEETS = Object.keys(import.meta.glob('./**/*.css')).sort();
const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const THEMES = ['dark', 'light'] as const;

type Sheet = { name: string; css: string };
const onDisk = (): Sheet[] => SHEETS.map((name) => ({ name, css: read(name) }));
const where = (name: string) => `react/src${name.slice(1)}`;

/** The kit's cascade with this workspace's declarations layered onto it, so a
 *  name declared here is a value the resolver will try. */
const cascadeFor = (theme: string, sheets: Sheet[]) => {
  // declarationsFor() memoises and hands back the map it keeps; copy it.
  const decls = new Map<string, { file: string; selector: string; root: boolean; value: string }[]>();
  for (const [name, entries] of declarationsFor(theme)) decls.set(name, [...entries]);
  for (const { name, css } of sheets) {
    for (const d of customPropertiesIn(css)) {
      if (d.selector.startsWith('@')) continue;
      if (!decls.has(d.name)) decls.set(d.name, []);
      decls.get(d.name)!.push({ file: where(name), selector: d.selector, root: false, value: d.value });
    }
  }
  return { vars: winnersOf(decls), decls, substitute };
};

/** Every layer these sheets declare that resolves to a cast, and how many carry
 *  the floating drops. */
function walk(sheets: Sheet[], theme: string) {
  const cascade = cascadeFor(theme, sheets);
  const offences: string[] = [];
  let floating = 0;
  for (const { name, css } of sheets) {
    for (const d of boxShadowsIn(css)) {
      for (const raw of layersOf(d.value)) {
        if (raw === 'var(--elev-drop)') { floating += 1; continue; }
        if (!resolutionsOf(raw, cascade).some((v: string) => layersOf(v).some(isCast))) continue;
        offences.push(`${where(name)}:${d.line} (${theme})  ${d.selector} { … ${raw} … }`);
      }
    }
  }
  return { offences, floating };
}

describe('elevation', () => {
  it('sweeps every stylesheet this workspace ships', () => {
    expect(SHEETS).toEqual(['./DataTable.css', './Modal.css']);
  });

  it('casts nothing but the floating treatment', () => {
    const sheets = onDisk();
    const offences: string[] = [];
    let floating = 0;
    for (const theme of THEMES) {
      const got = walk(sheets, theme);
      offences.push(...got.offences);
      floating += got.floating;
    }
    expect(offences).toEqual([]);
    // Both themes are walked, so the modal's one declaration is counted twice.
    expect(floating).toBe(2);
  });

  /* Round 1's finding 4, on this side: a genuine drop parked in a custom property
   * this workspace declares, read by a declaration that looks like the treatment.
   * The gate passed this before the cascade above reached `react/src/*.css` —
   * `--rx-lift` resolved to nothing and the layer read as all zeros. The pair is
   * the proof: the plant is refused, and the same sheet without it is clean. */
  it('#314 sees a cast parked in a custom property this workspace declares', () => {
    const line = 'inset 0 0 0 1px var(--elev-edge, var(--border)), var(--elev-drop)';
    const planted = `.rx-modal {\n  --rx-lift: 0 12px 24px rgba(0,0,0,0.6);\n  box-shadow: var(--rx-lift), ${line};\n}\n`;
    const clean = `.rx-modal {\n  box-shadow: ${line};\n}\n`;

    const sheet = './Planted.css';
    const caught = walk([{ name: sheet, css: planted }], 'dark');
    // Line 3 is the box-shadow's own, not the line --rx-lift ends on.
    expect(caught.offences).toEqual([
      `${where(sheet)}:3 (dark)  .rx-modal { … var(--rx-lift) … }`,
    ]);
    expect(walk([{ name: sheet, css: clean }], 'dark').offences).toEqual([]);
  });
});
