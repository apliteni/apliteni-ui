/* Wait for the page to stop moving, instead of guessing how long it takes — a
 * fixed timeout over a running transition is a race the rig loses quietly.
 * What that cost, and why the question is asked of the document:
 * why: scripts/evidence/README.md
 */

/** The kit's own longest step, plus room — a ceiling, not a wait. */
const CEILING = 5000;

/** One painted frame, so a transition a keystroke started is registered before
 *  the question below is asked of it. */
const frame = (page) => page.evaluate(() => new Promise((done) => {
  requestAnimationFrame(() => requestAnimationFrame(done));
}));

export async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await frame(page);
  // An `animation` may loop forever by design — the kit's spinner is one — so
  // only transitions are waited on. A CSSAnimation is not a subject here.
  await page.waitForFunction(
    () => document.getAnimations()
      .filter((a) => a.constructor.name === 'CSSTransition')
      .every((a) => a.playState === 'finished' || a.playState === 'idle'),
    null,
    { timeout: CEILING },
  );
  await frame(page);
}
