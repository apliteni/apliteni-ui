// The subjects of story-css.test.ts: the stories, the sheets only a story imports, and the
// showcase sheets and modules. They stand apart from the gate, which is at its line cap in
// .smells.json.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

/* ---- the subjects ------------------------------------------------------- */

/** Every file under a directory, repo-relative, however deep it sits. */
function filesUnder(rel: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const next = `${rel}/${entry.name}`;
    if (entry.isDirectory()) filesUnder(next, acc);
    else acc.push(next);
  }
  return acc;
}

// What .storybook/main.js serves from this workspace: `../src/**/*.stories.@(tsx|ts)`.
// Recursive, and two extensions — so this sweep is too. A sweep narrower than the glob gates
// less than Storybook ships, and the gap is silent: the aggregate counts below stay green
// while a story in a new folder paints whatever it likes. The same config also serves
// `../../stories/**`, the foundation and guideline pages moved over in #429 PR 4. Those
// pages are deliberately not subjects, for the reason stories/story-css.test.js gives:
// their own gates measure them.
export const SERVED = /\.stories\.tsx?$/;

export const files = filesUnder('react/src');

/** A module that could own a stylesheet: not a story, not a test. */
export const isModule = (file: string) => /\.tsx?$/.test(file)
  && !SERVED.test(file) && !/\.test\.tsx?$/.test(file);

/** Does `file` import `sheet`? Resolved, so an import from a subfolder counts. */
export const importsSheet = (file: string, sheet: string) => {
  const from = path.dirname(path.join(root, file));
  for (const m of read(file).matchAll(/['"]([^'"]+\.css)['"]/g)) {
    if (path.resolve(from, m[1]) === path.join(root, sheet)) return true;
  }
  return false;
};

/** A sheet nothing but a story (or a test) imports is story CSS. */
export const storyOnlySheet = (sheet: string) => !files.filter(isModule).some((f) => importsSheet(f, sheet));

/** The subjects among a list of paths, so a mutation can hand this one it invented. */
export const subjectsAmong = (paths: string[]) => paths.filter((p) => SERVED.test(p)).sort();

/** A stylesheet in the showcases folder: read for any importer, a module included. */
export const isShowcaseSheet = (file: string) => /^react\/src\/showcases\/(?:.+\/)?[^/]+\.css$/.test(file);

/** A module in the showcases folder: read for its inline styles, as its sheet is. #866 */
export const isShowcaseModule = (file: string) => /^react\/src\/showcases\/(?:.+\/)?[^/]+\.tsx$/.test(file) && isModule(file);

// The showcases under stories/apps/ and the `_name.tsx` modules they build with, which
// the root Storybook serves beside this workspace's stories (#429 moved them from the
// vanilla collection, whose gate read them until then). Foundations and guideline pages
// stay out, for the reason given above.
// The two page frames at the root of stories/ draw those pages, so they stay out with them.
const ROOT_SHOWCASES = filesUnder('stories')
  .filter((f) => !/^stories\/(?:foundations|guidelines)\//.test(f) && !/^stories\/_(?:guideline|page)\.tsx$/.test(f))
  .filter((f) => SERVED.test(f) || /(?:^|\/)_[\w-]+\.tsx$/.test(f));

export const subjects: string[] = [...new Set([
  ...subjectsAmong(files),
  ...ROOT_SHOWCASES,
  ...files.filter(isShowcaseModule),
  ...files.filter((f) => f.endsWith('.css')).filter((f) => isShowcaseSheet(f) || storyOnlySheet(f)),
])].sort();
