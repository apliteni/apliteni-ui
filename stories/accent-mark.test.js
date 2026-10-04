/* The vanilla picker marks the selected swatch with a tick, not with an accent.
 *
 * Every case puts the PAGE on a different accent from the selected swatch, the
 * only arrangement that can tell a mark in the swatch's own colour from one in
 * var(--accent). The ink is held to 3:1 against both stops of the gradient the
 * circle wears and to being no accent at all, because the kit focus ring is this
 * control's one accent edge; stories/accent-focus.test.js holds that edge.
 *
 * The limits of the measurement are in stories/lib/accent-mark.js. See issues
 * #429 and #472.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { accentPicker } from '../src/components/index.js';
import { ACCENTS, accentSwatchStyle } from '../src/logic/accents.js';
import {
  MARK_FLOOR, accentColour, accentPickerCss, markDeclaration, markRule, measureSelectionMark, paints,
} from './lib/accent-mark.js';

/** A page accent that is NOT the one being selected. */
const otherThan = (accent) => ACCENTS[(ACCENTS.indexOf(accent) + 1) % ACCENTS.length];

for (const theme of ['light', 'dark']) {
  test(`vanilla marks the selected swatch in ink that reads on it in ${theme}`, () => {
    const choices = new JSDOM(accentPicker()).window;
    const accents = [...choices.document.querySelectorAll('button')].map((b) => b.dataset.accentPick);
    choices.close();
    assert.deepEqual([...accents].sort(), [...ACCENTS].sort(), 'all shipped choices discovered');

    const measured = [];
    for (const accent of accents) {
      const page = otherThan(accent);
      const notAccents = ACCENTS.map((a) => accentColour(theme, a));
      const css = accentPickerCss(theme, page, accentSwatchStyle(accent));

      // The selector the measurement reads is the one the real markup matches,
      // or the declaration below belongs to a rule that never paints.
      const win = new JSDOM(accentPicker({ active: accent })).window;
      const selected = win.document.querySelectorAll('button.is-active');
      assert.equal(selected.length, 1, 'one swatch is selected');
      assert.ok(
        selected[0].matches(markRule(css).selector.replace('::after', '')),
        'the rule that draws the mark selects the button the picker marks active',
      );
      win.close();

      const { ink, ratios, stops } = measureSelectionMark(css, notAccents);
      // The page accent is a different colour here, so "the mark is no accent"
      // is a real comparison and not one value tested against itself.
      assert.notEqual(paints(accentColour(theme, accent)), paints(accentColour(theme, page)));

      // Each mutation below is the shape of one real regression, and each has to
      // be rejected or the assertion above it is decoration. They rewrite the
      // sheet text, so `rewrite` fails loudly rather than matching nothing and
      // reporting a rejection the gate never made.
      const rewrite = (from, to) => {
        const out = css.replace(from, to);
        assert.notEqual(out.length === css.length && out === css, true, `nothing to rewrite: ${from}`);
        return out;
      };
      const border = `border: ${markDeclaration(css, 'border')}`;
      for (const [why, instead] of [
        ['the selection colour #472 shipped twice', paints(accentColour(theme, accent))],
        ['the page accent the focus ring already paints', paints(accentColour(theme, page))],
      ]) {
        assert.throws(
          () => measureSelectionMark(rewrite(border, `border: solid ${instead}`), notAccents),
          /which is an accent/,
          `a mark in ${why} must fail this gate`,
        );
      }
      // An ink that is no accent and vanishes into the circle anyway. The lighter
      // stop, because the darker one IS this accent's own --accent in dark and
      // would be caught by the assertion above instead of by the floor.
      assert.throws(
        () => measureSelectionMark(rewrite(border, `border: solid ${paints(stops[0])}`), notAccents),
        new RegExp(`under the ${MARK_FLOOR}:1 non-text floor`),
        'a mark the colour of the swatch under it must fail this gate',
      );
      // A mark grown past the rim, where border-radius clips it.
      assert.throws(
        () => measureSelectionMark(rewrite(`height: ${markDeclaration(css, 'height')}`, 'height: 24px'), notAccents),
        /past the/,
        "a mark that reaches the circle's rim must fail this gate",
      );
      // No mark at all: nothing then says which accent is on.
      assert.throws(
        () => measureSelectionMark(rewrite(markRule(css).selector, '.ui-accent-picker__retired'), notAccents),
        /exactly one pseudo-element/,
        'a picker that draws no mark must fail this gate',
      );
      // And a second rule able to cancel the first — how focus used to erase
      // selection, back when both signals lived in one box-shadow list.
      assert.throws(
        () => measureSelectionMark(
          `${css}\n.ui-accent-picker button[data-ui-state~="focus-visible"]::after{content:none}`,
          notAccents,
        ),
        /exactly one pseudo-element/,
        'a second pseudo-element rule on the picker must fail this gate',
      );

      measured.push({ accent, page, ink: paints(ink), ratios });
    }

    assert.equal(measured.length, accents.length, 'every selected choice measured');
    assert.ok(
      measured.every(({ ratios }) => ratios.length === 2),
      'each mark is read against both stops of the gradient its circle wears',
    );
    assert.equal(
      new Set(measured.map(({ ink }) => ink)).size, 1,
      `the four swatches are marked in ${new Set(measured.map((m) => m.ink)).size} inks. One ink `
      + 'reads on all eight stops, so a value per accent is a table to keep in step for nothing',
    );
  });
}
