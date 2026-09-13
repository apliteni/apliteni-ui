// A static server over one checkout, so the kit's own factories can be imported
// as modules by the shot page. Root comes in on argv, port on stdout.
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2]);
const shotPage = path.resolve(process.argv[3]);

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__shot') {
    res.writeHead(200, { 'content-type': 'text/html' });
    createReadStream(shotPage).pipe(res);
    return;
  }
  const file = path.join(root, url.pathname);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
  } catch {
    res.writeHead(404).end(`not found: ${url.pathname}`);
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

server.listen(0, '127.0.0.1', () => console.log(server.address().port));
