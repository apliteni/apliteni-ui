// Build the static landing site: emit the kit stylesheet from the package's own
// inline export, and copy the landing HTML into public/. Storybook static is
// copied in by the Dockerfile (or `npm run build-storybook` locally).
import { cssText } from '../src/inline.js';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const pub = new URL('public/', here);
mkdirSync(new URL('assets/', pub), { recursive: true });

const version = JSON.parse(readFileSync(new URL('../package.json', here), 'utf8')).version;
const html = readFileSync(new URL('index.html', here), 'utf8').replaceAll('{{VERSION}}', `v${version}`);

writeFileSync(new URL('assets/kit.css', pub), cssText);
writeFileSync(new URL('index.html', pub), html);

console.log(`site: wrote public/assets/kit.css + public/index.html (v${version})`);
