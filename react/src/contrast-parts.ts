// The React contrast gate runs in CONTRAST_PARTS test files. This module holds the part count and
// the check that those files exist and each run a distinct part. It imports nothing, so the check
// can run on made-up sources.
export const CONTRAST_PARTS = 8;

const ENTRY = /^contrast(?:-(\d+))?\.test\.tsx$/;
const CALL = /\brunWalkSlice\(\s*(\d+)\s*\)/g;

/** Problems with the part entry points. `sources` maps an entry file name to its text. */
export function partProblems(sources: Record<string, string>, parts: number = CONTRAST_PARTS): string[] {
  const problems: string[] = [];
  const ran = new Map<number, string[]>();
  for (let n = 1; n <= parts; n += 1) {
    const name = n === 1 ? 'contrast.test.tsx' : `contrast-${n}.test.tsx`;
    if (!(name in sources)) problems.push(`part entry point ${name} is missing`);
  }
  for (const [name, text] of Object.entries(sources)) {
    const m = ENTRY.exec(name);
    if (!m) continue;
    const calls = [...text.matchAll(CALL)].map((c) => Number(c[1]));
    if (calls.length !== 1) {
      problems.push(`${name} must call runWalkSlice once, and calls it ${calls.length} times`);
      continue;
    }
    ran.set(calls[0], [...(ran.get(calls[0]) ?? []), name]);
  }
  for (let part = 0; part < parts; part += 1) {
    const by = ran.get(part) ?? [];
    if (by.length === 0) problems.push(`no entry point runs part ${part}`);
    if (by.length > 1) problems.push(`part ${part} runs in more than one file: ${by.join(', ')}`);
  }
  for (const part of ran.keys()) {
    if (part >= parts) problems.push(`an entry point runs part ${part}, but there are ${parts} parts`);
  }
  return problems;
}
