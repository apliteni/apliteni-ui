// One-off #322 comparison against a pre-change revision, using Chromium and real stories.
// Usage: UI_PLAYWRIGHT=... UI_CHROME=... node scripts/evidence/font-scale.mjs <base-ref> <out-dir>
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { installDomGlobals, storyFiles } from '../../stories/lib/contrast.js';
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
const [base, out] = process.argv.slice(2);
assert(base && out, 'Pass a base revision and evidence directory');
mkdirSync(out, { recursive: true });
const old = file => execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' });
const read = file => readFileSync(file, 'utf8');
const strip = css => css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = css => [...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .flatMap(([, selector, body]) => [...body.matchAll(/(?:^|;)\s*(font-size|font|--[\w-]+-font):\s*([^;]+)/g)]
    .map(([, property, value]) => ({ selector: selector.trim(), property, value })));
const subjects = [];
for (const name of readdirSync('src/styles').filter(n => n.endsWith('.css') && n !== 'field-zoom.css')) {
  const file = `src/styles/${name}`;
  const before = rules(old(file)), after = rules(read(file));
  assert.equal(before.length, after.length, file);
  before.forEach((rule, i) => {
    if (rule.value === after[i].value || !/[\d.]+px\b/.test(rule.value)) return;
    assert.equal(rule.selector, after[i].selector);
    assert.match(after[i].value, /var\(--text-/);
    subjects.push({ file, ...rule, after: after[i].value });
  });
}
assert(subjects.length > 0, 'No changed pixel font declarations found against this baseline');
const imports = [...read('src/index.css').matchAll(/@import "\.\/(.*?)"/g)].map(m => `src/${m[1]}`);
const beforeCss = imports.map(old).join('\n');
const afterCss = imports.map(read).join('\n');
const tokens = [...read('src/tokens/tokens.css').matchAll(/(--text-[\w]+):\s*([\d.]+)px/g)];
const override = `:root { ${tokens.map(([, key, px]) => `${key}: ${Number(px) + 1}px;`).join(' ')} }`;
const browser = await chromium.launch({ executablePath: process.env.UI_CHROME });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>${afterCss}</style><style id="override"></style><div id="probes"></div>`);
  const declarations = await page.evaluate(({ subjects, override }) => {
    const parent = document.querySelector('#probes');
    return subjects.map(subject => {
      const el = document.createElement('span');
      parent.append(el);
      if (subject.property.startsWith('--')) el.style.fontSize = `var(${subject.property})`;
      el.style.setProperty(subject.property, subject.value);
      const before = getComputedStyle(el).fontSize;
      el.style.setProperty(subject.property, subject.after);
      const after = getComputedStyle(el).fontSize;
      document.querySelector('#override').textContent = override;
      const grown = getComputedStyle(el).fontSize;
      document.querySelector('#override').textContent = '';
      el.remove();
      return { ...subject, before, computed: after, grown };
    });
  }, { subjects, override });
  for (const d of declarations) {
    assert.equal(d.computed, d.before, d.selector);
    assert.equal(parseFloat(d.grown), parseFloat(d.before) + 1, d.selector);
  }
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  installDomGlobals(dom.window);
  const rendered = [];
  const covered = new Set();
  const captured = new Set();
  const grownSelectors = new Set();
  for (const rel of storyFiles) {
    const mod = await import(path.resolve('stories', rel));
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const render = story.render || mod.default?.render;
      if (typeof render !== 'function') continue;
      const args = { ...mod.default?.args, ...story.args };
      const result = render(args, { globals: { theme: 'light', accent: 'default' }, args });
      const html = typeof result === 'string' ? result : result?.outerHTML;
      assert.equal(typeof html, 'string', `${rel}:${name} did not render`);
      dom.window.document.body.innerHTML = html;
      const hits = subjects.filter(s => dom.window.document.querySelector(s.selector));
      if (!hits.length) continue;
      hits.forEach(s => covered.add(`${s.file}:${s.selector}`));
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.setContent(`<html data-theme="light"><head><style id="kit">${beforeCss}</style><style id="override"></style></head><body>${html}</body></html>`);
        const sizes = await page.evaluate(() => [...document.body.querySelectorAll('*')].map(e => getComputedStyle(e).fontSize));
        await page.locator('#kit').evaluate((e, css) => e.textContent = css, afterCss);
        const after = await page.evaluate(() => [...document.body.querySelectorAll('*')].map(e => getComputedStyle(e).fontSize));
        assert.deepEqual(after, sizes, `${rel}:${name} at ${width}px`);
        await page.locator('#override').evaluate((e, css) => e.textContent = css, override);
        const growth = await page.evaluate(subjects => subjects.filter(s => {
          const elements = [...document.querySelectorAll(s.selector)];
          const grown = elements.map(e => parseFloat(getComputedStyle(e).fontSize));
          document.querySelector('#override').sheet.disabled = true;
          const defaults = elements.map(e => parseFloat(getComputedStyle(e).fontSize));
          document.querySelector('#override').sheet.disabled = false;
          return grown.some((size, i) => size > defaults[i]);
        }).map(s => `${s.file}:${s.selector}`), subjects);
        growth.forEach(key => grownSelectors.add(key));
        await page.locator('#override').evaluate(e => e.textContent = '');
        rendered.push({ story: `${rel}:${name}`, width, elements: sizes.length });
        if (width === 1280 && !captured.has(rel) && rel.startsWith('components/')) {
          const stem = rel.replaceAll('/', '-').replace('.stories.js', '');
          await page.locator('#kit').evaluate((e, css) => e.textContent = css, beforeCss);
          await page.screenshot({ path: path.join(out, `${stem}-before.png`) });
          await page.locator('#kit').evaluate((e, css) => e.textContent = css, afterCss);
          await page.screenshot({ path: path.join(out, `${stem}-default.png`) });
          await page.locator('#override').evaluate((e, css) => e.textContent = css, override);
          await page.screenshot({ path: path.join(out, `${stem}-larger.png`) });
          captured.add(rel);
        }
      }
    }
  }
  dom.window.close();
  assert(rendered.length > 0, 'No matching stories rendered');
  assert.equal(grownSelectors.size, subjects.length, 'Every replaced selector must grow in real markup');
  const report = { base, override, grownSelectors: grownSelectors.size, declarations, rendered, matchedSelectors: covered.size,
    unmatchedSelectors: subjects.filter(s => !covered.has(`${s.file}:${s.selector}`)),
    limitations: 'Declaration probes measure all changed values; story coverage measures actual cascade at desktop/mobile in light theme. Screenshots use available system font fallbacks. Touch-field safety net stays fixed.' };
  writeFileSync(path.join(out, 'font-scale.json'), JSON.stringify(report, null, 2));
  console.log(`${declarations.length} declarations retain defaults and grow by 1px; ${rendered.length} story/viewport cases retain all computed sizes; ${covered.size} selectors reached by stories.`);
} finally {
  await browser.close();
}
