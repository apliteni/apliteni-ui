// Browser-only check; needs agent-browser and both built Storybooks served at base.
// Measures page overflow, current-link visibility, the band a Tab-reached link draws
// and the band an all-disabled row draws. Not screen-reader speech.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [base, output] = process.argv.slice(2);
assert(base && output, 'Pass the server base URL and output JSON path');
const session = `navigation-scroll-${process.pid}`;
const browser = (...args) => execFileSync('agent-browser', ['--session', session, ...args], { encoding: 'utf8' });
const evaluate = source => JSON.parse(browser('eval', source));

// --ring-gap-width + --ring-width: the solid band, the part that is not the halo.
const RING = 3;

/* The reading a focused link gets: where its band falls against the box that clips
 * it. `clipped` is what round r1 measured at 3.86px and 13.86px with scrollLeft at 0.
 * Returned for every link Tab reaches, so a row is proved link by link. */
const WALK = `(() => {
  const nav = document.querySelector('.ui-nav--tabs');
  const links = [...nav.querySelectorAll('a.ui-nav__tab')];
  const el = document.activeElement;
  if (!links.includes(el)) return { inRow: false };
  const n = nav.getBoundingClientRect(), b = el.getBoundingClientRect();
  const round = (v) => Math.round(v * 1000) / 1000;
  const style = getComputedStyle(el);
  return {
    inRow: true, label: el.textContent.trim(), scrollLeft: round(nav.scrollLeft),
    clipped: round(Math.max(0, b.right + ${RING} - n.right, n.left - (b.left - ${RING}))),
    nativeOutline: style.outlineStyle === 'auto',
    ringShadow: style.boxShadow !== 'none' && style.boxShadow !== '',
  };
})()`;

/* The row's own stop. Every tab disabled, so the row holds no link and Chrome makes
 * IT the stop — answered by the kit's inward band since #429, not by the browser's
 * black outline. Rendered over the story's own row so the sheet under it is real. */
const ALL_DISABLED = `(() => {
  const nav = document.querySelector('.ui-nav--tabs');
  nav.innerHTML = ['Summary', 'Payouts', 'Transactions', 'Disputes', 'Exports']
    .map((label) => '<span class="ui-nav__tab is-disabled" aria-disabled="true">'
      + '<span class="ui-nav__tab-label">' + label + '</span></span>').join('');
  return { stops: nav.querySelectorAll('a[href],[tabindex]').length };
})()`;

const READ_ROW = `(() => {
  const nav = document.querySelector('.ui-nav--tabs');
  const style = getComputedStyle(nav);
  return {
    isStop: document.activeElement === nav, focusVisible: nav.matches(':focus-visible'),
    outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth,
    outlineColor: style.outlineColor, outlineOffset: style.outlineOffset,
    nativeOutline: style.outlineStyle === 'auto',
    overflows: nav.scrollWidth > nav.clientWidth,
  };
})()`;

