// Zero-dependency static server for ui.apli.tech.
// Serves site/public/* and mounts the built Storybook at /storybook.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const PORT = process.env.PORT || 8080;
const PUBLIC = new URL('./public/', import.meta.url).pathname;
const SB = process.env.STORYBOOK_DIR || new URL('../storybook-static/', import.meta.url).pathname;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json',
};

async function tryFile(root, rel) {
  let p = normalize(join(root, rel));
  if (!p.startsWith(root)) return null; // path traversal guard
  try {
    const s = await stat(p);
    if (s.isDirectory()) p = join(p, 'index.html');
    const body = await readFile(p);
    return { body, type: TYPES[extname(p)] || 'application/octet-stream' };
  } catch { return null; }
}

const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/healthz') { res.writeHead(200).end('ok'); return; }

  let hit;
  if (url === '/storybook' || url.startsWith('/storybook/')) {
    const rel = url.replace(/^\/storybook\/?/, '') || 'index.html';
    hit = await tryFile(SB, rel);
  } else {
    hit = await tryFile(PUBLIC, url === '/' ? 'index.html' : url);
  }

  if (!hit) { res.writeHead(404, { 'content-type': 'text/html' }).end('<h1>404</h1>'); return; }
  res.writeHead(200, { 'content-type': hit.type, 'cache-control': hit.type.includes('html') ? 'no-cache' : 'public, max-age=3600' });
  res.end(hit.body);
});

server.listen(PORT, () => console.log(`ui.apli.tech listening on :${PORT}`));
