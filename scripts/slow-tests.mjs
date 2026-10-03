/* After every run: the ten slowest tests, the ten slowest files, and anything over budget. The
 * report only reports — a fault in here prints one line and leaves the run's result alone.
 *
 * Two adapters over one report: the default export is a `node --test` reporter for the kit's
 * suite, and SlowTests is a vitest reporter for the React suite.
 *
 * why: AGENTS.md#verification
 */
import path from 'node:path';

const TEST_BUDGET_MS = 5_000;
const FILE_BUDGET_MS = 60_000;
/* stories/tap-zone.test.js is the only file here whose tests drive a real browser, and only when
 * TAP_ZONES=1. why: AGENTS.md#check-the-phone-tap-floor-locally */
const BROWSER_FILE = 'stories/tap-zone.test.js';
const BROWSER_BUDGET_MS = 10_000;
const TOP = 10;

const testBudget = (file) => (file === BROWSER_FILE ? BROWSER_BUDGET_MS : TEST_BUDGET_MS);
const seconds = (ms) => `${(ms / 1000).toFixed(2)}s`;
const slowestFirst = (a, b) => b.duration - a.duration;
const list = (label, entries) =>
  entries.length === 0
    ? `  ${label}: none\n`
    : `  ${label}\n${entries.map((e) => `    ${seconds(e.duration).padStart(8)}  ${e.name}`).join('\n')}\n`;

/* A report that can fail a run is worse than no report, so both adapters format through here. */
const report = (tests, files) => {
  try {
    tests.sort(slowestFirst);
    files.sort(slowestFirst);
    const over = [...tests, ...files].filter((e) => e.duration > e.budget).sort(slowestFirst);
    return (
      `\nslow tests — ${tests.length} tests in ${files.length} files; budget ${seconds(TEST_BUDGET_MS)} a test, ` +
      `${seconds(BROWSER_BUDGET_MS)} a browser test, ${seconds(FILE_BUDGET_MS)} a file\n` +
      list(`the slowest ${Math.min(TOP, tests.length)} tests`, tests.slice(0, TOP)) +
      list(`the slowest ${Math.min(TOP, files.length)} files`, files.slice(0, TOP)) +
      list('over budget', over) +
      'This report never fails the run.\n'
    );
  } catch (error) {
    return `\nslow tests: no report this run (${error}); the run itself is unaffected.\n`;
  }
};

/* `node --test` wraps each file in a test of its own, named by the file's path; that event carries
 * the file's time, and every other event is a test inside it. A nested test is listed under its
 * own name, without its parents. */
export default async function* slowTests(source) {
  const tests = [];
  const files = [];
  /* A fault is kept and told at the end. Leaving this loop early aborts Node's event stream, and
   * an aborted stream is a failed run. */
  let fault;
  for await (const event of source) {
    try {
      const { name, file, details } = event.data ?? {};
      const duration = details?.duration_ms;
      if (typeof duration !== 'number' || !file) continue;
      const relative = path.relative(process.cwd(), file);
      if (name === relative) {
        if (event.type === 'test:complete') files.push({ name: relative, duration, budget: FILE_BUDGET_MS });
      } else if (details.type !== 'suite' && (event.type === 'test:pass' || event.type === 'test:fail')) {
        /* A describe block reports its children's time as its own, so it is not a test here. */
        tests.push({ name: `${relative} > ${name}`, duration, budget: testBudget(relative) });
      }
    } catch (error) {
      fault ??= error;
    }
  }
  yield fault
    ? `\nslow tests: no report this run (${fault}); the run itself is unaffected.\n`
    : report(tests, files);
}

export class SlowTests {
  onTestRunEnd(testModules) {
    const tests = [];
    const files = [];
    try {
      this.collect(testModules, tests, files);
    } catch (error) {
      process.stdout.write(`\nslow tests: no report this run (${error}); the run itself is unaffected.\n`);
      return;
    }
    process.stdout.write(report(tests, files));
  }

  collect(testModules, tests, files) {
    for (const module of testModules) {
      /* A file's figure is the time its tests and hooks took, which is what the file budget is
       * against; transform and environment time are in vitest's own Duration line. */
      files.push({ name: module.relativeModuleId, duration: module.diagnostic().duration, budget: FILE_BUDGET_MS });
      for (const test of module.children.allTests()) {
        const duration = test.diagnostic()?.duration; // a skipped test has none
        if (typeof duration === 'number') {
          tests.push({
            name: `${module.relativeModuleId} > ${test.fullName}`,
            duration,
            budget: testBudget(module.relativeModuleId),
          });
        }
      }
    }
  }
}