const results = [];
const walks = [];
const rows = [];
try {
  for (const [workspace, prefix] of [['vanilla', 'storybook-static'], ['react', 'react/storybook-static']]) {
    const index = await (await fetch(`${base}/${prefix}/index.json`)).json();
    const subjects = Object.values(index.entries).filter(entry => entry.type === 'story' &&
      (workspace === 'react' ? entry.title === 'React/NavTabs' :
        entry.title === 'Components/Navigation' && /^Tabs(?:Pill)?$/.test(entry.exportName)));
    assert.equal(subjects.length, 2, `${workspace}: discover underline and pill stories`);
    for (const subject of subjects) for (const theme of ['light', 'dark']) {
      const open = (args = '') => {
        browser('set', 'viewport', '390', '600');
        browser('open', `${base}/${prefix}/iframe.html?id=${subject.id}&viewMode=story&globals=theme:${theme}${args}`);
        browser('wait', '--fn', '!!document.querySelector(".ui-nav--tabs")');
        evaluate('document.fonts.ready.then(() => true)');
      };
      open('&args=active:disputes');
      if (workspace === 'vanilla') evaluate(`(async () => {
        const nav = document.querySelector('.ui-nav--tabs');
        nav.querySelector('[aria-current]')?.removeAttribute('aria-current');
        nav.querySelectorAll('a')[3].setAttribute('aria-current', 'page');
        const { wireNav } = await import('/src/components/nav.js');
        wireNav();
        return true;
      })()`);
      browser('wait', '--fn', `(() => {
        const nav = document.querySelector('.ui-nav--tabs'), current = nav.querySelector('[aria-current="page"]');
        const n = nav.getBoundingClientRect(), c = current.getBoundingClientRect();
        return c.left >= n.left + 3 && c.right <= n.right - 3;
      })()`);
      const measured = evaluate(`(() => {
        const nav = document.querySelector('.ui-nav--tabs');
        const pageFits = () => document.documentElement.scrollWidth <= innerWidth;
        const fits = pageFits();
        const styles = getComputedStyle(nav);
        const focusClearance = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
          .every(side => parseFloat(styles[side]) >= ${RING});
        const current = nav.querySelector('[aria-current="page"]').textContent;
        nav.style.overflow = 'visible';
        nav.scrollLeft = 0;
        const mutationRejected = !pageFits();
        nav.style.removeProperty('overflow');
        return { fits, mutationRejected, focusClearance, current, viewport: innerWidth };
      })()`);
      assert(measured.fits, `${subject.id} ${theme}: page overflows at 390px`);
      assert(measured.focusClearance, `${subject.id}: scroll viewport clips the solid focus ring`);
      assert(measured.mutationRejected, `${subject.id} ${theme}: overflow mutation was not rejected`);
      results.push({ workspace, story: subject.id, theme, ...measured });

      /* -- Tab traversal: the half the current-route reveal cannot answer ------
       * Round r1 reached Transactions with Tab and found 3.86px / 13.86px of the
       * solid band cut off, so every link the keyboard reaches is measured here,
       * not only the one the route made current. */
      open();
      let seen = 0;
      for (let press = 0; press < 12 && seen < 3; press += 1) {
        browser('press', 'Tab');
        const step = evaluate(WALK);
        if (!step.inRow) continue;
        seen += 1;
        assert.equal(step.clipped, 0,
          `${subject.id} ${theme}: "${step.label}" draws ${step.clipped}px of its band outside the row`);
        assert(!step.nativeOutline, `${subject.id} ${theme}: "${step.label}" fell back to a native outline`);
        assert(step.ringShadow, `${subject.id} ${theme}: "${step.label}" draws no kit ring`);
        walks.push({ workspace, story: subject.id, theme, ...step });
      }
      assert.equal(seen, 3, `${subject.id} ${theme}: Tab reached ${seen} links in the row, expected 3`);
      // Prove the reading can fail: put the row back where Chrome left it and the
      // band on the last link is clipped again, which is the defect itself.
      const unrevealed = evaluate(`(() => {
        document.querySelector('.ui-nav--tabs').scrollLeft = 0;
        return ${WALK};
      })()`);
      assert(unrevealed.clipped > 0,
        `${subject.id} ${theme}: scrolling the row back to 0 clipped nothing, so the walk proves nothing`);

      /* -- The row's own stop, when every tab is disabled -------------------- */
      open();
      const emptied = evaluate(ALL_DISABLED);
      assert.equal(emptied.stops, 0, `${subject.id} ${theme}: an all-disabled row still holds a stop`);
      browser('press', 'Tab');
      const row = evaluate(READ_ROW);
      assert(row.overflows, `${subject.id} ${theme}: the all-disabled row does not overflow, so it is no stop`);
      assert(row.isStop, `${subject.id} ${theme}: Tab did not reach the all-disabled row`);
      assert(!row.nativeOutline,
        `${subject.id} ${theme}: the all-disabled row fell back to the browser's outline`);
      assert.equal(row.outlineStyle, 'solid',
        `${subject.id} ${theme}: the all-disabled row draws no solid band`);
      assert(parseFloat(row.outlineOffset) < 0,
        `${subject.id} ${theme}: the row's band is not drawn inward, so the scroll box clips it`);
      rows.push({ workspace, story: subject.id, theme, ...row });
    }
  }
  assert.equal(results.length, 8, 'Both workspaces, both variants, both themes measured');
  assert.equal(walks.length, 24, 'Three Tab-reached links measured in each of the 8 rows');
  assert.equal(rows.length, 8, 'Each of the 8 rows measured with every tab disabled');
  writeFileSync(output, JSON.stringify({ results, walks, rows }, null, 2) + '\n');
  console.log('PASS: 8 browser cases at 390px; 8 overflow mutations rejected; current links visible;\n'
    + '      24 Tab-reached links draw a whole kit ring (8 unrevealed rows clip it);\n'
    + '      8 all-disabled rows take the kit band inward, none a native outline.');
} finally {
  browser('close');
}
