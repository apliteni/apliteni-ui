// Run from the repository root. Fonts are embedded from the first generated HTML.
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
const dir = new URL('./', import.meta.url);
const previous = await readFile(new URL('../split-layout/index.html', dir), 'utf8').catch(() => '');
const fonts = process.env.SPLIT_FONTS
  ? await readFile(process.env.SPLIT_FONTS, 'utf8')
  : previous.match(/<style id="fonts">([\s\S]*?)<\/style>/)?.[1];
if (!fonts) throw new Error('Set SPLIT_FONTS to a CSS file containing embedded kit fonts.');
const result = await build({ entryPoints: [new URL('prototype.tsx', dir).pathname], bundle: true,
  write: false, outdir: new URL('./build', dir).pathname, alias: { '@apliteni/apliteni-ui/motion': new URL('../../src/motion.js', dir).pathname, '@apliteni/apliteni-ui': new URL('../../src/index.js', dir).pathname }, minify: true, format: 'iife', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' });
const css = result.outputFiles.find(file => file.path.endsWith('.css')).text;
const js = result.outputFiles.find(file => file.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
await writeFile(new URL('index.html', dir), `<!doctype html>
<html lang="en" data-theme="light"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Split layout prototype</title>
<style id="fonts">${fonts}</style><style>${css}</style></head>
<body><div id="root"></div><script>${js}</script></body></html>`);
console.log('Built design/split-layout-2/index.html');
