/* The walk of a line that resizes two panes, for stories/three-column.test.js and
 * stories/split-layout.test.js. Each action runs only where the line shows, so a page area of
 * 860px or less skips all of them, and waits for the line's aria-valuenow, never for time.
 * LINES reads in the page that each shown line's pane is as wide as the line says.
 *
 * After each drag it reads that the line draws no focus ring. The narrowing action focuses the
 * line, makes the window 800px wide, reads that the focus went to a shown heading or title menu,
 * and gives the window its width back.
 *
 * Its limits: the drag is Playwright's mouse, so a touch drag is not walked. The keys and the
 * drag move one line. A double click is read as the line's first width. The ring is read as the
 * line's computed outline style.
 * why: docs/components.md#three-column-page
 */

// A line that resizes: a separator that names the pane it sizes. A menu's separator names none.
export const LINE = '[role="separator"][aria-controls]';

// Each shown line whose pane is not as wide as its aria-valuenow, with both numbers, and each
// note that an action left: a ring after a drag, or a focus that the narrowing lost.
export const LINES = () => [...document.querySelectorAll('[role="separator"][aria-controls]')]
  .filter((line) => line.checkVisibility())
  .map((line) => {
    const pane = document.getElementById(line.getAttribute('aria-controls'));
    const width = pane.getBoundingClientRect().width;
    const now = Number(line.getAttribute('aria-valuenow'));
    return Math.abs(width - now) > 1 ? `the pane of the line named ${line.getAttribute('aria-labelledby')} is ${width.toFixed(1)}px, the line says ${now}px` : null;
  })
  .filter(Boolean)
  .concat(window.__lineNotes?.splice(0) ?? []);

// Leaves a note when the line draws the focus ring after a pointer drag.
const ringless = (page, line) => line.evaluate((el) => {
  if (getComputedStyle(el).outlineStyle !== 'none') (window.__lineNotes ??= []).push('a pointer drag draws the focus ring');
});

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/** The actions on the line at index n. */
export function resizeActions(n) {
  const line = (page) => page.locator(LINE).nth(n);
  const read = (page) => line(page).evaluate((el) => ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'].map((a) => Number(el.getAttribute(a))));
  const until = (page, value) => page.waitForFunction(([i, v, sel]) => document.querySelectorAll(sel)[i]?.getAttribute('aria-valuenow') === String(v), [n, value, LINE], { timeout: 5000 });
  const shown = async (page) => (await page.locator(LINE).count()) > n && line(page).isVisible();
  // A key from the line's value and limits to the value that it must reach.
  const key = (name, press, to) => [name, async (page) => {
    if (!await shown(page)) return false;
    await line(page).focus();
    const [now, min, max] = await read(page);
    await page.evaluate((v) => { window.__lineStart ??= v; }, now);
    await page.keyboard.press(press);
    await until(page, clamp(to(now, min, max), min, max));
  }];
  const centre = async (page) => { const r = await line(page).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
  return [
    key('key: ArrowRight on a line', 'ArrowRight', (v) => v + 16),
    key('key: Shift with ArrowLeft on a line', 'Shift+ArrowLeft', (v) => v - 48),
    key('key: End on a line', 'End', (v, min, max) => max),
    key('key: Home on a line', 'Home', (v, min) => min),
    ['drag: a line', async (page) => {
      if (!await shown(page)) return false;
      const [now, min, max] = await read(page);
      const [x, y] = await centre(page);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 40, y, { steps: 4 });
      await page.mouse.up();
      await until(page, clamp(now + 40, min, max));
      await ringless(page, line(page));
    }],
    ['drag: Escape in a drag', async (page) => {
      if (!await shown(page)) return false;
      const [now, min, max] = await read(page);
      const [x, y] = await centre(page);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - 40, y, { steps: 4 });
      await until(page, clamp(now - 40, min, max));
      await page.keyboard.press('Escape');
      await until(page, now);
      await page.mouse.up();
      await ringless(page, line(page));
    }],
    ['click: double click on a line', async (page) => {
      if (!await shown(page)) return false;
      await line(page).dblclick();
      await until(page, await page.evaluate(() => window.__lineStart));
    }],
    ['resize: the window narrows to 800px with the focus on a line', async (page) => {
      if (!await shown(page)) return false;
      await line(page).focus();
      const size = page.viewportSize();
      await page.setViewportSize({ width: 800, height: size.height });
      await page.waitForFunction((sel) => ![...document.querySelectorAll(sel)].some((el) => el.checkVisibility()), LINE, { timeout: 5000 });
      // The page moves the focus in an effect after the commit. A page that never moves it is
      // judged when the wait ends.
      await page.waitForFunction(() => document.activeElement !== document.body, null, { timeout: 2000 }).catch(() => {});
      await page.evaluate(() => {
        const el = document.activeElement;
        if (!el?.matches('h2, .ui-columns__menu') || !el.checkVisibility()) (window.__lineNotes ??= []).push(`the focus went to ${el?.tagName.toLowerCase() ?? 'nothing'} when the line went`);
      });
      await page.setViewportSize(size);
      await line(page).waitFor();
    }],
  ];
}
