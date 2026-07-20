// Build the static landing site: emit the kit stylesheet from the package's own
// inline export, and copy the landing HTML into public/. Storybook static is
// copied in by the Dockerfile (or `npm run build-storybook` locally).
import { cssText } from '../src/inline.js';
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const pub = new URL('public/', here);
mkdirSync(new URL('assets/', pub), { recursive: true });

writeFileSync(new URL('assets/kit.css', pub), cssText);
copyFileSync(new URL('index.html', here), new URL('index.html', pub));

console.log('site: wrote public/assets/kit.css + public/index.html');
