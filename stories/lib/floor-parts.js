/* The deal of the Accessibility minimums walks over their test files.
 *
 * One file ran eleven walks and passed the file budget once the suite competed for cores. The
 * walks are now dealt by owner: the target walk to the main file, each theme's ring cells to one
 * ring file, and the disabled cells to one disabled file. Each job has exactly one owner.
 * why: #562
 */
import { CELLS, THEMES } from './accessibility-walks.js';

/** The entry files and the part each one runs. The main file runs the target walk. */
export const FLOOR_ENTRIES = {
  'guidelines/accessibility-floor.test.js': 'target',
  'guidelines/floor-ring-dark.test.js': 'ring dark',
  'guidelines/floor-ring-light.test.js': 'ring light',
  'guidelines/floor-disabled.test.js': 'disabled',
};

/** Every part the walks need: the target walk, a ring part for each theme and the disabled part. */
export const floorParts = () => ['target', ...THEMES.map((t) => `ring ${t}`), 'disabled'];

/** The cells of one ring part, taken from the discovered cells. */
export const ringCellsOf = (theme) => CELLS.filter((c) => c.theme === theme);

const CALL = /\b(targetPart|ringPart|disabledPart)\(\s*(?:'(\w+)'\s*)?\)/g;
const PART_OF = { targetPart: () => 'target', ringPart: (arg) => `ring ${arg}`, disabledPart: () => 'disabled' };
const codeOf = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

/** The part calls a file's code makes, as `[helper, argument]` pairs. A commented-out call is not one. */
export const partCalls = (text) => [...codeOf(text).matchAll(CALL)].map((m) => [m[1], m[2]]);

/**
 * Problems with the entry files. `sources` maps the path of every file found on disk that runs a
 * part to its text, so a wrapper that is not in `entries` is seen and rejected, not ignored.
 */
export function floorProblems(sources, entries = FLOOR_ENTRIES) {
  const problems = [];
  const ran = new Map();
  for (const file of Object.keys(entries)) {
    if (!(file in sources)) problems.push(`part entry point ${file} is missing`);
  }
  for (const [file, text] of Object.entries(sources)) {
    const calls = partCalls(text);
    if (!(file in entries)) {
      problems.push(`${file} runs a part but is not an entry point`);
      continue;
    }
    if (calls.length !== 1) {
      problems.push(`${file} must run one part, and runs ${calls.length}`);
      continue;
    }
    const ranPart = PART_OF[calls[0][0]](calls[0][1]);
    if (ranPart !== entries[file]) problems.push(`${file} runs ${ranPart}, not ${entries[file]}`);
    ran.set(ranPart, [...(ran.get(ranPart) ?? []), file]);
  }
  for (const part of floorParts()) {
    const by = ran.get(part) ?? [];
    if (by.length === 0) problems.push(`no entry point runs ${part}`);
    if (by.length > 1) problems.push(`${part} runs in more than one file: ${by.join(', ')}`);
  }
  return problems;
}

/** Problems with the cells: each theme x accent cell is walked by one ring part, and only one. */
export function cellProblems(cells = CELLS, owners = THEMES) {
  const problems = [];
  const walked = new Map();
  for (const theme of owners) {
    for (const c of cells.filter((x) => x.theme === theme)) {
      const key = `${c.theme}/${c.accent}`;
      walked.set(key, (walked.get(key) ?? 0) + 1);
    }
  }
  const seen = new Set();
  for (const c of cells) {
    const key = `${c.theme}/${c.accent}`;
    if (seen.has(key)) problems.push(`cell ${key} is listed twice`);
    seen.add(key);
    if (!walked.has(key)) problems.push(`cell ${key} has no ring part`);
    else if (walked.get(key) > 1) problems.push(`cell ${key} is walked ${walked.get(key)} times`);
  }
  return problems;
}
