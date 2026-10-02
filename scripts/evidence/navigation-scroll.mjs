// Browser-only check; needs agent-browser and both built Storybooks served at base.
// Measures page overflow and current-link visibility, not screen-reader speech.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [base, output] = process.argv.slice(2);
assert(base && output, 'Pass the server base URL and output JSON path');
const session = `navigation-scroll-${process.pid}`;
const browser = (...args) => execFileSync('agent-browser', ['--session', session, ...args], { encoding: 'utf8' });
const evaluate = source => JSON.parse(browser('eval', source));
const results = [];
try {
  for (const [workspace, prefix] of [['vanilla', 'storybook-static'], ['react', 'react/storybook-static']]) {
    const index = await (await fetch(`${base}/${prefix}/index.json`)).json();
    const subjects = Object.values(index.entries).filter(entry => entry.type === 'story' &&
      (workspace === 'react' ? entry.title === 'React/NavTabs' :
        entry.title === 'Components/Navigation' && /^Tabs(?:Pill)?$/.test(entry.exportName)));
    assert.equal(subjects.length, 2, `${workspace}: discover underline and pill stories`);
    for (const subject of subjects) for (const theme of ['light', 'dark']) {
      browser('set', 'viewport', '390', '600');
      browser('open', `${base}/${prefix}/iframe.html?id=${subject.id}&viewMode=story&globals=theme:${theme}&args=active:disputes`);
      browser('wait', '--fn', '!!document.querySelector(".ui-nav--tabs")');
      evaluate('document.fonts.ready.then(() => true)');
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
          .every(side => parseFloat(styles[side]) >= 4);
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
    }
  }
  assert.equal(results.length, 8, 'Both workspaces, both variants, both themes measured');
  writeFileSync(output, JSON.stringify(results, null, 2) + '\n');
  console.log('PASS: 8 browser cases at 390px; 8 overflow mutations rejected; current links visible.');
} finally {
  browser('close');
}
