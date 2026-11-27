// Browser checks for disposable prototypes. This does not test the React kit.
// Supply UI_PLAYWRIGHT, UI_CHROME and UI_AXE from installed tools.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.UI_PLAYWRIGHT).href);
const browser = await chromium.launch({ executablePath: process.env.UI_CHROME, headless: true });
const root = resolve('design/resizable-columns');
const evidence = resolve(root, 'screenshots');
const capture = process.env.CAPTURE === '1';
const report = { checks: [], screenshots: [], accessibility: [], errors: [] };
const sizes = [[390,844],[844,390],[820,1180],[1280,800],[1920,1080],[360,800],[466,678],[984,1016],[1536,864],[2560,1440],[320,800],[1440,900]];
const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); };
try {
  await mkdir(evidence, { recursive: true });
  for (const variant of ['line','grip','header']) {
    const context = await browser.newContext({ viewport: { width:1280, height:800 }, timezoneId: 'UTC', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    // The viewer is a test fixture. The prototype remains one document with no frames.
    await page.route('http://prototype.test/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const body = path === '/viewer' ? `<!doctype html><html lang="en"><title>Prototype viewer</title><style>html,body{margin:0;height:100%}iframe{display:block;border:0;width:100%;height:100%}</style><iframe title="Resize columns" sandbox="allow-scripts" src="/${variant}.html"></iframe></html>` : await readFile(resolve(root, variant + '.html'));
      await route.fulfill({contentType:'text/html', body});
    });
    await page.goto('http://prototype.test/viewer');
    const frame = page.frames().find(f => f.parentFrame());
    await frame.locator('#folder-list button').first().waitFor();
    await frame.evaluate(() => document.fonts.ready);
    check(`${variant}: opaque sandbox`, await frame.evaluate(() => { try { localStorage.getItem('test'); return false; } catch { return true; } }));
    check(`${variant}: no nested frames`, await frame.locator('iframe').count() === 0);
    await frame.getByRole('tab',{name:'Folders',exact:true}).focus();
    await frame.getByRole('tab',{name:'Folders',exact:true}).press('ArrowRight');
    check(`${variant}: example tabs use arrow keys`, await frame.locator('#review').isVisible());
    await frame.getByRole('tab',{name:'Document review',exact:true}).press('Home');
    const handle = frame.locator('[data-handle="0"]');
    const width = () => frame.locator('#folder-pane').evaluate(e => e.getBoundingClientRect().width);
    const initial = await width();
    await handle.focus(); await handle.press('ArrowRight');
    check(`${variant}: right arrow`, Math.abs(await width() - initial - 16) < 1);
    await handle.press('Shift+ArrowLeft');
    check(`${variant}: shift arrow`, Math.abs(await width() - initial + 32) < 1);
    await handle.press('Home'); check(`${variant}: minimum`, Math.abs(await width() - 200) < 1);
    await handle.press('End'); check(`${variant}: maximum`, Math.abs(await width() - 320) < 1);
    await handle.dblclick(); check(`${variant}: double-click reset`, Math.abs(await width() - initial) < 1);
    let box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width/2, box.y + Math.min(box.height/2, 180)); await page.mouse.down(); await page.mouse.move(box.x + 65, box.y + 120);
    check(`${variant}: pointer drag`, await width() > initial + 30);
    await page.keyboard.press('Escape'); await page.mouse.up();
    check(`${variant}: escape restores width`, Math.abs(await width() - initial) < 1);
    await handle.focus(); await page.setViewportSize({width:390,height:844});
    await frame.waitForFunction(() => document.activeElement.tagName === 'H2');
    check(`${variant}: hidden handle moves focus`, await frame.evaluate(() => document.activeElement.tagName === 'H2'));
    check(`${variant}: phone hides handles`, await frame.locator('[role="separator"]:visible').count() === 0);
    await frame.getByRole('button', {name:'Back to Projects',exact:true}).click();
    await frame.getByRole('button', {name:'Back to folders',exact:true}).click();
    await frame.getByRole('button', {name:'Templates 0',exact:true}).click();
    check(`${variant}: empty folder`, await frame.getByText('No files in Templates.').isVisible());
    await frame.getByRole('button', {name:'Back to folders',exact:true}).click();
    await frame.getByRole('button', {name:'Drafts 1',exact:true}).click();
    check(`${variant}: one file`, await frame.locator('#file-list button').count() === 1);
    await page.setViewportSize({width:1280,height:800});
    await frame.getByRole('button', {name:'Projects 6',exact:true}).click();
    await frame.getByRole('button', {name:'Brief 22 Nov',exact:true}).click();
    await frame.getByRole('button', {name:'Reset widths',exact:true}).click();
    for (const theme of ['light','dark']) {
      if (theme === 'dark') await frame.getByRole('button', {name:'Dark theme',exact:true}).click();
      for (const example of ['folders','review']) {
        await frame.locator(`[data-example="${example}"]`).click();
        for (const [w,h] of sizes) {
          await page.setViewportSize({width:w,height:h});
          await frame.evaluate(() => new Promise(requestAnimationFrame));
          check(`${variant}/${theme}/${example}/${w}: no page overflow`, await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          const interactive = w === 1280 || w === 1920;
          const states = interactive ? ['rest','hover','drag','focus'] : ['rest'];
          for (const state of states) {
            const target = frame.locator(`[data-handle="${example === 'review' ? 2 : 0}"]`);
            if (w > 860) await frame.getByRole('button', {name:'Reset widths',exact:true}).click();
            await page.mouse.move(w-4,h-4);
            await frame.evaluate(() => document.activeElement.blur());
            const rect = interactive ? await target.boundingBox() : null;
            const x = rect ? rect.x + rect.width/2 : 0, y = rect ? rect.y + rect.height/2 : 0;
            if (state === 'hover') await page.mouse.move(x,y);
            if (state === 'drag') { await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+40,y); }
            if (state === 'focus') { await target.focus(); await target.press('ArrowRight'); }
            if (capture) {
              const filename = `${variant}-${example}-${theme}-${w}x${h}-${state}.png`;
              await page.screenshot({path:resolve(evidence,filename)}); report.screenshots.push(filename);
            }
            if (interactive || w === 390) {
              await frame.addScriptTag({path:process.env.UI_AXE});
              const violations = await frame.evaluate(async () => (await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id, nodes:v.nodes.map(n=>n.target)})));
              report.accessibility.push({variant,theme,example,w,state,violations});
              check(`${variant}/${theme}/${example}/${w}/${state}: axe`, violations.length === 0);
            }
            if (state === 'drag') await page.mouse.up();
          }
        }
        if (example === 'review') {
          await page.setViewportSize({width:1280,height:800});
          const split = frame.locator('[data-handle="2"]');
          await split.focus(); await split.press('Home');
          check(`${variant}/${theme}: review minimum`, Math.abs(await frame.locator('#task-pane').evaluate(e=>e.getBoundingClientRect().width)-320)<1);
          await split.press('End');
          check(`${variant}/${theme}: review maximum`, Math.abs(await frame.locator('#task-pane').evaluate(e=>e.getBoundingClientRect().width)-860)<1);
          const beforeZoom = parseInt(await frame.locator('#scale').textContent());
          await frame.getByRole('button',{name:'Zoom in',exact:true}).click();
          check(`${variant}/${theme}: zoom works`, parseInt(await frame.locator('#scale').textContent()) === [50,100,150,200].find(n=>n>beforeZoom));
          await frame.getByRole('button',{name:'Fit',exact:true}).click();
          await frame.getByRole('button',{name:'Mark as checked',exact:true}).click();
          check(`${variant}/${theme}: decision feedback`, await frame.getByText('Marked as checked',{exact:true}).isVisible());
        }
        // Scan the current rendered DOM, without scripts, style sheets or hidden panels.
        if (process.env.DOM_OUTPUT) {
          const dom = await frame.evaluate(() => {
            const clone = document.documentElement.cloneNode(true);
            clone.querySelectorAll('script,style,[hidden],.ui-sr').forEach(e=>e.remove());
            return clone.outerHTML;
          });
          await writeFile(resolve(process.env.DOM_OUTPUT,`${variant}-${example}-${theme}.html`),dom);
        }
      }
    }
    await page.setViewportSize({width:1280,height:800});
    await frame.locator('[data-example="folders"]').click();
    const second = frame.locator('[data-handle="1"]');
    await second.focus(); await second.press('Home');
    check(`${variant}: file minimum`, Math.abs(await frame.locator('#file-pane').evaluate(e=>e.getBoundingClientRect().width)-240)<1);
    await second.press('End');
    check(`${variant}: file maximum`, Math.abs(await frame.locator('#file-pane').evaluate(e=>e.getBoundingClientRect().width)-420)<1);
    await frame.evaluate(() => {
      for (const name of ['--text-xs','--text-sm','--text-base','--text-md','--text-lg','--text-xl','--text-2xl']) {
        const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
        document.documentElement.style.setProperty(name, `${value*2}px`);
      }
    });
    await page.setViewportSize({width:390,height:844});
    check(`${variant}: double text has no page overflow`, await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.emulateMedia({reducedMotion:'no-preference'});
    check(`${variant}: geometry never animates`, await frame.locator('#folder-pane').evaluate(e=>getComputedStyle(e).transitionProperty==='none'));
    await context.close();
    const touchContext = await browser.newContext({viewport:{width:984,height:1016},hasTouch:true,timezoneId:'UTC'});
    const touchPage = await touchContext.newPage();
    await touchPage.route('http://prototype.test/**', async route => route.fulfill({contentType:'text/html',body:await readFile(resolve(root,variant+'.html'))}));
    await touchPage.goto('http://prototype.test/');
    const touchHandle = touchPage.locator('[data-handle="0"]');
    await touchHandle.waitFor();
    const rect = await touchHandle.boundingBox();
    check(`${variant}: coarse target reaches 44px`, rect.width >= 44 && rect.height >= 44);
    const client = await touchContext.newCDPSession(touchPage);
    const x=rect.x+rect.width/2, y=rect.y+rect.height/2;
    const oldWidth=await touchPage.locator('#folder-pane').evaluate(e=>e.clientWidth);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+48,y}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    check(`${variant}: touch drag changes width`, await touchPage.locator('#folder-pane').evaluate(e=>e.clientWidth)>oldWidth);
    await touchPage.setViewportSize({width:390,height:844});
    check(`${variant}: touch phone hides handles`,await touchPage.locator('[role="separator"]:visible').count()===0);
    await touchContext.close();
  }
  check('No browser errors', report.errors.length === 0);
  console.log(`PASS: ${report.checks.length} checks, ${report.accessibility.length} accessibility scans, ${report.screenshots.length} screenshots.`);
} finally {
  await writeFile(resolve(root,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
