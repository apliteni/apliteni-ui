// Browser only: Chromium paints forced system colours that JSDOM cannot measure.
// This fixture covers the shared Dropdown, version row, and table scroll rules in
// both themes. It does not measure every menu or table composition.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cssText } from '../src/inline.js';

const enabled = process.env.FORCED_REGRESSION === '1';
const subjects = ['chevron', 'dropdown', 'version', 'scroll'];
const hasChevron = widths => { assert.notEqual(widths[0], '0px'); assert.notEqual(widths[1], '0px'); };

test('forced colours keep the chevron, hover rows, and table focus band', { skip: !enabled }, async () => {
  const imported = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const playwright = imported.default || imported;
  const browser = await playwright.chromium.launch({ executablePath: process.env.UI_CHROME || undefined, args: ['--no-sandbox'] });
  try {
    let measured = 0;
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ forcedColors: 'active' });
      await page.setContent(`<html data-theme="${theme}"><head><style>${cssText}</style></head><body>
        <div class="ui-dropdown open"><button class="ui-dropdown__trigger">Choose <span class="ui-dropdown__chevron"></span></button>
        <div class="ui-dropdown__panel" style="position:static;visibility:visible;opacity:1"><button class="ui-dropdown__item">Choice</button></div></div>
        <button class="vopt">Version</button>
        <div class="ui-table-scroll" tabindex="0"><table class="ui-table"><thead><tr><th>Invoice</th></tr></thead><tbody><tr><td>1162</td></tr></tbody></table></div>
      </body></html>`);
      const system = await page.evaluate(() => {
        const probe = document.createElement('span');
        probe.style.color = 'Canvas';
        document.body.append(probe);
        const canvas = getComputedStyle(probe).color;
        probe.style.color = 'Highlight';
        const highlight = getComputedStyle(probe).color;
        probe.style.color = 'ButtonText';
        const buttonText = getComputedStyle(probe).color;
        probe.remove();
        return { canvas, highlight, buttonText };
      });
      const chevron = await page.locator('.ui-dropdown__chevron').evaluate(el => {
        const css = getComputedStyle(el);
        return [css.borderRightColor, css.borderBottomColor, css.borderRightWidth, css.borderBottomWidth];
      });
      hasChevron(chevron.slice(2));
      assert.equal(chevron[0], system.buttonText);
      assert.equal(chevron[1], system.buttonText);
      measured++;
      for (const selector of ['.ui-dropdown__item', '.vopt']) {
        await page.locator(selector).hover();
        const border = await page.locator(selector).evaluate(el => {
          const css = getComputedStyle(el);
          return { color: css.borderTopColor, width: css.borderTopWidth };
        });
        assert.equal(border.color, system.highlight, `${theme} ${selector} hover border`);
        assert.equal(border.width, '1px');
        measured++;
      }
      const scroll = page.locator('.ui-table-scroll');
      assert.equal(await scroll.evaluate(el => getComputedStyle(el).borderLeftColor), system.canvas);
      await scroll.focus();
      const focus = await scroll.evaluate(el => ({ visible: el.matches(':focus-visible'), outline: getComputedStyle(el).outlineStyle, ink: getComputedStyle(el).outlineColor }));
      assert.ok(focus.visible, `${theme} scroller takes keyboard focus`);
      assert.equal(focus.outline, 'solid');
      assert.notEqual(focus.ink, system.canvas, `${theme} focus band differs from its reserved border`);
      measured++;
      await page.addStyleTag({ content: '@media (forced-colors: active) { .ui-dropdown__chevron { border: 0 !important; } }' });
      const removed = await page.locator('.ui-dropdown__chevron').evaluate(el => {
        const css = getComputedStyle(el);
        return [css.borderRightWidth, css.borderBottomWidth];
      });
      assert.throws(() => hasChevron(removed), 'a missing chevron fallback fails the browser check');
      await page.close();
    }
    assert.equal(measured, subjects.length * 2, 'every subject was measured in both themes');
  } finally { await browser.close(); }
});
