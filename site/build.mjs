// Build the static landing site: emit the kit stylesheet from the package's own
// inline export, and copy the landing HTML into public/. Storybook static is
// copied in by the Dockerfile (or `npm run build-storybook` locally).
import { cssText } from '../src/inline.js';
import { changelogMain } from './changelog.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const pub = new URL('public/', here);
mkdirSync(new URL('assets/', pub), { recursive: true });
mkdirSync(new URL('changelog/', pub), { recursive: true });

const version = JSON.parse(readFileSync(new URL('../package.json', here), 'utf8')).version;
const ver = (s) => s.replaceAll('{{VERSION}}', `v${version}`);

const html = ver(readFileSync(new URL('index.html', here), 'utf8'));
const changelog = ver(readFileSync(new URL('changelog.html', here), 'utf8')).replace('{{MAIN}}', changelogMain());

writeFileSync(new URL('assets/kit.css', pub), cssText);
writeFileSync(new URL('index.html', pub), html);
writeFileSync(new URL('changelog/index.html', pub), changelog);

console.log(`site: wrote index.html + changelog/ + kit.css (v${version})`);
