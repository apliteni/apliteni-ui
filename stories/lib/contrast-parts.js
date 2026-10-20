// The vanilla contrast gate runs in PARTS test files per theme. This module holds the deal of
// stories to parts, the limits each part owes, and the check that the part entry files exist and
// each run a distinct part. It imports nothing, so the checks can run on made-up input.
export const PARTS = 3;

/** Threads one part deals its stories to. The parts already run side by side, so more threads
 *  here only add cold starts. */
export const PART_THREADS = 2;

/* The story files that carry every failure the ledger accepts, plus the stories the existence
 * checks need (a translucent colour, an unjudgeable background). They all go to part 0, because a
 * finding is grouped across stories and a group split over two parts could not be counted exactly.
 * Any other part that finds a failure fails: add the file here, then change the ledger by hand. */
export const HOME_FILES = [
  'apps/Access.stories.js',
  'components/Snippet.stories.js',
  'foundations/BrandPrimitives.stories.js',
  'foundations/Motion.stories.js',
  'foundations/SignalContrast.stories.js',
];

/* How much of the walk's reads each part is expected to make. The whole walk's limits are split by
 * these shares, so passing every part's share passes the whole: the sum of strict floors is a
 * strict floor and the sum of strict ceilings is a strict ceiling. Integers, measured: the parts made about 20, 91 and 118 thousand style reads, in
 * both themes. A share only has to be near the truth, because the whole walk's limits are far from
 * what it measures. */
export const PART_WEIGHTS = [2, 8, 10];

/** The whole walk's limits. A part owes its share of each; the stories' share is its share of the catalogue. */
export const LIMITS = {
  stories: 150, judged: 2500, queries: 25000, writes: 500, queriesMax: 500000, missMax: 0.30,
};

export const shareOf = (part, weights = PART_WEIGHTS) => weights[part]
  / weights.reduce((n, w) => n + w, 0);

const fileOf = (id) => id.slice(0, id.indexOf(':'));

/** The ids dealt to each part: home files to part 0, the rest round-robin over the others. */
export function dealStories(ids, parts = PARTS, home = HOME_FILES) {
  const dealt = Array.from({ length: parts }, () => []);
  const homed = new Set(home);
  const rest = [];
  for (const id of [...ids].sort()) (homed.has(fileOf(id)) ? dealt[0] : rest).push(id);
  rest.forEach((id, i) => dealt[1 + (i % (parts - 1))].push(id));
  return dealt;
}

/** Problems with a deal: a story in no part or in two, an empty part, a home file with no story. */
export function dealProblems(ids, dealt, home = HOME_FILES) {
  const problems = [];
  const seen = new Map();
  dealt.forEach((part, p) => part.forEach((id) => seen.set(id, [...(seen.get(id) ?? []), p])));
  for (const id of ids) {
    const where = seen.get(id) ?? [];
    if (where.length === 0) problems.push(`${id} is in no part`);
    if (where.length > 1) problems.push(`${id} is in parts ${where.join(', ')}`);
  }
  for (const id of seen.keys()) if (!ids.includes(id)) problems.push(`${id} is dealt but not in the catalogue`);
  dealt.forEach((part, p) => { if (part.length === 0) problems.push(`part ${p} has no story`); });
  const files = new Set(ids.map(fileOf));
  for (const f of home) if (!files.has(f)) problems.push(`home file ${f} renders no story`);
  return problems;
}

const ENTRY = /^contrast-(light|dark)(?:-(\d+))?\.test\.js$/;
const CALL = /\bwalkPart\(\s*'(light|dark)'\s*,\s*(\d+)\s*\)/g;
const entryName = (theme, n) => (n === 1 ? `contrast-${theme}.test.js` : `contrast-${theme}-${n}.test.js`);

/** Problems with the part entry points. `sources` maps the name of every test file on disk to its text. */
export function partProblems(sources, parts = PARTS) {
  const problems = [];
  const ran = new Map();
  for (const theme of ['light', 'dark']) {
    for (let n = 1; n <= parts; n += 1) {
      if (!(entryName(theme, n) in sources)) problems.push(`part entry point ${entryName(theme, n)} is missing`);
    }
  }
  for (const [name, text] of Object.entries(sources)) {
    const m = ENTRY.exec(name);
    const code = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
    if (!m) {
      if ([...code.matchAll(CALL)].length) problems.push(`${name} walks a part but is not an entry point`);
      continue;
    }
    const calls = [...code.matchAll(CALL)];
    if (calls.length !== 1) {
      problems.push(`${name} must call walkPart once, and calls it ${calls.length} times`);
      continue;
    }
    const [, theme, part] = calls[0];
    if (theme !== m[1]) problems.push(`${name} walks the ${theme} theme`);
    const key = `${theme} ${part}`;
    ran.set(key, [...(ran.get(key) ?? []), name]);
  }
  for (const theme of ['light', 'dark']) {
    for (let part = 0; part < parts; part += 1) {
      const by = ran.get(`${theme} ${part}`) ?? [];
      if (by.length === 0) problems.push(`no entry point runs ${theme} part ${part}`);
      if (by.length > 1) problems.push(`${theme} part ${part} runs in more than one file: ${by.join(', ')}`);
    }
  }
  for (const key of ran.keys()) {
    if (Number(key.split(' ')[1]) >= parts) problems.push(`an entry point runs ${key}, but there are ${parts} parts`);
  }
  return problems;
}
